import React from 'react';
import { useSettingsStore } from '../../state/settingsStore';
import { usePlayerStore } from '../../state/playerStore';
import { LOCALES } from '../../localization/locales';

export const SaveFolderPicker: React.FC = () => {
  const { downloadFolder, selectDownloadFolder, language } = useSettingsStore();
  const { loadTracks } = usePlayerStore();
  const L = LOCALES[language];

  const handleBrowse = async () => {
    await selectDownloadFolder();
  };

  const displayPath = downloadFolder || L.saveFolderDefault;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <div className="save-path-row" title={displayPath}>
        {L.saveLocation} <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayPath}</strong>
      </div>
      <button className="btn btn-sm" onClick={handleBrowse} title={L.browse}>
        {L.browse}
      </button>
    </div>
  );
};
