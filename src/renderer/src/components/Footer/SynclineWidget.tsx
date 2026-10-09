import React from 'react';

export const SynclineWidget: React.FC = () => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.electronAPI.system.openExternal('https://sync-line.pages.dev/');
  };

  return (
    <a
      href="https://sync-line.pages.dev/"
      onClick={handleClick}
      className="syncline-widget"
      title="Visit Syncline (https://sync-line.pages.dev/)"
    >
      <img src="synclinelogo.png" alt="Syncline Logo" className="syncline-logo-img" />
      <span className="syncline-text">try syncline</span>
      <span className="syncline-btn">Open ↗</span>
    </a>
  );
};
