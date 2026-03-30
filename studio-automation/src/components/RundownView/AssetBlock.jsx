import React, { useRef } from 'react';
import { useStore } from '../../store';
import './AssetBlock.css';

export const ASSET_MIN_PX = 80;
export const GAP_PX       = 28;

const TYPE_ICON  = { camera: '🎥', clip: '🎬', graphic: '📺', audio: '🎵' };
const TYPE_COLOR = {
  camera:  'var(--track-intro)',
  clip:    'var(--track-main)',
  graphic: 'var(--track-roll)',
  audio:   'var(--track-talk)',
};

function fmtMs(ms) {
  if (!ms) return '—';
  const s = ms / 1000;
  return s >= 60 ? `${Math.floor(s / 60)}m${Math.round(s % 60)}s` : `${s.toFixed(1)}s`;
}

export default function AssetBlock({ asset, trackId, isActive, playheadPct }) {
  const { zoom, removeAssetFromTrack, updateAssetDuration } = useStore();
  const width = Math.max(ASSET_MIN_PX, (asset.durationMs / 1000) * zoom);

  // ── Drag to reorder ────────────────────────────────────────────────────────
  const onDragStart = (e) => {
    e.stopPropagation(); // prevent track body picking it up as new-asset drop
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/studio-asset-move', JSON.stringify({
      fromTrackId: trackId,
      assetId: asset.id,
      assetData: {
        vmixKey: asset.vmixKey,
        name: asset.name,
        assetType: asset.assetType,
        durationMs: asset.durationMs,
      },
    }));
  };

  // ── Right-edge resize ──────────────────────────────────────────────────────
  const resizeRef = useRef({ active: false });

  const onResizeMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const startX   = e.clientX;
    const startDur = asset.durationMs;
    resizeRef.current.active = true;

    const onMove = (me) => {
      const delta   = me.clientX - startX;
      const newDur  = Math.round(((startDur / 1000) + delta / zoom) * 1000);
      updateAssetDuration(trackId, asset.id, newDur);
    };
    const onUp = () => {
      resizeRef.current.active = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
  };

  return (
    <div
      className={`asset-block ${isActive ? 'is-active' : ''}`}
      style={{ width, background: TYPE_COLOR[asset.assetType] || 'var(--track-main)' }}
      draggable
      onDragStart={onDragStart}
    >
      {/* Playhead inside active asset */}
      {isActive && (
        <div className="asset-playhead" style={{ left: `${Math.min(1, playheadPct) * 100}%` }} />
      )}

      <span className="asset-icon">{TYPE_ICON[asset.assetType] || '⬤'}</span>
      <div className="asset-info">
        <span className="asset-name">{asset.name}</span>
        <span className="asset-dur">{fmtMs(asset.durationMs)}</span>
      </div>

      <button
        className="asset-remove"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); removeAssetFromTrack(trackId, asset.id); }}
        title="Remove"
      >✕</button>

      {/* Right resize handle */}
      <div className="asset-resize-handle" onMouseDown={onResizeMouseDown} title="Drag to resize" />
    </div>
  );
}

// ── Gap marker between assets ──────────────────────────────────────────────
export function GapMarker({ onDrop }) {
  const [over, setOver] = React.useState(false);

  return (
    <div
      className={`gap-marker ${over ? 'over' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); onDrop(e); }}
      title="Gap — pause point. Drop here to insert between assets."
    >
      <span className="gap-icon">⏸</span>
    </div>
  );
}
