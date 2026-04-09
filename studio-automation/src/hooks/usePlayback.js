import { useRef, useEffect, useCallback } from 'react';
import { useStore } from '../store';

const TICK_MS = 100;

/**
 * Find the next asset to play after (trackId, assetIdx).
 * Looks first in the same track, then in subsequent non-empty tracks.
 * Returns { trackId, assetIdx, asset } or null if nothing follows.
 */
function findNextAsset(tracks, trackId, assetIdx) {
  const trackIdx = tracks.findIndex((t) => t.id === trackId);
  if (trackIdx < 0) return null;

  // Next asset in the same track
  const track = tracks[trackIdx];
  if (track.assets[assetIdx + 1]) {
    return { trackId: track.id, assetIdx: assetIdx + 1, asset: track.assets[assetIdx + 1] };
  }

  // First asset of the next non-empty track
  for (let i = trackIdx + 1; i < tracks.length; i++) {
    if (tracks[i].assets.length > 0) {
      return { trackId: tracks[i].id, assetIdx: 0, asset: tracks[i].assets[0] };
    }
  }

  return null;
}

/**
 * Send vMix commands to cue an asset into Preview:
 *  - For list items: SelectIndex first
 *  - For clips:      Restart + Pause (freeze on first frame)
 *  - All assets:     PreviewInput
 */
function sendCueToPreview(asset) {
  if (!window.studioAPI?.vmix || !asset?.vmixKey) return;
  const api = window.studioAPI.vmix;
  if (asset.listIndex !== undefined) {
    api.send(`SelectIndex&Value=${asset.listIndex}&Input=${asset.vmixKey}`);
  }
  if (asset.assetType === 'clip') {
    api.send(`Restart&Input=${asset.vmixKey}`);
    api.send(`Pause&Input=${asset.vmixKey}`);
  }
  api.send(`PreviewInput&Input=${asset.vmixKey}`);
}

