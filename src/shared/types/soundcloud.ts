export interface SoundcloudTranscoding {
  url: string;
  preset: string;
  duration: number;
  snipped: boolean;
  format: {
    protocol: 'progressive' | 'hls';
    mime_type: string;
  };
  quality: string;
}

export interface SoundcloudUser {
  id: number;
  username: string;
  avatar_url: string | null;
}

export interface SoundcloudTrack {
  id: number;
  title: string;
  artwork_url: string | null;
  track_authorization?: string;
  user?: SoundcloudUser;
  media?: {
    transcodings: SoundcloudTranscoding[];
  };
}

export interface SoundcloudPlaylist {
  id: number;
  kind: 'playlist';
  title: string;
  tracks: Array<SoundcloudTrack | { id: number }>;
}

export interface SoundcloudUserProfile {
  id: number;
  kind: 'user';
  username: string;
}

export interface SoundcloudLikesResponse {
  collection: Array<{
    track?: SoundcloudTrack;
  }>;
  next_href?: string | null;
}
