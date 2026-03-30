import React from 'react';
import { useStore } from './store';
import { useVmixSync } from './hooks/useVmixSync';
import TopBar from './components/TopBar/TopBar';
import RundownView from './components/RundownView/RundownView';
import ScriptView from './components/ScriptView/ScriptView';
import AssetsPanel from './components/AssetsPanel/AssetsPanel';
import './App.css';

export default function App() {
  const { view } = useStore();
  useVmixSync(); // single mount-point for all vMix IPC + polling

  return (
    <div className="app-layout">
      <TopBar />
      <main className="app-body">
        {view === 'rundown' ? <RundownView /> : <ScriptView />}
        <AssetsPanel />
      </main>
    </div>
  );
}
