import React from 'react';
import { LargeAlbumArt } from './LargeAlbumArt';
import { PlayerControls } from './PlayerControls';
import { TrackList } from './TrackList';

export const PlayerSidebar: React.FC = () => {
  return (
    <div className="player-sidebar">
      <LargeAlbumArt />
      <PlayerControls />
      <TrackList />
    </div>
  );
};
