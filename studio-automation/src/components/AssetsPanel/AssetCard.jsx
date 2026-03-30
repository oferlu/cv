import React from 'react';
import { inputAssetType } from '../../utils/vmixParser';
import './AssetCard.css';

const TYPE_ICON  = { camera: '🎥', clip: '🎬', graphic: '📺', audio: '🎵' };
const TYPE_LABEL = { camera: 'CAM', clip: 'CLIP', graphic: 'GFX', audio: 'AUD' };
const TYPE_COLOR = { camera: 'badge-blue', clip: 'badge-green', graphic: 'badge-amber', audio: 'badge-amber' };

function fmtMs(ms) {
  if (!ms) return 'LIVE';
  const s = Math.round(ms / 1000);
  if (s >= 3600) return `${Math.floor(s/3600)}h${Math.floor((s%3600)/60)}m`;
  if (s >= 60)   return `${Math.floor(s/60)}m${s%60}s`;
  return `${s}s`;
}

export default function AssetCard({ input }) {
  const assetType = inputAssetType(input.type);

  const onDragStart = (e) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/studio-asset', JSON.stringify({
      vmixKey:   input.key,
      name:      input.shortTitle || input.title,
      assetType,
      durationMs: input.durationMs,
    }));
  };

  return (
    <div
      className={`asset-card asset-card--${assetType}`}
      draggable
      onDragStart={onDragStart}
      title={`${input.title}\nType: ${input.type}\nDuration: ${fmtMs(input.durationMs)}\nDrag to Rundown`}
    >
      <span className="ac-icon">{TYPE_ICON[assetType]}</span>
      <div className="ac-info">
        <span className="ac-name">{input.shortTitle || input.title}</span>
        <span className="ac-dur">{fmtMs(input.durationMs)}</span>
      </div>
      <span className={`badge ${TYPE_COLOR[assetType]}`}>{TYPE_LABEL[assetType]}</span>
    </div>
  );
}
