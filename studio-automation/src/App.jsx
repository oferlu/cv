import React from 'react';
import TopBar from './components/TopBar/TopBar';
import Timeline from './components/Timeline/Timeline';
import BottomPanels from './components/BottomPanels/BottomPanels';
import './App.css';

export default function App() {
  return (
    <div className="app-layout">
      <TopBar />
      <main className="app-body">
        <Timeline />
        <BottomPanels />
      </main>
    </div>
  );
}
