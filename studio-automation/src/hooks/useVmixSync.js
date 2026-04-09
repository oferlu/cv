/**
 * useVmixSync
 *
 * Single source of truth for all vMix IPC event handling + periodic polling.
 * Mount this once at the App level.
 *
 * Responsibilities:
 *  - Registers connected / disconnected / tally listeners
 *  - On connect: immediately fetches state, then polls every POLL_MS
 *  - On disconnect: stops polling
 *  - Each poll: parses XML → updates inputs + transitions in store
 *  - After initial fetch: background-fetches per-item durations for VideoLists
 *    where vMix hasn't reported individual durations yet (uses SelectIndex
 *    round-trip per item, skips any inputs currently on air)
 */

import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store';
import { parseVmixXML, parseVmixTransitions } from '../utils/vmixParser';

const POLL_MS       = 5000;
const DUR_SETTLE_MS = 200; // ms to wait after SelectIndex before reading duration

export function useVmixSync() {
  const {
    setVmixConnected,
    setVmixTally,
    setVmixInputs,
    setVmixTransitions,
  } = useStore();

  const pollRef          = useRef(null);
  const lastXmlRef       = useRef('');
  const durFetchedRef    = useRef(false);
  // Persist discovered durations across XML refreshes:
  //   { itemKey: durationMs }  e.g. { "5_item_2": 92000 }
  const durationCacheRef = useRef({});

  const stopPolling = useCallback(() => {
    clearInterval(pollRef.current);
    pollRef.current = null;
  }, []);

  const fetchAndUpdate = useCallback(async () => {
    if (!window.studioAPI) return;
    try {
      const xml = await window.studioAPI.vmix.getState();
      if (!xml || xml === lastXmlRef.current) return;
      lastXmlRef.current = xml;

      const inputs = parseVmixXML(xml);
      if (!inputs.length) return;

      // Merge any previously-discovered item durations so they survive re-polls
      const cache = durationCacheRef.current;
      const enriched = inputs.map((i) =>
        i.isListItem && i.durationMs === 0 && cache[i.key]
          ? { ...i, durationMs: cache[i.key] }
          : i
      );

      setVmixInputs(enriched);
      setVmixTransitions(parseVmixTransitions(xml));
    } catch {
      // swallow polling errors — connection may have dropped
    }
  }, [setVmixInputs, setVmixTransitions]);

  /**
   * For each VideoList whose items still show durationMs=0, cycle through
   * those items using SelectIndex so vMix reports their real duration, then
   * restore the original selection.
   *
   * Only runs once per connect.  Skips inputs that are live (on tally).
   */
  const fetchListDurations = useCallback(async () => {
    if (!window.studioAPI?.vmix) return;
    const api = window.studioAPI.vmix;

    try {
      const { vmixInputs, vmix: { tally } } = useStore.getState();

      // Parent VideoList inputs (not the expanded items)
      const lists = vmixInputs.filter(
        (i) => (i.type === 'VideoList' || i.type === 'List') && !i.isListItem
      );

      let anyFetched = false;

      for (const list of lists) {
        // Skip inputs currently in Program or Preview
        if ((tally[list.number - 1] ?? 0) > 0) continue;

        const items = vmixInputs.filter(
          (i) => i.isListItem && i.listKey === list.key
        );

        // Only visit items whose duration we don't already know
        const unknownItems = items.filter(
          (i) => !i.durationMs && !durationCacheRef.current[i.key]
        );
        if (unknownItems.length === 0) continue;

        // Record the originally-selected item so we can restore it
        const origIdx = (items.find((i) => i.selected)?.listIndex) ?? 0;

        for (const item of unknownItems) {
          await api.send(`SelectIndex&Value=${item.listIndex + 1}&Input=${list.key}`);
          await new Promise((r) => setTimeout(r, DUR_SETTLE_MS));

          const xml = await api.getState();
          const parsed = parseVmixXML(xml);
          // After SelectIndex the parent input's duration reflects that item
          const parent = parsed.find((p) => p.key === list.key && !p.isListItem);
          if (parent?.durationMs > 0) {
            durationCacheRef.current[item.key] = parent.durationMs;
            anyFetched = true;
          }
        }

        // Restore original item
        await api.send(`SelectIndex&Value=${origIdx + 1}&Input=${list.key}`);
      }

      // Push updated durations into the store immediately
      if (anyFetched) {
        const { vmixInputs: cur } = useStore.getState();
        const cache = durationCacheRef.current;
        setVmixInputs(
          cur.map((i) =>
            i.isListItem && cache[i.key] ? { ...i, durationMs: cache[i.key] } : i
          )
        );
      }
    } catch {
      // non-fatal — durations will just show as LIVE
    }
  }, [setVmixInputs]);

  const startPolling = useCallback(() => {
    stopPolling();
    // Initial fetch; once done, kick off background duration discovery
    fetchAndUpdate().then(() => {
      if (!durFetchedRef.current) {
        durFetchedRef.current = true;
        fetchListDurations();
      }
    });
    pollRef.current = setInterval(fetchAndUpdate, POLL_MS);
  }, [stopPolling, fetchAndUpdate, fetchListDurations]);

  useEffect(() => {
    if (!window.studioAPI) return;
    const api = window.studioAPI.vmix;

    api.onConnected(() => {
      setVmixConnected(true);
      durFetchedRef.current = false; // re-fetch durations on reconnect
      startPolling();
    });

    api.onDisconnected(() => {
      setVmixConnected(false);
      stopPolling();
    });

    api.onTally((t) => setVmixTally(t));

    // If already connected when hook mounts (e.g. hot-reload), start polling
    const { vmix } = useStore.getState();
    if (vmix.connected) startPolling();

    return () => {
      stopPolling();
      ['vmix:connected', 'vmix:disconnected', 'vmix:tally', 'vmix:state']
        .forEach((ch) => api.removeAllListeners(ch));
    };
  }, [setVmixConnected, setVmixTally, startPolling, stopPolling]);

  useEffect(() => () => stopPolling(), [stopPolling]);
}
