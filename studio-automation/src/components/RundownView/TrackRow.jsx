import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useStore } from '../../store';
import { usePlayback } from '../../hooks/usePlayback';
import AssetBlock, { GapMarker, ASSET_MIN_PX, GAP_PX } from './AssetBlock';
import './TrackRow.css';

export default function TrackRow({ track, isPhantom }) {
  const {
    zoom, playback,
    addAssetToTrack, renameTrack, removeTrack, moveAsset, settings,
    rulerScrollLeft, setRulerScrollLeft,
  } = useStore();
  const { playTrack } = usePlayback();

  const [editing,  setEditing]  = useState(false);
  const [nameVal,  setNameVal]  = useState(track.name);
  const [dropOver, setDropOver] = useState(false);

  const bodyRef    = useRef(null);
  const syncingRef = useRef(false);

  const isActiveTrack = playback.activeTrackId === track.id;

  // ── Scroll sync: store → DOM ──────────────────────────────────────────────
  useEffect(() => {
    const el = bodyRef.current;
    if (!el || syncingRef.current) return;
    syncingRef.current = true;
    el.scrollLeft = rulerScrollLeft;
    requestAnimationFrame(() => { syncingRef.current = false; });
  }, [rulerScrollLeft]);

  // ── Scroll sync: DOM → store ──────────────────────────────────────────────
  const handleScroll = useCallback((e) => {
    if (syncingRef.current) return;
    setRulerScrollLeft(e.target.scrollLeft);
  }, [setRulerScrollLeft]);

  // ── Auto-scroll to follow playhead ────────────────────────────────────────
  useEffect(() => {
    if (!isActiveTrack || !bodyRef.current) return;
    const px = calcPlayheadX(track, playback.activeAssetIdx, playback.elapsedMs, zoom);
    const el  = bodyRef.current;
    const target = px - el.clientWidth * 0.4;
    el.scrollLeft = Math.max(0, target);
  }, [playback.elapsedMs, isActiveTrack]); // eslint-disable-line

  // ── Unified drop handler ───────────────────────────────────────────────────
  const handleDrop = (e, insertAfterIdx = -1) => {
    e.preventDefault();
    setDropOver(false);

    // Move existing asset (drag-to-reorder or cross-track move)
    const moveRaw = e.dataTransfer.getData('application/studio-asset-move');
    if (moveRaw) {
      const { fromTrackId, assetId } = JSON.parse(moveRaw);
      moveAsset(fromTrackId, assetId, track.id, insertAfterIdx);
      return;
    }

    // New asset dragged from Assets Panel
    const newRaw = e.dataTransfer.getData('application/studio-asset');
    if (newRaw) {
      const assetData = JSON.parse(newRaw);
      if (assetData.assetType === 'camera' || assetData.durationMs === 0) {
        assetData.durationMs = settings.cameraDuration;
      }
      addAssetToTrack(track.id, assetData, insertAfterIdx);
    }
  };

  const commitRename = () => {
    renameTrack(track.id, nameVal.trim() || track.name);
    setEditing(false);
  };

  const playheadX = isActiveTrack
    ? calcPlayheadX(track, playback.activeAssetIdx, playback.elapsedMs, zoom)
    : -1;

  return (
    <div className={`track-row ${isActiveTrack ? 'is-active-track' : ''} ${isPhantom ? 'is-phantom' : ''}`}>
      {/* ── Label ── */}
      <div className="track-label">
        <button
          className="track-play-btn"
          onClick={() => playTrack(track.id)}
          disabled={track.assets.length === 0}
          title="Play this track"
        >▶</button>

        {editing ? (
          <input
            className="track-name-input"
            value={nameVal}
            onChange={(e) => setNameVal(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') setEditing(false);
            }}
            autoFocus
          />
        ) : (
          <span
            className="track-name"
            onDoubleClick={() => !isPhantom && setEditing(true)}
            title={isPhantom ? '' : 'Double-click to rename'}
          >
            {isPhantom ? '↓ drop to create track' : track.name}
          </span>
        )}

        {!isPhantom && (
          <button className="track-remove-btn" onClick={() => removeTrack(track.id)} title="Remove track">✕</button>
        )}
      </div>

      {/* ── Body (scrollable, synced) ── */}
      <div
        ref={bodyRef}
        className={`track-body ${dropOver ? 'drop-over' : ''} ${track.assets.length === 0 ? 'is-empty' : ''}`}
        onScroll={handleScroll}
        onDragOver={(e) => { e.preventDefault(); setDropOver(true); }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDropOver(false); }}
        onDrop={(e) => handleDrop(e, track.assets.length - 1)}
      >
        {track.assets.length === 0 && (
          <span className="track-empty-hint">Drag assets here</span>
        )}

        {track.assets.map((asset, idx) => {
          const isActive   = isActiveTrack && playback.activeAssetIdx === idx;
          const playheadPct = isActive ? playback.elapsedMs / asset.durationMs : 0;

          return (
            <React.Fragment key={asset.id}>
              <AssetBlock
                asset={asset}
                trackId={track.id}
                isActive={isActive}
                playheadPct={playheadPct}
              />
              {/* Gap marker — also a drop target */}
              {idx < track.assets.length - 1 && (
                <GapMarker onDrop={(e) => handleDrop(e, idx)} />
              )}
            </React.Fragment>
          );
        })}

        {/* Trailing drop zone */}
        {track.assets.length > 0 && (
          <div
            className="track-end-drop"
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={(e) => { e.stopPropagation(); handleDrop(e, track.assets.length - 1); }}
          />
        )}
      </div>
    </div>
  );
}

function calcPlayheadX(track, activeAssetIdx, elapsedMs, zoom) {
  let x = 0;
  for (let i = 0; i <= activeAssetIdx && i < track.assets.length; i++) {
    const asset = track.assets[i];
    const w = Math.max(ASSET_MIN_PX, (asset.durationMs / 1000) * zoom);
    if (i < activeAssetIdx) {
      x += w + GAP_PX;
    } else {
      x += (elapsedMs / asset.durationMs) * w;
    }
  }
  return x;
}
