import React from 'react';
import { inputAssetType } from '../../utils/vmixParser';
import './AssetCard.css';

const TYPE_ICON  = { camera: '🎥', clip: '🎬', graphic: '📺', audio: '🎵', list: '📋' };
const TYPE_LABEL = { camera: 'CAM', clip: 'CLIP', graphic: 'GFX', audio: 'AUD', list: 'LIST' };
const TYPE_COLOR = { camera: 'badge-blue', clip: 'badge-green', graphic: 'badge-amber', audio: 'badge-amber', list: 'badge-blue' };

function fmtMs(ms) {
  if (!ms) return 'LIVE';
  const s = Math.round(ms / 1000);
  if (s >= 3600) return `${Math.floor(s/3600)}h${Math.floor((s%3600)/60)}m`;
  if (s >= 60)   return `${Math.floor(s/60)}m${s%60}s`;
  return `${s}s`;
}

export default function AssetCard({ input }) {
  const isListHeader = input.type === 'List';
  const assetType    = isListHeader ? 'list' : inputAssetType(input.type);

  const onDragStart = (e) => {
    if (isListHeader) return; // List container itself is not draggable — drag items instead
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/studio-asset', JSON.stringify({
      vmixKey:    input.isListItem ? input.listKey : input.key,  // always use parent key for vMix
      name:       input.shortTitle || input.title,
      assetType:  inputAssetType(input.type),
      durationMs: input.durationMs,
      // Extra fields for list item playback
      ...(input.isListItem && { listIndex: input.listIndex }),
    }));
  };

  return (
    <div
      className={[
        'asset-card',
        `asset-card--${assetType}`,
        input.isListItem  ? 'is-list-item'   : '',
        isListHeader      ? 'is-list-header'  : '',
      ].join(' ')}
      draggable={!isListHeader}
      onDragStart={onDragStart}
      title={isListHeader
        ? `${input.title} — expand to see clips`
        : `${input.title}\nType: ${input.type}\nDuration: ${fmtMs(input.durationMs)}\nDrag to Rundown`}
    >
      {input.isListItem && <span className="ac-list-indent">└</span>}
      <span className="ac-icon">{TYPE_ICON[assetType]}</span>
      <div className="ac-info">
        <span className="ac-name">{input.shortTitle || input.title}</span>
        <span className="ac-dur">{fmtMs(input.durationMs)}</span>
      </div>
      <span className={`badge ${TYPE_COLOR[assetType]}`}>{TYPE_LABEL[assetType]}</span>
    </div>
  );
}
