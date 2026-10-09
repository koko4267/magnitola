import React, { useEffect } from 'react';
import { UrlBar } from './components/Download/UrlBar';
import { DownloadCard } from './components/Download/DownloadCard';
import { SynclineWidget } from './components/Footer/SynclineWidget';
import { SaveFolderPicker } from './components/Footer/SaveFolderPicker';
import { LanguageToggle } from './components/Footer/LanguageToggle';
import { PlayerSidebar } from './components/Player/PlayerSidebar';
import { useSettingsStore } from './state/settingsStore';
import { useDownloadStore } from './state/downloadStore';
import { usePlayerStore } from './state/playerStore';
import { useAudioPlayer } from './hooks/useAudioPlayer';

export const App: React.FC = () => {
  const initSettings = useSettingsStore((s) => s.initSettings);
  const downloadFolder = useSettingsStore((s) => s.downloadFolder);
  const handleProgress = useDownloadStore((s) => s.handleProgress);
  const handleFinished = useDownloadStore((s) => s.handleFinished);
  const handleError = useDownloadStore((s) => s.handleError);
  const loadTracks = usePlayerStore((s) => s.loadTracks);
  const addTrack = usePlayerStore((s) => s.addTrack);

  // Initialize background HTML5 Audio Engine
  useAudioPlayer();

  const isInitialized = useSettingsStore((s) => s.isInitialized);

  // Initialize settings on mount
  useEffect(() => {
    initSettings();
  }, [initSettings]);

  // Load library tracks on initial startup when settings become ready
  useEffect(() => {
    if (isInitialized && downloadFolder && usePlayerStore.getState().tracks.length === 0) {
      loadTracks(downloadFolder);
    }
  }, [isInitialized, downloadFolder, loadTracks]);

  // Register Electron IPC listeners with cleanup
  useEffect(() => {
    if (!window.electronAPI) return;

    const unsubProgress = window.electronAPI.download.onProgress(handleProgress);
    const unsubFinished = window.electronAPI.download.onFinished(handleFinished);
    const unsubError = window.electronAPI.download.onError(handleError);
    const unsubTrackAdded = window.electronAPI.library.onTrackAdded((track) => {
      addTrack(track);
    });

    return () => {
      unsubProgress();
      unsubFinished();
      unsubError();
      unsubTrackAdded();
    };
  }, [handleProgress, handleFinished, handleError, addTrack]);

  return (
    <div className="app-container">
      <div className="main-pane">
        <UrlBar />
        <DownloadCard />

        <div className="bottom-controls-row">
          <SynclineWidget />

          <div className="bottom-right-group">
            <SaveFolderPicker />
            <LanguageToggle />
          </div>
        </div>
      </div>

      <PlayerSidebar />
    </div>
  );
};
