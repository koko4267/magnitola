import React, { useState, useEffect } from 'react';
import { usePlayerStore } from '../../state/playerStore';
import { useSettingsStore } from '../../state/settingsStore';
import { LOCALES } from '../../localization/locales';

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const PlayerControls: React.FC = () => {
  const {
    tracks,
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    togglePlay,
    nextTrack,
    prevTrack,
    seek
  } = usePlayerStore();
  const { language } = useSettingsStore();
  const L = LOCALES[language];

  const totalDuration = duration > 0 ? duration : (currentTrack?.duration || 0);

  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);

  // Sync dragTime when not dragging
  useEffect(() => {
    if (!isDragging) {
      setDragTime(currentTime);
    }
  }, [currentTime, isDragging]);

  // Window-level mouseup/touchend ensures dragging state never gets stuck if mouse leaves the input
  useEffect(() => {
    if (!isDragging) return;

    const onGlobalRelease = () => {
      setIsDragging(false);
      seek(dragTime);
    };

    window.addEventListener('mouseup', onGlobalRelease);
    window.addEventListener('touchend', onGlobalRelease);

    return () => {
      window.removeEventListener('mouseup', onGlobalRelease);
      window.removeEventListener('touchend', onGlobalRelease);
    };
  }, [isDragging, dragTime, seek]);

  const handleSeekInput = (e: React.FormEvent<HTMLInputElement>) => {
    const val = parseFloat((e.target as HTMLInputElement).value);
    if (Number.isFinite(val)) {
      setDragTime(val);
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!Number.isFinite(val)) return;
    setDragTime(val);
    if (!isDragging) {
      seek(val);
    }
  };

  const handleSeekStart = () => {
    setIsDragging(true);
  };

  const handleSeekEnd = (e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
    setIsDragging(false);
    const val = parseFloat((e.target as HTMLInputElement).value);
    if (Number.isFinite(val)) {
      seek(val);
    }
  };

  const displayTime = isDragging ? dragTime : currentTime;
  const progressPercent = totalDuration > 0 ? Math.min(100, (displayTime / totalDuration) * 100) : 0;

  const hasTracks = tracks.length > 0;

  return (
    <div className="player-controls-panel">
      {/* Playback Buttons Row */}
      <div className="player-buttons-row">
        <div className="playback-btn-group">
          <button
            className="btn playback-btn"
            onClick={prevTrack}
            title="Previous track"
            disabled={!hasTracks}
          >
            |◀
          </button>
          <button
            className="btn btn-primary playback-btn"
            onClick={togglePlay}
            title={isPlaying ? L.paused : L.playing}
            disabled={!hasTracks}
          >
            {isPlaying ? '❚❚' : '▶'}
          </button>
          <button
            className="btn playback-btn"
            onClick={nextTrack}
            title="Next track"
            disabled={!hasTracks}
          >
            ▶|
          </button>
        </div>
      </div>

      {/* Seek / Progress Bar Row */}
      <div className="player-seek-container">
        <div className="seek-bar-track-wrapper">
          <div
            className="retro-seek-fill"
            style={{ width: `${progressPercent}%` }}
          />
          <input
            type="range"
            className="retro-seek-input"
            min={0}
            max={totalDuration > 0 ? totalDuration : 1}
            step={0.1}
            value={totalDuration > 0 ? displayTime : 0}
            onInput={handleSeekInput}
            onChange={handleSeekChange}
            onMouseDown={handleSeekStart}
            onMouseUp={handleSeekEnd}
            onTouchStart={handleSeekStart}
            onTouchEnd={handleSeekEnd}
            disabled={!currentTrack || totalDuration <= 0}
            title="Drag or click to seek"
          />
        </div>

        <div className="seek-time-row">
          <span>{formatTime(displayTime)}</span>
          <span>{formatTime(totalDuration)}</span>
        </div>
      </div>
    </div>
  );
};
