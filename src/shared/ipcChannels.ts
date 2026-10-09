export const IPC_CHANNELS = {
  // Download Operations
  DOWNLOAD_START: 'download:start',
  DOWNLOAD_STOP: 'download:stop',
  DOWNLOAD_PROGRESS: 'download:progress',
  DOWNLOAD_TRACK_COMPLETE: 'download:track-complete',
  DOWNLOAD_FINISHED: 'download:finished',
  DOWNLOAD_ERROR: 'download:error',

  // Settings & Directory Selection
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',
  SETTINGS_SELECT_FOLDER: 'settings:select-folder',

  // Library & Music Player
  LIBRARY_SCAN: 'library:scan',
  LIBRARY_TRACK_ADDED: 'library:track-added',
  LIBRARY_TRACK_DELETED: 'library:track-deleted',
  LIBRARY_GET_ARTWORK: 'library:get-artwork',

  // System Utilities
  SYSTEM_OPEN_EXTERNAL: 'system:open-external',
  SYSTEM_READ_CLIPBOARD: 'system:read-clipboard'
} as const;
