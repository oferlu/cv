import React from 'react';
import { useStore } from '../../store';
import { usePlayback } from '../../hooks/usePlayback';
import './PlaybackControls.css';

function fmtMs(ms) {
  const total = Math.floor(ms / 1000);
  const m = String(Math.floor(total / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export default function PlaybackControls() {
  const { playback, tracks } = useStore();
  const { playTrack, continueNext, stop } = usePlayback();

  const { playing, pausedBetween, trackDone, activeTrackId, activeAssetIdx, elapsedMs } = playback;

  const activeTrack = tracks.find((t) => t.id === activeTrackId);
  const activeAsset = activeTrack?.assets[activeAssetIdx];

  const isIdle = !playing && !pausedBetween && !trackDone;

  // Find first playable track for the Play button when idle
  const firstTrack = tracks.find((t) => t.assets.length > 0);

  const handlePlay = () => {
    if (pausedBetween || trackDone) {
      continueNext();
    } else if (!playing && firstTrack) {
      playTrack(firstTrack.id);
    }
  };

  let statusLabel = 'READY';
  if (playing)        statusLabel = 'PLAYING';
  if (pausedBetween)  statusLabel = 'PAUSED — press Continue or Enter';
  if (trackDone)      statusLabel = 'TRACK END — press Continue or Enter for next';

  return (
    <div className="pb-bar">
      <div className="pb-controls">
        <button
          className={`pb-btn pb-play ${playing ? 'active' : ''} ${(pausedBetween || trackDone) ? 'continue' : ''}`}
          onClick={handlePlay}
          disabled={isIdle && !firstTrack}
          title="Play / Continue (Enter)"
        >
          {playing ? '⏸' : (pausedBetween || trackDone) ? '▶ Continue' : '▶ Play'}
        </button>

        <button
          className="pb-btn pb-stop"
          onClick={stop}
          disabled={isIdle}
          title="Stop"
        >
          ■ Stop
        </button>
      </div>

      <div className="pb-info">
        <span className={`pb-status pb-status--${playing ? 'play' : pausedBetween || trackDone ? 'pause' : 'idle'}`}>
          {statusLabel}
        </span>

        {activeAsset && (
          <span className="pb-asset-name">
            {activeTrack?.name} › {activeAsset.name}
          </span>
        )}

        {activeAsset && (
          <span className="pb-timer">
            {fmtMs(elapsedMs)} / {fmtMs(activeAsset.durationMs)}
          </span>
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
