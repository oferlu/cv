import React, { useRef } from 'react';
import { useStore } from '../../store';
import './AssetBlock.css';

export const ASSET_MIN_PX = 80;
export const GAP_PX       = 28;

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
  const [over,    setOver]    = React.useState(false);
  const [open,    setOpen]    = React.useState(false);
  const [dropPos, setDropPos] = React.useState({ top: 0, left: 0 });
  const [durVal,  setDurVal]  = React.useState(nextAsset?.transitionDuration ?? 500);
  const btnRef = React.useRef(null);
  const ddRef  = React.useRef(null);

  const transition = nextAsset?.transition ?? null;

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!btnRef.current?.contains(e.target) && !ddRef.current?.contains(e.target))
        setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleOpen = () => {
    // Calculate fixed position from button rect — escapes overflow:hidden parent
    const rect = btnRef.current.getBoundingClientRect();
    setDropPos({ top: rect.bottom + 6, left: rect.left + rect.width / 2 });
    setOpen((o) => !o);
  };

  const setTransition = (effect, dur) => {
    updateAssetTransition(trackId, nextAsset.id, effect, dur ?? durVal);
    if (effect) setDurVal(dur ?? durVal);
  };

  return (
    <div
      className={`gap-marker ${over ? 'over' : ''} ${transition ? 'has-transition' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setOver(false); onDrop(e); }}
    >
      <button
        ref={btnRef}
        className="gap-btn"
        onClick={handleOpen}
        title={transition
          ? `Transition: ${transition} ${transition !== 'Cut' ? `(${durVal}ms)` : ''} — click to change`
          : 'Pause — click to set transition'}
      >
        {transition
          ? <span className="gap-fx">{transition.replace('Reverse', '↩').substring(0, 6)}</span>
          : '⏸'}
      </button>

      {/* Dropdown rendered at fixed position — not clipped by track-body overflow */}
      {open && (
        <div
          ref={ddRef}
          className="gap-dropdown"
          style={{ top: dropPos.top, left: dropPos.left }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="gap-dd-title">Gap / Transition</div>

          <button
            className={`gap-dd-item ${!transition ? 'active' : ''}`}
            onClick={() => { setTransition(null, 0); setOpen(false); }}
          >
            <span className="gap-dd-icon">⏸</span>
            <span>Pause (manual Continue)</span>
          </button>

          <div className="gap-dd-sep">Auto transition →</div>

          <div className="gap-dd-list">
            {vmixTransitions.map((t) => (
              <button
                key={t.effect}
                className={`gap-dd-item ${transition === t.effect ? 'active' : ''}`}
                onClick={() => { setTransition(t.effect, t.defaultDuration); setOpen(false); }}
              >
                <span className="gap-dd-icon">▶</span>
                <span>{t.label}</span>
                {t.defaultDuration > 0 && <span className="gap-dd-dur">{t.defaultDuration}ms</span>}
              </button>
            ))}
          </div>

          {transition && transition !== 'Cut' && (
            <div className="gap-dd-duration">
              <label>
                Duration (ms)
                <input
                  type="number"
                  value={durVal}
                  min="0" max="5000" step="100"
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10) || 0;
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
