import React from 'react';
import { useDownloadStore } from '../../state/downloadStore';
import { useSettingsStore } from '../../state/settingsStore';
import { LOCALES } from '../../localization/locales';

export const UrlBar: React.FC = () => {
  const { url, setUrl, isDownloading, startDownload, stopDownload } = useDownloadStore();
  const { language } = useSettingsStore();
  const L = LOCALES[language];

  const handlePaste = async () => {
    try {
      const text = await window.electronAPI.system.readClipboard();
      if (text) {
        setUrl(text.trim());
      }
    } catch (err) {
      console.warn('Failed to read clipboard:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isDownloading && url.trim()) {
      startDownload();
    }
  };

  return (
    <div className="groupbox">
      <div className="groupbox-title">{L.urlPrompt}</div>
      <div className="url-bar-row">
        <input
          type="text"
          className="input-text"
          placeholder={L.placeholder}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          autoComplete="off"
        />
        <button className="btn" onClick={handlePaste}>
          {L.paste}
        </button>
        <button
          className="btn btn-primary"
          onClick={startDownload}
          disabled={isDownloading || !url.trim()}
        >
          {L.startDownload}
        </button>
        <button
          className="btn"
          onClick={stopDownload}
          disabled={!isDownloading}
        >
          {L.stopDownload}
        </button>
      </div>
    </div>
  );
};
