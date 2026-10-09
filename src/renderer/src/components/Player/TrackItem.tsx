import React from 'react';
import { LibraryTrack } from '@shared/types/player';

interface TrackItemProps {
  track: LibraryTrack;
  isActive: boolean;
  isPlaying: boolean;
  onSelect: (track: LibraryTrack) => void;
}

export const TrackItem: React.FC<TrackItemProps> = ({
  track,
  isActive,
  isPlaying,
  onSelect
}) => {
  return (
    <div
      className={`track-item-row ${isActive ? 'active' : ''}`}
      onClick={() => onSelect(track)}
      title={`${track.artist} - ${track.title}`}
    >
      <div className="track-item-art">
        {track.artworkDataUrl ? (
          <img src={track.artworkDataUrl} alt="Cover" />
        ) : (
          <span className="track-item-icon">♫</span>
        )}
      </div>

      <div className="track-item-meta">
        <div className="track-item-title">{track.title}</div>
        <div className="track-item-artist">{track.artist}</div>
      </div>

      {isActive && (
        <span className="track-item-badge">
          {isPlaying ? '▶' : '❚❚'}
        </span>
      )}
    </div>
  );
};
