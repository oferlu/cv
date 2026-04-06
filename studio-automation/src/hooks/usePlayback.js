import { useRef, useEffect, useCallback } from 'react';
import { useStore } from '../store';

const TICK_MS = 100;

export function usePlayback() {
  const timerRef  = useRef(null);
  const elapsedRef = useRef(0);

  const stopTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  /**
   * Start playing an asset.
   * opts.skipPGM = true → vMix transition was already sent by the caller
   *                        (auto-transition case); don't re-send ActiveInput.
   */
  const startAsset = useCallback((trackId, assetIdx, opts = {}) => {
    stopTimer();
    elapsedRef.current = 0;

    const { tracks, settings, setPlayback } = useStore.getState();
    const track = tracks.find((t) => t.id === trackId);
    const asset = track?.assets[assetIdx];
    if (!asset) return;

    setPlayback({
      activeTrackId: trackId,
      activeAssetIdx: assetIdx,
      playing: true,
      pausedBetween: false,
      trackDone: false,
      elapsedMs: 0,
    });

    // ── vMix commands ────────────────────────────────────────────────────────
    if (window.studioAPI?.vmix && asset.vmixKey) {
      // For list items: select the specific index in the list first
      if (asset.listIndex !== undefined) {
        window.studioAPI.vmix.send(`SelectIndex&Value=${asset.listIndex}&Input=${asset.vmixKey}`);
      }

      if (!opts.skipPGM) {
        // Direct cut to PGM (no transition — manual continue or first asset)
        window.studioAPI.vmix.send(`ActiveInput&Input=${asset.vmixKey}`);
      }

      // For video clips (and list items): send Play so vMix starts the clip
      if (asset.assetType === 'clip') {
        const playDelay = opts.skipPGM ? (asset.transitionDuration || 0) : 0;
        setTimeout(
          () => window.studioAPI.vmix.send(`Play&Input=${asset.vmixKey}`),
          playDelay
        );
      }

      // Set next asset to Preview after configurable delay
      const nextAsset = track.assets[assetIdx + 1];
      if (nextAsset?.vmixKey) {
        setTimeout(
          () => window.studioAPI.vmix.send(`PreviewInput&Input=${nextAsset.vmixKey}`),
          settings.previewDelay
        );
      }
    }

    // ── Tick every 100ms ─────────────────────────────────────────────────────
    timerRef.current = setInterval(() => {
      elapsedRef.current += TICK_MS;

      const { tracks: currentTracks, setPlayback: sp } = useStore.getState();
      const currentTrack  = currentTracks.find((t) => t.id === trackId);
      const assetDuration = currentTrack?.assets[assetIdx]?.durationMs ?? 0;

      if (elapsedRef.current >= assetDuration) {
        stopTimer();
        elapsedRef.current = assetDuration;

        const nextAsset = currentTrack?.assets[assetIdx + 1];
        const isLast    = !nextAsset;

        if (!isLast && nextAsset.transition) {
          // ── Auto-transition to next asset ──────────────────────────────────
          const dur = nextAsset.transitionDuration ?? 500;
          const cmd = nextAsset.transition === 'Cut'
            ? `Cut&Input=${nextAsset.vmixKey}`
            : `${nextAsset.transition}&Input=${nextAsset.vmixKey}&Duration=${dur}`;

          if (window.studioAPI?.vmix && nextAsset.vmixKey) {
            window.studioAPI.vmix.send(cmd);
          }

          // Keep "playing" visually during the transition, then start next asset
          sp({ elapsedMs: assetDuration, playing: true });
          setTimeout(() => startAsset(trackId, assetIdx + 1, { skipPGM: true }), dur);
        } else {
          // Pause and wait for manual Continue
          sp({
            elapsedMs: assetDuration,
            playing: false,
            pausedBetween: !isLast,
            trackDone: isLast,
          });
        }
      } else {
        sp({ elapsedMs: elapsedRef.current });
      }
    }, TICK_MS);
  }, [stopTimer]); // eslint-disable-line

  /**
   * Cue the first asset of a track — prepares vMix without starting the timer.
   * - Clip: restart + pause on first frame, send to PGM.
   * - Camera/live: send to PGM.
   * - Next asset placed in Preview after previewDelay.
   */
  const cueTrack = useCallback((trackId) => {
    const { tracks, settings, setCued } = useStore.getState();
    const track = tracks.find((t) => t.id === trackId);
    const first = track?.assets[0];
    if (!first) return;

    setCued(true);

    if (window.studioAPI?.vmix && first.vmixKey) {
      if (first.listIndex !== undefined) {
        window.studioAPI.vmix.send(`SelectIndex&Value=${first.listIndex}&Input=${first.vmixKey}`);
      }
      if (first.assetType === 'clip') {
        window.studioAPI.vmix.send(`Restart&Input=${first.vmixKey}`);
        window.studioAPI.vmix.send(`Pause&Input=${first.vmixKey}`);
      }
      window.studioAPI.vmix.send(`ActiveInput&Input=${first.vmixKey}`);

      const second = track.assets[1];
      if (second?.vmixKey) {
        setTimeout(
          () => window.studioAPI.vmix.send(`PreviewInput&Input=${second.vmixKey}`),
          settings.previewDelay,
        );
      }
    }
  }, []); // eslint-disable-line

  const playTrack = useCallback((trackId) => {
    const { tracks, setCued } = useStore.getState();
    const track = tracks.find((t) => t.id === trackId);
    setCued(false);
    if (track?.assets.length) startAsset(trackId, 0);
  }, [startAsset]);

  const continueNext = useCallback(() => {
    const { playback, tracks } = useStore.getState();
    const { activeTrackId, activeAssetIdx, trackDone } = playback;

    if (trackDone) {
      const ti   = tracks.findIndex((t) => t.id === activeTrackId);
      const next = tracks.slice(ti + 1).find((t) => t.assets.length > 0);
      if (next) startAsset(next.id, 0);
    } else {
      startAsset(activeTrackId, activeAssetIdx + 1);
    }
  }, [startAsset]);

  const stop = useCallback(() => {
    stopTimer();
    useStore.getState().setCued(false);
    useStore.getState().setPlayback({
      playing: false, pausedBetween: false, trackDone: false, elapsedMs: 0,
    });
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
