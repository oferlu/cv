import React from 'react';
import { useStore } from '../../store';
import './AssetBlock.css';

export const PX_PER_SEC = 40;   // pixels per second
export const ASSET_MIN_PX = 120;
export const GAP_PX = 28;       // gap marker width

const TYPE_ICON = { camera: '🎥', clip: '🎬', graphic: '📺', audio: '🎵' };
const TYPE_COLOR = {
  camera:  'var(--track-intro)',
  clip:    'var(--track-main)',
  graphic: 'var(--track-roll)',
  audio:   'var(--track-talk)',
};

function fmtMs(ms) {
  if (!ms) return '—';
  const s = Math.round(ms / 1000);
  return s >= 60 ? `${Math.floor(s/60)}m${s%60}s` : `${s}s`;
}

export default function AssetBlock({ asset, trackId, isActive, playheadPct }) {
  const { removeAssetFromTrack } = useStore();
  const width = Math.max(ASSET_MIN_PX, (asset.durationMs / 1000) * PX_PER_SEC);

  return (
    <div
      className={`asset-block ${isActive ? 'is-active' : ''}`}
      style={{ width, background: TYPE_COLOR[asset.assetType] || 'var(--track-main)' }}
    >
      {/* Playhead overlay inside active asset */}
      {isActive && (
        <div className="asset-playhead" style={{ left: `${playheadPct * 100}%` }} />
      )}

      <span className="asset-icon">{TYPE_ICON[asset.assetType] || '⬤'}</span>
      <div className="asset-info">
        <span className="asset-name">{asset.name}</span>
        <span className="asset-dur">{fmtMs(asset.durationMs)}</span>
      </div>

      <button
        className="asset-remove"
        onClick={(e) => { e.stopPropagation(); removeAssetFromTrack(trackId, asset.id); }}
        title="Remove"
      >✕</button>
    </div>
  );
}

// Gap marker between assets (also a drop target)
export function GapMarker({ onDrop, transition }) {
  const [over, setOver] = React.useState(false);

  return (
    <div
      className={`gap-marker ${over ? 'over' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); onDrop(e); }}
      title={transition || 'Pause — click to set transition'}
    >
      <span className="gap-icon">⏸</span>
    </div>
  );
}
