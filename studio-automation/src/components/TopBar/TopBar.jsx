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
  const { showClock, setShowClock, rundown, setElapsed } = useStore();
  const [showSettings, setShowSettings] = useState(false);
  const intervalRef = useRef(null);

  const toggleClock = () =>
    setShowClock({ ...showClock, running: !showClock.running });

  const resetClock = () => {
    setShowClock({ running: false, seconds: 0 });
    setElapsed(0);
  };

  useEffect(() => {
    if (showClock.running) {
      intervalRef.current = setInterval(() => {
        setShowClock((prev) => ({ ...prev, seconds: prev.seconds + 1 }));
        setElapsed(rundown.elapsed + 1);
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [showClock.running]); // eslint-disable-line

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <span className="topbar-label">SHOW CLOCK</span>
          <span className="topbar-clock">{formatTime(showClock.seconds)}</span>
          <button className={`tb-btn ${showClock.running ? 'active' : ''}`} onClick={toggleClock}>
            {showClock.running ? '⏸ Pause' : '▶ Start'}
          </button>
          <button className="tb-btn" onClick={resetClock}>↺ Reset</button>
        </div>

        <div className="topbar-center">
          <span className="topbar-label">Item Countdown</span>
          <span className="topbar-countdown">00:31:05</span>
        </div>

        <div className="topbar-right">
          <VmixStatus />
          <button className="tb-btn tb-settings" onClick={() => setShowSettings(true)} title="Settings">
            ⚙
          </button>
        </div>
      </header>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  );
}

function VmixStatus() {
  const { vmix, setVmixConnected, setVmixHost, setVmixTally, setVmixState } = useStore();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  // Load saved settings from localStorage on first render
  useEffect(() => {
    const savedHost = localStorage.getItem('vmix_host');
    const savedPort = localStorage.getItem('vmix_port');
    if (savedHost) setVmixHost(savedHost, savedPort ? parseInt(savedPort, 10) : 8099);
  }, []); // eslint-disable-line

  // Register IPC event listeners (only once)
  useEffect(() => {
    if (!window.studioAPI) return;
    const api = window.studioAPI.vmix;
    api.onConnected(() => { setVmixConnected(true); setError(null); });
    api.onDisconnected(() => setVmixConnected(false));
    api.onTally((t) => setVmixTally(t));
    api.onState((s) => setVmixState(s));
    return () => {
      ['vmix:connected', 'vmix:disconnected', 'vmix:tally', 'vmix:state']
        .forEach((ch) => api.removeAllListeners(ch));
    };
  }, []); // eslint-disable-line

  const connect = async () => {
    if (!window.studioAPI) {
      setError('Not running in Electron');
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      const result = await window.studioAPI.vmix.connect(vmix.host, vmix.port);
      if (!result?.ok) setError(result?.error || 'Connection failed');
    } catch (e) {
      setError(e?.message || 'Connection failed');
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    if (!window.studioAPI) return;
    await window.studioAPI.vmix.disconnect();
    setVmixConnected(false);
    setError(null);
  };

  return (
    <div className="vmix-status">
      <span className={`status-dot ${vmix.connected ? 'on' : 'off'}`} />
      <div className="vmix-info">
        <span className="vmix-label">vMix</span>
        <span className="vmix-addr">{vmix.host}:{vmix.port}</span>
      </div>

      {vmix.connected ? (
        <button className="tb-btn btn-disconnect" onClick={disconnect}>Disconnect</button>
      ) : (
        <button className="tb-btn btn-connect" onClick={connect} disabled={connecting}>
          {connecting ? 'Connecting…' : 'Connect'}
        </button>
      )}

      {error && <span className="vmix-error" title={error}>⚠ {error}</span>}
    </div>
  );
}
