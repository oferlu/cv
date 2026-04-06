import React, { useState } from 'react';
import { useStore } from '../../store';
import { inputCategory } from '../../utils/vmixParser';
import AssetCard from './AssetCard';
import './AssetsPanel.css';

const GROUPS = [
  { id: 'general',  label: 'Input',    icon: '📹' },
  { id: 'media',    label: 'Media',    icon: '🎬' },
  { id: 'graphics', label: 'Graphics', icon: '📺' },
];

export default function AssetsPanel() {
  const { vmixInputs, vmix } = useStore();
  const [open, setOpen]         = useState(true);
  const [collapsed, setCollapsed] = useState({});

  const toggle = (id) => setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));

  // Only show real inputs — never mock data
  const source = vmixInputs;
  const connected = vmix.connected;

  return (
    <aside className={`assets-sidebar ${open ? 'sidebar-open' : 'sidebar-closed'}`}>
      {/* ── Sidebar toggle ─────────────────────────────────────────── */}
      <button
        className="sidebar-toggle-btn"
        onClick={() => setOpen(!open)}
        title={open ? 'Collapse panel' : 'Expand panel'}
      >
        {open ? '◀' : '▶'}
      </button>

      {/* ── Connection badge ───────────────────────────────────────── */}
      {open && (
        <div className="sidebar-status">
          {connected
            ? <span className="badge badge-green">● Live</span>
            : <span className="sidebar-status-offline">Not connected</span>}
        </div>
      )}

      {/* ── Groups ────────────────────────────────────────────────── */}
      {GROUPS.map(({ id, label, icon }) => {
        const items = source.filter((i) => inputCategory(i.type) === id);
        const isCollapsed = collapsed[id];

        if (!open) {
          // Collapsed sidebar — show icon + count only
          return (
            <button
              key={id}
              className="sidebar-icon-tab"
              onClick={() => setOpen(true)}
              title={`${label} (${items.length})`}
            >
              <span className="sidebar-icon-tab-icon">{icon}</span>
              {items.length > 0 && (
                <span className="sidebar-icon-tab-count">{items.length}</span>
              )}
            </button>
          );
        }

        return (
          <div key={id} className="sidebar-group">
            <button
              className="sidebar-group-hdr"
              onClick={() => toggle(id)}
            >
              <span className="sg-icon">{icon}</span>
              <span className="sg-label">{label}</span>
              <span className="sg-count">{items.length}</span>
              <span className="sg-chevron">{isCollapsed ? '›' : '⌄'}</span>
            </button>

            {!isCollapsed && (
              <div className="sidebar-group-body">
                {items.length === 0 ? (
                  <span className="sidebar-empty">
                    {connected ? `No ${label} inputs` : 'Connect vMix to load'}
                  </span>
                ) : (
                  items.map((input) => (
                    <AssetCard key={input.key} input={input} />
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </aside>
  );
}
