import { describe, it, expect, beforeEach } from 'vitest';
import { usePlayerStore } from '../src/renderer/src/state/playerStore';
import { LibraryTrack } from '../src/shared/types/player';

const mockTracks: LibraryTrack[] = [
  {
    id: '1',
    filePath: '/path/1.mp3',
    fileName: '1.mp3',
    title: 'Track One',
    artist: 'Artist A',
    duration: 120,
    hasArtwork: false,
    fileSizeBytes: 1000,
    dateModified: 100
  },
  {
    id: '2',
    filePath: '/path/2.mp3',
    fileName: '2.mp3',
    title: 'Track Two',
    artist: 'Artist B',
    duration: 180,
    hasArtwork: false,
    fileSizeBytes: 2000,
    dateModified: 200
  },
  {
    id: '3',
    filePath: '/path/3.mp3',
    fileName: '3.mp3',
    title: 'Track Three',
    artist: 'Artist C',
    duration: 240,
    hasArtwork: false,
    fileSizeBytes: 3000,
    dateModified: 300
  }
];

describe('playerStore Queue Logic', () => {
  beforeEach(() => {
    usePlayerStore.setState({
      tracks: [],
      currentTrack: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0
    });
  });

  it('should advance sequentially and wrap around', () => {
    usePlayerStore.setState({
      tracks: mockTracks,
      currentTrack: mockTracks[0],
      isPlaying: true
    });

    // Advance to next
    usePlayerStore.getState().nextTrack();
    expect(usePlayerStore.getState().currentTrack?.id).toBe('2');

    // Advance to next
    usePlayerStore.getState().nextTrack();
    expect(usePlayerStore.getState().currentTrack?.id).toBe('3');

    // Advance to next (wrap around to first)
    usePlayerStore.getState().nextTrack();
    expect(usePlayerStore.getState().currentTrack?.id).toBe('1');
  });

  it('should navigate backwards and wrap around', () => {
    usePlayerStore.setState({
      tracks: mockTracks,
      currentTrack: mockTracks[0],
      isPlaying: true
    });

    // Backward from index 0 should wrap to last track
    usePlayerStore.getState().prevTrack();
    expect(usePlayerStore.getState().currentTrack?.id).toBe('3');

    usePlayerStore.getState().prevTrack();
    expect(usePlayerStore.getState().currentTrack?.id).toBe('2');
  });

  it('should trigger seekHandler and update currentTime on seek', () => {
    let seekTarget = -1;
    usePlayerStore.getState().setSeekHandler((time: number) => {
      seekTarget = time;
    });

    usePlayerStore.getState().seek(45.5);
    expect(seekTarget).toBe(45.5);
    expect(usePlayerStore.getState().currentTime).toBe(45.5);
  });

  it('should prevent adding duplicate tracks to the library', () => {
    usePlayerStore.setState({
      tracks: [...mockTracks],
      currentTrack: mockTracks[0],
      isPlaying: false
    });

    const initialLength = usePlayerStore.getState().tracks.length;

    // Attempt to re-add existing track by id and filePath
    usePlayerStore.getState().addTrack({
      id: '2',
      filePath: '/path/2.mp3',
      fileName: '2.mp3',
      title: 'Track Two (Duplicate attempt)',
      artist: 'Artist B',
      duration: 180,
      hasArtwork: false,
      fileSizeBytes: 2000,
      dateModified: 200
    });

    // Length should remain unchanged
    expect(usePlayerStore.getState().tracks.length).toBe(initialLength);

    // Also verify case-insensitive path match prevention
    usePlayerStore.getState().addTrack({
      id: 'diff-id',
      filePath: '/PATH/2.MP3',
      fileName: '2.mp3',
      title: 'Track Two (Uppercase path)',
      artist: 'Artist B',
      duration: 180,
      hasArtwork: false,
      fileSizeBytes: 2000,
      dateModified: 200
    });
    expect(usePlayerStore.getState().tracks.length).toBe(initialLength);
  });

  it('should handle navigation when currentTrack is null or empty list', () => {
    // Empty tracks
    usePlayerStore.setState({ tracks: [], currentTrack: null });
    usePlayerStore.getState().nextTrack();
    expect(usePlayerStore.getState().currentTrack).toBeNull();
    usePlayerStore.getState().prevTrack();
    expect(usePlayerStore.getState().currentTrack).toBeNull();

    // currentTrack is null but list has tracks
    usePlayerStore.setState({ tracks: mockTracks, currentTrack: null });
    usePlayerStore.getState().nextTrack();
    expect(usePlayerStore.getState().currentTrack?.id).toBe('1');

    usePlayerStore.setState({ tracks: mockTracks, currentTrack: null });
    usePlayerStore.getState().prevTrack();
    expect(usePlayerStore.getState().currentTrack?.id).toBe('3');
  });

  it('should safely ignore non-finite seek values', () => {
    let seekTarget = -1;
    usePlayerStore.getState().setSeekHandler((time: number) => {
      seekTarget = time;
    });

    usePlayerStore.setState({ currentTime: 10 });
    usePlayerStore.getState().seek(NaN);
    expect(usePlayerStore.getState().currentTime).toBe(10);
    expect(seekTarget).toBe(-1);

    usePlayerStore.getState().seek(Infinity);
    expect(usePlayerStore.getState().currentTime).toBe(10);
    expect(seekTarget).toBe(-1);
  });

  it('should reset seekHandler to 0 on nextTrack and prevTrack even on single-track playlist', () => {
    let seekCalled = -1;
    usePlayerStore.getState().setSeekHandler((time: number) => {
      seekCalled = time;
    });

    usePlayerStore.setState({
      tracks: [mockTracks[0]],
      currentTrack: mockTracks[0],
      currentTime: 42
    });

    usePlayerStore.getState().nextTrack();
    expect(seekCalled).toBe(0);
    expect(usePlayerStore.getState().currentTime).toBe(0);
    expect(usePlayerStore.getState().currentTrack?.id).toBe('1');

    usePlayerStore.setState({ currentTime: 55 });
    seekCalled = -1;
    usePlayerStore.getState().prevTrack();
    expect(seekCalled).toBe(0);
    expect(usePlayerStore.getState().currentTime).toBe(0);
  });

  it('should update currentTrack when addTrack merges newly discovered artwork onto existing track', () => {
    const trackWithoutArt: LibraryTrack = {
      ...mockTracks[0],
      hasArtwork: false,
      artworkDataUrl: null
    };

    usePlayerStore.setState({
      tracks: [trackWithoutArt],
      currentTrack: trackWithoutArt
    });

    // Add same track with artwork
    usePlayerStore.getState().addTrack({
      ...trackWithoutArt,
      hasArtwork: true,
      artworkDataUrl: 'data:image/jpeg;base64,abc'
    });

    const current = usePlayerStore.getState().currentTrack;
    expect(current?.hasArtwork).toBe(true);
    expect(current?.artworkDataUrl).toBe('data:image/jpeg;base64,abc');
  });

  it('should correctly update tracks and preserve matching currentTrack via setTracks', () => {
    usePlayerStore.setState({
      tracks: mockTracks,
      currentTrack: mockTracks[1]
    });

    const newTracks: LibraryTrack[] = [
      { ...mockTracks[1], title: 'Track Two Updated' },
      mockTracks[2]
    ];

    usePlayerStore.getState().setTracks(newTracks);
    expect(usePlayerStore.getState().tracks.length).toBe(2);
    expect(usePlayerStore.getState().currentTrack?.title).toBe('Track Two Updated');
  });
});
