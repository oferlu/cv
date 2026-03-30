import { useRef, useEffect, useCallback } from 'react';
import { useStore } from '../store';

const TICK_MS = 100;

export function usePlayback() {
  const timerRef = useRef(null);
  const elapsedRef = useRef(0);

  const stopTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  // Start playing a specific asset within a track
  const startAsset = useCallback((trackId, assetIdx) => {
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

    // ── vMix commands ────────────────────────────────────────────────────
    // ActiveInput sets the input to Program (PGM) output immediately
    // PreviewInput sets the input to Preview (output 2) after a delay
    if (window.studioAPI?.vmix && asset.vmixKey) {
      window.studioAPI.vmix.send(`ActiveInput&Input=${asset.vmixKey}`);
      const nextAsset = track.assets[assetIdx + 1];
      if (nextAsset?.vmixKey) {
        setTimeout(
          () => window.studioAPI.vmix.send(`PreviewInput&Input=${nextAsset.vmixKey}`),
          settings.previewDelay
        );
      }
    }

    // ── Tick every 100ms ─────────────────────────────────────────────────
    timerRef.current = setInterval(() => {
      elapsedRef.current += TICK_MS;

      const { tracks: currentTracks, setPlayback: sp } = useStore.getState();
      const currentTrack = currentTracks.find((t) => t.id === trackId);
      const assetDuration = currentTrack?.assets[assetIdx]?.durationMs ?? 0;

      if (elapsedRef.current >= assetDuration) {
        stopTimer();
        elapsedRef.current = assetDuration;
        const isLast = assetIdx >= (currentTrack?.assets.length ?? 0) - 1;
        sp({
          elapsedMs: assetDuration,
          playing: false,
          pausedBetween: !isLast,
          trackDone: isLast,
        });
      } else {
        sp({ elapsedMs: elapsedRef.current });
      }
    }, TICK_MS);
  }, [stopTimer]);

  // Start playing a track from the first asset
  const playTrack = useCallback((trackId) => {
    const { tracks } = useStore.getState();
    const track = tracks.find((t) => t.id === trackId);
    if (track?.assets.length) startAsset(trackId, 0);
  }, [startAsset]);

  // Continue from a pause (between assets, or between tracks)
  const continueNext = useCallback(() => {
    const { playback, tracks } = useStore.getState();
    const { activeTrackId, activeAssetIdx, trackDone } = playback;

    if (trackDone) {
      // Jump to first asset of the next non-empty track
      const ti = tracks.findIndex((t) => t.id === activeTrackId);
      const next = tracks.slice(ti + 1).find((t) => t.assets.length > 0);
      if (next) startAsset(next.id, 0);
    } else {
      startAsset(activeTrackId, activeAssetIdx + 1);
    }
  }, [startAsset]);

  const stop = useCallback(() => {
    stopTimer();
    useStore.getState().setPlayback({
      playing: false,
      pausedBetween: false,
      trackDone: false,
      elapsedMs: 0,
    });
  }, [stopTimer]);

  // Global Enter key → Continue
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

  return { playTrack, startAsset, continueNext, stop };
}
