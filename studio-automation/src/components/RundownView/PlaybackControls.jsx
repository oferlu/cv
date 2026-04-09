import React from 'react';
import { useStore } from '../../store';
import { usePlayback } from '../../hooks/usePlayback';
import './PlaybackControls.css';

function fmtMs(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = String(Math.floor(total / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export default function PlaybackControls() {
  const { playback, cuedAsset, tracks } = useStore();
  const cued = !!cuedAsset;
  const { cueTrack, playTrack, continueNext, stop } = usePlayback();

  const { playing, pausedBetween, trackDone, activeTrackId, activeAssetIdx, elapsedMs } = playback;

  const activeTrack = tracks.find((t) => t.id === activeTrackId);
  const activeAsset = activeTrack?.assets[activeAssetIdx];

  const isIdle = !playing && !pausedBetween && !trackDone;
  const firstTrack = tracks.find((t) => t.assets.length > 0);

  // Countdown
  const durationMs   = activeAsset?.durationMs ?? 0;
  const remainingMs  = Math.max(0, durationMs - elapsedMs);
  const isLast10     = playing && durationMs > 0 && remainingMs <= 10000;
  const isLast5      = playing && durationMs > 0 && remainingMs <= 5000;

  const handleCue = () => {
    if (firstTrack) cueTrack(firstTrack.id);
  };

  const handlePlay = () => {
    if (pausedBetween || trackDone) {
      continueNext();
    } else if (!playing && firstTrack) {
      playTrack(firstTrack.id);
    }
  };

  let statusLabel = 'READY';
  if (cued && isIdle)   statusLabel = 'CUED';
  if (playing)          statusLabel = 'PLAYING';
  if (pausedBetween)    statusLabel = 'PAUSED';
  if (trackDone)        statusLabel = 'TRACK END';

  return (
    <div className="pb-bar">
      <div className="pb-controls">
        {/* CUE */}
        <button
          className={`pb-btn pb-cue ${cued ? 'active' : ''}`}
          onClick={handleCue}
          disabled={!firstTrack || playing}
          title="Cue — prepares first asset in vMix (rewinds clip, sets PGM/Preview)"
        >
          ⬛ Cue
        </button>

        {/* PLAY / CONTINUE */}
        <button
          className={`pb-btn pb-play ${playing ? 'active' : ''} ${(pausedBetween || trackDone) ? 'continue' : ''}`}
          onClick={handlePlay}
          disabled={isIdle && !firstTrack}
          title="Play / Continue (Enter)"
        >
          {playing ? '⏸' : (pausedBetween || trackDone) ? '▶ Continue' : '▶ Play'}
        </button>

        {/* STOP */}
        <button
          className="pb-btn pb-stop"
          onClick={stop}
          disabled={isIdle && !cued}
          title="Stop"
        >
          ■ Stop
        </button>
      </div>

      {/* Info bar */}
      <div className="pb-info">
        <span className={`pb-status pb-status--${playing ? 'play' : (pausedBetween || trackDone) ? 'pause' : cued ? 'cued' : 'idle'}`}>
          {statusLabel}
        </span>

        {activeAsset && (
          <span className="pb-asset-name" title={activeAsset.name}>
            {activeAsset.name}
          </span>
        )}

        {activeAsset && durationMs > 0 && (
          <>
            <span className="pb-dur">{fmtMs(durationMs)}</span>
            <span className={`pb-countdown ${isLast10 ? 'last10' : ''} ${isLast5 ? 'last5' : ''}`}>
              -{fmtMs(remainingMs)}
            </span>
          </>
        )}

        {activeAsset && durationMs === 0 && (
          <span className="pb-timer">{fmtMs(elapsedMs)}</span>
        )}
      </div>

      <div className="pb-hint">
        {(pausedBetween || trackDone) && (
          <span className="pb-hint-text">Press <kbd>Enter</kbd> to continue</span>
        )}
      </div>
    </div>
  );
}
