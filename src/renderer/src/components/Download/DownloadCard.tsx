import React from 'react';
import { useDownloadStore } from '../../state/downloadStore';
import { useSettingsStore } from '../../state/settingsStore';
import { LOCALES } from '../../localization/locales';
import { ProgressBar } from './ProgressBar';
import { QuoteBox } from './QuoteBox';

export const DownloadCard: React.FC = () => {
  const {
    currentTrackTitle,
    currentTrackArtist,
    artworkUrl,
    progressPercent,
    sizeText,
    speedText,
    counterText,
    trackIndex,
    totalTracks,
    isDuplicate
  } = useDownloadStore();
  const { language } = useSettingsStore();
  const L = LOCALES[language];

  const hiResArtwork = artworkUrl ? artworkUrl.replace('-large', '-t500x500') : null;

  // Localize standard status titles
  let displayTitle = currentTrackTitle;
  if (currentTrackTitle === 'Waiting for link input...') {
    displayTitle = L.waitingInput;
  } else if (currentTrackTitle === 'Resolving link...') {
    displayTitle = L.resolvingUrl;
  } else if (currentTrackTitle === 'Download stopped') {
    displayTitle = language === 'ru' ? 'Загрузка остановлена' : 'Download stopped';
  } else if (currentTrackTitle.startsWith('Finished (')) {
    displayTitle = currentTrackTitle.replace('Finished', L.finished);
  }

  // Localize counter text (e.g., Track 1 of 5 -> Трек 1 из 5)
  const displayCounter =
    totalTracks > 0
      ? `${L.trackPrefix} ${trackIndex} ${L.fromWord} ${totalTracks}`
      : counterText;

  // Localize speed unit
  const displaySpeed = language === 'ru' ? speedText.replace('KB/s', 'КБ/с') : speedText;

  return (
    <div className="groupbox" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div className="groupbox-title">{L.currentStatus}</div>

      <div className="download-card">
        <div className="album-art-box">
          {hiResArtwork ? (
            <img src={hiResArtwork} alt="Cover" />
          ) : (
            <span className="album-art-placeholder">?</span>
          )}
        </div>

        <div className="track-details-col">
          <div>
            <div className="track-title" title={displayTitle}>
              {displayTitle}
            </div>
            <div className="track-artist" title={currentTrackArtist}>
              {currentTrackArtist} {isDuplicate && <span style={{ color: 'var(--green-bar)' }}>[{L.alreadyExists}]</span>}
            </div>
          </div>

          <div>
            <ProgressBar percent={progressPercent} />
            <div className="download-stats-row">
              <span>{sizeText}</span>
              <span>{displaySpeed}</span>
              <span>{displayCounter}</span>
            </div>
          </div>

          <QuoteBox />
        </div>
      </div>
    </div>
  );
};
