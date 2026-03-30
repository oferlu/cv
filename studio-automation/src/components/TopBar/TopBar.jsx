import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../../store';
import SettingsModal from '../Settings/SettingsModal';
import './TopBar.css';

function formatTime(secs) {
  const h = String(Math.floor(secs / 3600)).padStart(2, '0');
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export default function TopBar() {
  const { showClock, setShowClock, view, setView } = useStore();
  const [showSettings, setShowSettings] = useState(false);
  const intervalRef = useRef(null);

  const toggleClock = () => setShowClock({ ...showClock, running: !showClock.running });
  const resetClock  = () => setShowClock({ running: false, seconds: 0 });

  useEffect(() => {
    if (showClock.running) {
      intervalRef.current = setInterval(() => {
        setShowClock((prev) => ({ ...prev, seconds: prev.seconds + 1 }));
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [showClock.running]); // eslint-disable-line

  return (
    <>
      <header className="topbar">
        {/* ── Clock ── */}
        <div className="topbar-left">
          <span className="topbar-label">SHOW CLOCK</span>
          <span className="topbar-clock">{formatTime(showClock.seconds)}</span>
          <button className={`tb-btn ${showClock.running ? 'active' : ''}`} onClick={toggleClock}>
            {showClock.running ? '⏸' : '▶'}
          </button>
          <button className="tb-btn" onClick={resetClock}>↺</button>
        </div>

        {/* ── View switcher ── */}
        <div className="topbar-center">
          <div className="view-switcher">
            <button
              className={`view-btn ${view === 'rundown' ? 'active' : ''}`}
              onClick={() => setView('rundown')}
            >Rundown</button>
            <button
              className={`view-btn ${view === 'script' ? 'active' : ''}`}
              onClick={() => setView('script')}
            >Script</button>
          </div>
        </div>

        {/* ── vMix + Settings ── */}
        <div className="topbar-right">
          <VmixStatus />
          <button className="tb-btn tb-settings" onClick={() => setShowSettings(true)} title="Settings">⚙</button>
        </div>
      </header>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  );
}

function VmixStatus() {
  const { vmix, setVmixConnected, setVmixHost, setVmixTally } = useStore();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  // Load saved settings
  useEffect(() => {
    const h = localStorage.getItem('vmix_host');
    const p = localStorage.getItem('vmix_port');
    if (h) setVmixHost(h, p ? parseInt(p, 10) : 8099);
  }, []); // eslint-disable-line

  // Register IPC listeners
  useEffect(() => {
    if (!window.studioAPI) return;
    const api = window.studioAPI.vmix;
    api.onConnected(() => { setVmixConnected(true); setError(null); });
    api.onDisconnected(() => setVmixConnected(false));
    api.onTally((t) => setVmixTally(t));
    return () => ['vmix:connected','vmix:disconnected','vmix:tally','vmix:state']
      .forEach((ch) => api.removeAllListeners(ch));
  }, []); // eslint-disable-line

  const connect = async () => {
    if (!window.studioAPI) { setError('Not in Electron'); return; }
    setConnecting(true); setError(null);
    try {
      const r = await window.studioAPI.vmix.connect(vmix.host, vmix.port);
      if (!r?.ok) setError(r?.error || 'Failed');
    } catch (e) {
      setError(e?.message || 'Failed');
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    if (!window.studioAPI) return;
    await window.studioAPI.vmix.disconnect();
    setVmixConnected(false);
  };

  return (
    <div className="vmix-status">
      <span className={`status-dot ${vmix.connected ? 'on' : 'off'}`} />
      <div className="vmix-info">
        <span className="vmix-label">vMix</span>
        <span className="vmix-addr">{vmix.host}:{vmix.port}</span>
      </div>
      {vmix.connected
        ? <button className="tb-btn btn-disconnect" onClick={disconnect}>Disconnect</button>
        : <button className="tb-btn btn-connect" onClick={connect} disabled={connecting}>
            {connecting ? 'Connecting…' : 'Connect'}
          </button>
      }
      {error && <span className="vmix-error" title={error}>⚠ {error}</span>}
    </div>
  );
}