export function usePlayback() {
  const timerRef   = useRef(null);
  const elapsedRef = useRef(0);

  const stopTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  // ── startAsset ─────────────────────────────────────────────────────────────
  const startAsset = useCallback((trackId, assetIdx, opts = {}) => {
    stopTimer();
    elapsedRef.current = 0;

    const { tracks, settings, setPlayback, setCuedAsset } = useStore.getState();
    const track = tracks.find((t) => t.id === trackId);
    const asset = track?.assets[assetIdx];
    if (!asset) return;

    // This asset is now playing — clear cued state (will be re-set after previewDelay)
    setCuedAsset(null);

    setPlayback({
      activeTrackId:  trackId,
      activeAssetIdx: assetIdx,
      playing:        true,
      pausedBetween:  false,
      trackDone:      false,
      elapsedMs:      0,
    });

    // ── vMix PGM commands ──────────────────────────────────────────────────
    if (window.studioAPI?.vmix && asset.vmixKey) {
      if (asset.listIndex !== undefined) {
        window.studioAPI.vmix.send(
          `SelectIndex&Value=${asset.listIndex}&Input=${asset.vmixKey}`,
        );
      }
      if (!opts.skipPGM) {
        window.studioAPI.vmix.send(`ActiveInput&Input=${asset.vmixKey}`);
      }
      if (asset.assetType === 'clip') {
        const playDelay = opts.skipPGM ? (asset.transitionDuration || 0) : 0;
        setTimeout(
          () => window.studioAPI.vmix.send(`Play&Input=${asset.vmixKey}`),
          playDelay,
        );
      }
    }

    // ── Schedule Preview cue for the next asset (across tracks) ────────────
    setTimeout(() => {
      const { tracks: t, setCuedAsset: sca } = useStore.getState();
      const next = findNextAsset(t, trackId, assetIdx);
      if (!next) return;
      sendCueToPreview(next.asset);
      sca({ trackId: next.trackId, assetIdx: next.assetIdx });
    }, settings.previewDelay);

    // ── 100ms tick ────────────────────────────────────────────────────────
    timerRef.current = setInterval(() => {
      elapsedRef.current += TICK_MS;

      const { tracks: ct, setPlayback: sp, setCuedAsset: sca } = useStore.getState();
      const currentTrack  = ct.find((t) => t.id === trackId);
      const assetDuration = currentTrack?.assets[assetIdx]?.durationMs ?? 0;

      if (elapsedRef.current >= assetDuration) {
        stopTimer();
        elapsedRef.current = assetDuration;

        const nextInTrack = currentTrack?.assets[assetIdx + 1];
        const isLastInTrack = !nextInTrack;

        if (!isLastInTrack && nextInTrack.transition) {
          // ── Auto-transition to next asset in same track ──────────────────
          const dur = nextInTrack.transitionDuration ?? 500;
          const cmd = nextInTrack.transition === 'Cut'
            ? `Cut&Input=${nextInTrack.vmixKey}`
            : `${nextInTrack.transition}&Input=${nextInTrack.vmixKey}&Duration=${dur}`;

          if (window.studioAPI?.vmix && nextInTrack.vmixKey) {
            window.studioAPI.vmix.send(cmd);
          }

          sp({ elapsedMs: assetDuration, playing: true });
          setTimeout(() => startAsset(trackId, assetIdx + 1, { skipPGM: true }), dur);
        } else {
          // ── Pause and wait for operator Continue ─────────────────────────
          // Determine if there is anything left to play at all (same or other tracks)
          const hasMore = !!findNextAsset(ct, trackId, assetIdx);
          sp({
            elapsedMs:      assetDuration,
            playing:        false,
            pausedBetween:  !isLastInTrack,          // gap within track
            trackDone:      isLastInTrack && hasMore, // end of track, more tracks remain
            elapsedMs:      assetDuration,
          });

          // If this track is done but there are more tracks, keep the cued
          // state pointing at the first asset of the next track (already set
          // by the previewDelay timeout above) — no further action needed.
        }
      } else {
        sp({ elapsedMs: elapsedRef.current });
      }
    }, TICK_MS);
  }, [stopTimer]); // eslint-disable-line

  // ── cueTrack ───────────────────────────────────────────────────────────────
  /**
   * Prepare the first asset of a track for playback:
   *  - Clip:  Restart + Pause (frozen on first frame) → ActiveInput (to PGM)
   *  - Live:  ActiveInput (to PGM)
   * After previewDelay, the SECOND asset is cued into Preview.
   */
  const cueTrack = useCallback((trackId) => {
    const { tracks, settings, setCuedAsset } = useStore.getState();
    const track = tracks.find((t) => t.id === trackId);
    const first = track?.assets[0];
    if (!first) return;

    // Mark first asset as cued (green border, in PGM frozen)
    setCuedAsset({ trackId, assetIdx: 0 });

    if (window.studioAPI?.vmix && first.vmixKey) {
      if (first.listIndex !== undefined) {
        window.studioAPI.vmix.send(
          `SelectIndex&Value=${first.listIndex}&Input=${first.vmixKey}`,
        );
      }
      if (first.assetType === 'clip') {
        window.studioAPI.vmix.send(`Restart&Input=${first.vmixKey}`);
        window.studioAPI.vmix.send(`Pause&Input=${first.vmixKey}`);
      }
      window.studioAPI.vmix.send(`ActiveInput&Input=${first.vmixKey}`);

      // Cue second asset into Preview after delay
      setTimeout(() => {
        const { tracks: t, setCuedAsset: sca } = useStore.getState();
        const second = findNextAsset(t, trackId, 0);
        if (!second) return;
        sendCueToPreview(second.asset);
        sca({ trackId: second.trackId, assetIdx: second.assetIdx });
      }, settings.previewDelay);
    }
  }, []); // eslint-disable-line

  // ── playTrack ──────────────────────────────────────────────────────────────
  const playTrack = useCallback((trackId) => {
    const { tracks } = useStore.getState();
    const track = tracks.find((t) => t.id === trackId);
    if (track?.assets.length) startAsset(trackId, 0);
  }, [startAsset]);

  // ── continueNext ──────────────────────────────────────────────────────────
  const continueNext = useCallback(() => {
    const { playback, tracks } = useStore.getState();
    const { activeTrackId, activeAssetIdx, trackDone, pausedBetween } = playback;

    if (trackDone) {
      // Move to first asset of next non-empty track
      const next = findNextAsset(tracks, activeTrackId, activeAssetIdx);
      if (next) startAsset(next.trackId, next.assetIdx);
    } else if (pausedBetween) {
      startAsset(activeTrackId, activeAssetIdx + 1);
    }
  }, [startAsset]);

  // ── stop ──────────────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    stopTimer();
    const { setCuedAsset, setPlayback } = useStore.getState();
    setCuedAsset(null);
    setPlayback({ playing: false, pausedBetween: false, trackDone: false, elapsedMs: 0 });
  }, [stopTimer]);

  // Global Enter → Continue
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Enter' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        const { playback } = useStore.getState();
        if (playback.pausedBetween || playback.trackDone) continueNext();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [continueNext]);

  useEffect(() => () => stopTimer(), [stopTimer]);

  return { playTrack, cueTrack, startAsset, continueNext, stop };
}
