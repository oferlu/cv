import React from 'react';
import DevicePanel from '../DevicePanel/DevicePanel';
import AudioPanel from '../AudioPanel/AudioPanel';
import MediaLibrary from '../MediaLibrary/MediaLibrary';
import './BottomPanels.css';

export default function BottomPanels() {
  return (
    <div className="bottom-panels">
      <DevicePanel />
      <AudioPanel />
      <MediaLibrary />
    </div>
  );
}
