import React from 'react';
import { inputAssetType } from '../../utils/vmixParser';
import './AssetCard.css';

function fmtMs(ms) {
  if (!ms) return 'LIVE';
  const s = Math.round(ms / 1000);
  if (s >= 3600) return `${Math.floor(s/3600)}h${Math.floor((s%3600)/60)}m`;
  if (s >= 60)   return `${Math.floor(s/60)}m${s%60}s`;
  return `${s}s`;
}

/**
 * Derive icon, badge label, and badge colour from the input.
 * - Only inputs whose name contains "cam" (case-insensitive) get 🎥 / [CAM].
 * - Other General-type inputs get type-specific icons based on their vMix type.
 */
function getDisplayProps(input) {
  const assetType = (input.type === 'VideoList' || input.type === 'List') ? 'list' : inputAssetType(input.type);

  if (assetType === 'clip')    return { label: 'CLIP', color: 'badge-green' };
  if (assetType === 'graphic') return { label: 'GFX',  color: 'badge-amber' };
  if (assetType === 'audio')   return { label: 'AUD',  color: 'badge-purple' };
  if (assetType === 'list')    return { label: 'LIST', color: 'badge-blue' };

  // Camera category — badge CAM only if name contains "cam"
  const name = (input.shortTitle || input.title || '').toLowerCase();
  if (name.includes('cam')) return { label: 'CAM',  color: 'badge-blue' };

  switch (input.type) {
    case 'NDI':        return { label: 'NDI',  color: 'badge-blue' };
    case 'Capture':    return { label: 'CAP',  color: 'badge-blue' };
    case 'Stream':     return { label: 'STR',  color: 'badge-blue' };
    case 'VirtualSet': return { label: 'VSET', color: 'badge-blue' };
    case 'Mix':        return { label: 'MIX',  color: 'badge-blue' };
    case 'Colour':     return { label: 'COL',  color: 'badge-blue' };
    default:           return { label: 'SRC',  color: 'badge-blue' };
  }
}

export default function AssetCard({ input }) {
  const isListHeader = input.type === 'VideoList' || input.type === 'List';
  const assetType = isListHeader ? 'list' : inputAssetType(input.type);
  const { label, color } = getDisplayProps(input);

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
      <div className="ac-info">
        <span className="ac-name">{input.shortTitle || input.title}</span>
        <span className="ac-dur">{fmtMs(input.durationMs)}</span>
      </div>
      <span className={`badge ${color}`}>{label}</span>
    </div>
  );
}
