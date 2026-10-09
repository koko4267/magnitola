import React from 'react';
import { usePlayerStore } from '../../state/playerStore';
import { useSettingsStore } from '../../state/settingsStore';
import { LOCALES } from '../../localization/locales';
import { TrackItem } from './TrackItem';
import { LibraryTrack } from '@shared/types/player';

export const TrackList: React.FC = () => {
  const { tracks, currentTrack, isPlaying, playTrack } = usePlayerStore();
  const { language } = useSettingsStore();
  const L = LOCALES[language];

  if (tracks.length === 0) {
    return (
      <div className="track-list-container">
        <div className="track-list-empty">
          <p>{L.noTracksInFolder}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="track-list-container">
      {tracks.map((track: LibraryTrack) => (
        <TrackItem
          key={track.id}
          track={track}
          isActive={currentTrack?.id === track.id}
          isPlaying={isPlaying}
          onSelect={playTrack}
        />
      ))}
    </div>
  );
};
