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

// ── Gap marker between assets — with transition dropdown ──────────────────
export function GapMarker({ trackId, nextAsset, onDrop }) {
  const { vmixTransitions, updateAssetTransition } = useStore();
  const [over,  setOver]  = React.useState(false);
  const [open,  setOpen]  = React.useState(false);
  const [durVal, setDurVal] = React.useState(nextAsset?.transitionDuration ?? 500);
  const ref = React.useRef(null);

  const transition = nextAsset?.transition ?? null; // null = pause

  // Close dropdown on outside click
  React.useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const setTransition = (effect, dur) => {
    updateAssetTransition(trackId, nextAsset.id, effect, dur ?? durVal);
    if (effect) setDurVal(dur ?? durVal);
  };

  const transitions = vmixTransitions.length ? vmixTransitions : [];

  return (
    <div
      ref={ref}
      className={`gap-marker ${over ? 'over' : ''} ${transition ? 'has-transition' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); onDrop(e); }}
    >
      <button
        className="gap-btn"
        onClick={() => setOpen((o) => !o)}
        title={transition ? `Transition: ${transition} (${durVal}ms) — click to change` : 'Pause — click to set transition'}
      >
        {transition ? <span className="gap-fx">{transition.replace('Reverse','↩').substring(0,6)}</span> : '⏸'}
      </button>

      {open && (
        <div className="gap-dropdown" onClick={(e) => e.stopPropagation()}>
          <div className="gap-dd-title">Gap / Transition</div>

          {/* Pause option */}
          <button
            className={`gap-dd-item ${!transition ? 'active' : ''}`}
            onClick={() => { setTransition(null, 0); setOpen(false); }}
          >
            <span className="gap-dd-icon">⏸</span>
            <span>Pause (manual Continue)</span>
          </button>

          <div className="gap-dd-sep">Auto transition →</div>

          {/* Transition list */}
          <div className="gap-dd-list">
            {transitions.map((t) => (
              <button
                key={t.effect}
                className={`gap-dd-item ${transition === t.effect ? 'active' : ''}`}
                onClick={() => { setTransition(t.effect, t.defaultDuration); setOpen(false); }}
              >
                <span className="gap-dd-icon">▶</span>
                <span>{t.label}</span>
                <span className="gap-dd-dur">{t.defaultDuration}ms</span>
              </button>
            ))}
          </div>

          {/* Duration override (shown when a transition is selected) */}
          {transition && transition !== 'Cut' && (
            <div className="gap-dd-duration">
              <label>
                Duration (ms)
                <input
                  type="number"
                  value={durVal}
                  min="0" max="5000" step="100"
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    setDurVal(v);
                    updateAssetTransition(trackId, nextAsset.id, transition, v);
                  }}
                />
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
