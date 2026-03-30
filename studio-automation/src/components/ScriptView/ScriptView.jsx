import React, { useRef } from 'react';
import { useStore } from '../../store';
import { inputAssetType } from '../../utils/vmixParser';
import './ScriptView.css';

const TYPE_ICON = { camera: '🎥', clip: '🎬', graphic: '📺', audio: '🎵' };

export default function ScriptView() {
  const { scriptItems, updateScriptText, addScriptAsset, removeScriptItem } = useStore();

  return (
    <div className="script-view">
      <div className="script-header">
        <span className="script-title">Script</span>
        <span className="script-hint">Type your script. Drag assets from the panel below to insert cue points.</span>
      </div>

      <div className="script-body">
        {scriptItems.map((item) =>
          item.type === 'text' ? (
            <ScriptTextBlock
              key={item.id}
              item={item}
              onChange={(content) => updateScriptText(item.id, content)}
              onDropAsset={(assetData) => addScriptAsset(item.id, assetData)}
            />
          ) : (
            <ScriptAssetMarker
              key={item.id}
              item={item}
              onRemove={() => removeScriptItem(item.id)}
            />
          )
        )}
      </div>
    </div>
  );
}

function ScriptTextBlock({ item, onChange, onDropAsset }) {
  const [dropOver, setDropOver] = React.useState(false);
  const ref = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDropOver(false);
    const raw = e.dataTransfer.getData('application/studio-asset');
    if (!raw) return;
    onDropAsset(JSON.parse(raw));
  };

  return (
    <div className={`script-text-block ${dropOver ? 'drop-over' : ''}`}>
      <textarea
        ref={ref}
        className="script-textarea"
        value={item.content}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type script here… drag an asset below this paragraph to insert a cue point"
        rows={3}
      />
      <div
        className="script-drop-zone"
        onDragOver={(e) => { e.preventDefault(); setDropOver(true); }}
        onDragLeave={() => setDropOver(false)}
        onDrop={handleDrop}
      >
        {dropOver ? '↓ Drop asset here' : '· · · drag asset here to insert cue · · ·'}
      </div>
    </div>
  );
}

function ScriptAssetMarker({ item, onRemove }) {
  const assetType = item.assetType || inputAssetType(item.type || 'Camera');
  return (
    <div className={`script-asset-marker script-asset--${assetType}`}>
      <span className="sam-icon">{TYPE_ICON[assetType] || '⬤'}</span>
      <span className="sam-name">{item.name}</span>
      <span className="sam-type">{assetType.toUpperCase()}</span>
      <button className="sam-remove" onClick={onRemove} title="Remove cue">✕</button>
    </div>
  );
}
