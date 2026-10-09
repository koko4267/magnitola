import React from 'react';
import { usePlayerStore } from '../../state/playerStore';

export const LargeAlbumArt: React.FC = () => {
  const { currentTrack } = usePlayerStore();

  // Hide completely until a track actually starts playing
  if (!currentTrack) {
    return null;
  }

  return (
    <div className="large-art-container">
      <div className="large-art-box">
        {currentTrack.artworkDataUrl ? (
          <img
            src={currentTrack.artworkDataUrl}
            alt={currentTrack.title}
            className="large-art-img"
          />
        ) : (
          <div className="large-art-placeholder">
            <span className="large-art-placeholder-icon">♫</span>
            <span className="large-art-placeholder-label">NO ARTWORK</span>
          </div>
        )}
      </div>

      <div className="large-art-details">
        <div className="large-art-title" title={currentTrack.title}>
          {currentTrack.title}
        </div>
        <div className="large-art-artist" title={currentTrack.artist}>
          {currentTrack.artist}
        </div>
      </div>
    </div>
  );
};
