import React, { useState } from 'react';
import { useStore } from '../../store';
import { inputCategory, MOCK_INPUTS } from '../../utils/vmixParser';
import AssetCard from './AssetCard';
import './AssetsPanel.css';

const TABS = ['general', 'media', 'graphics'];
const TAB_LABEL = { general: 'General', media: 'Media', graphics: 'Graphics' };

export default function AssetsPanel() {
  const { vmix, vmixInputs } = useStore();
  const [activeTab, setActiveTab] = useState('general');

  // vMix state updates are handled by useVmixSync (App.jsx — polls every 5s)
  // Nothing to register here.

  // Use real inputs if available, else mock
  const source = vmixInputs.length ? vmixInputs : MOCK_INPUTS;
  const filtered = source.filter((i) => inputCategory(i.type) === activeTab);

  return (
    <div className="assets-panel">
      {/* Header + tabs */}
      <div className="ap-header">
        <div className="ap-tabs">
          {TABS.map((tab) => (
            <button
              key={tab}
              className={`ap-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {TAB_LABEL[tab]}
              <span className="ap-tab-count">
                {source.filter((i) => inputCategory(i.type) === tab).length}
              </span>
            </button>
          ))}
        </div>

        <div className="ap-source-badge">
          {vmixInputs.length ? (
            <span className="badge badge-green">● Live from vMix</span>
          ) : (
            <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-dim)' }}>
              Mock — connect vMix to load real assets
            </span>
          )}
        </div>
      </div>

      {/* Asset grid */}
      <div className="ap-grid">
        {filtered.length === 0 ? (
          <span className="ap-empty">No {TAB_LABEL[activeTab]} inputs found</span>
        ) : (
          filtered.map((input) => <AssetCard key={input.key} input={input} />)
        )}
      </div>
    </div>
  );
}
