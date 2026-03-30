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
 */

import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store';
import { parseVmixXML, parseVmixTransitions } from '../utils/vmixParser';

const POLL_MS = 5000;

export function useVmixSync() {
  const {
    setVmixConnected,
    setVmixTally,
    setVmixInputs,
    setVmixTransitions,
  } = useStore();

  const pollRef     = useRef(null);
  const lastXmlRef  = useRef('');   // skip update if XML unchanged
  const [lastSync, setLastSync] = [useRef(null), useRef(null)]; // suppress lint

  const stopPolling = useCallback(() => {
    clearInterval(pollRef.current);
    pollRef.current = null;
  }, []);

  const fetchAndUpdate = useCallback(async () => {
    if (!window.studioAPI) return;
    try {
      const xml = await window.studioAPI.vmix.getState();
      if (!xml || xml === lastXmlRef.current) return;   // nothing changed
      lastXmlRef.current = xml;

      const inputs = parseVmixXML(xml);
      if (inputs.length) setVmixInputs(inputs);
      setVmixTransitions(parseVmixTransitions(xml));
    } catch {
      // swallow polling errors — connection may have dropped
    }
  }, [setVmixInputs, setVmixTransitions]);

  const startPolling = useCallback(() => {
    stopPolling();
    fetchAndUpdate();                                         // immediate fetch
    pollRef.current = setInterval(fetchAndUpdate, POLL_MS);  // then every 5s
  }, [stopPolling, fetchAndUpdate]);

  useEffect(() => {
    if (!window.studioAPI) return;
    const api = window.studioAPI.vmix;

    api.onConnected(() => {
      setVmixConnected(true);
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
