export interface LocaleDictionary {
  urlPrompt: string;
  placeholder: string;
  currentStatus: string;
  saveLocation: string;
  saveFolderDefault: string;
  paste: string;
  startDownload: string;
  stopDownload: string;
  waitingInput: string;
  ready: string;
  resolvingUrl: string;
  downloading: string;
  alreadyExists: string;
  finished: string;
  failed: string;
  emptyUrlError: string;
  invalidUrlError: string;
  noTracksFound: string;
  trackPrefix: string;
  fromWord: string;
  browse: string;
  player: string;
  playerTitle: string;
  noTracksInFolder: string;
  playing: string;
  paused: string;
  quotes: string[];
}

export const LOCALES: Record<'en' | 'ru', LocaleDictionary> = {
  en: {
    urlPrompt: 'Paste link:',
    placeholder: 'Link to profile, track, playlist, album',
    currentStatus: 'Current download:',
    saveLocation: 'Save folder: ',
    saveFolderDefault: 'Downloads',
    paste: 'Paste',
    startDownload: 'Download',
    stopDownload: 'Stop',
    waitingInput: 'Waiting for link input...',
    ready: 'Ready to download',
    resolvingUrl: 'Resolving link...',
    downloading: 'Downloading track...',
    alreadyExists: 'Already exists',
    finished: 'Download finished!',
    failed: 'Download failed',
    emptyUrlError: 'Error: No link provided.',
    invalidUrlError: 'Unsupported link. Please provide a profile, track, playlist, or album link.',
    noTracksFound: 'No tracks found for download.',
    trackPrefix: 'Track',
    fromWord: 'of',
    browse: 'Browse...',
    player: 'Player',
    playerTitle: 'MAGNITOLA PLAYER',
    noTracksInFolder: 'No MP3 files found in folder.',
    playing: 'Playing',
    paused: 'Paused',
    quotes: [
      'God invented computers',
      'Do you want to play a horror game?',
      'If I support ******* if I respect ******* then what am I? ****** or something?',
      'my mac my mac is rendering dota right now',
      'I learned a .NET framework',
      'wheel of death'
    ]
  },
  ru: {
    urlPrompt: 'Вставьте ссылку:',
    placeholder: 'Ссылка на профиль, трек, плейлист, альбом',
    currentStatus: 'Текущая загрузка:',
    saveLocation: 'Папка сохранения: ',
    saveFolderDefault: 'Загрузки',
    paste: 'Вставить',
    startDownload: 'Скачать',
    stopDownload: 'Стоп',
    waitingInput: 'Ожидание ввода ссылки...',
    ready: 'Готов к загрузке',
    resolvingUrl: 'Определение ссылки...',
    downloading: 'Скачивание трека...',
    alreadyExists: 'Уже существует',
    finished: 'Загрузка завершена!',
    failed: 'Ошибка скачивания',
    emptyUrlError: 'Ошибка: ссылка не указана.',
    invalidUrlError: 'Неподдерживаемая ссылка. Укажите профиль, трек, плейлист или альбом.',
    noTracksFound: 'Треки для скачивания не найдены.',
    trackPrefix: 'Трек',
    fromWord: 'из',
    browse: 'Обзор...',
    player: 'Плеер',
    playerTitle: 'ПЛЕЕР MAGNITOLA',
    noTracksInFolder: 'В папке не найдены MP3 треки.',
    playing: 'Играет',
    paused: 'Пауза',
    quotes: [
      'Компьютеры придумал господь Бог',
      'Хочешь поиграть в хоррор?',
      'Если я поддерживаю ******* если я уважаю ******* то я что? ****** чтоли?',
      'мой мак мой мак сейчас монтирует доту',
      'я выучил фреймворк по дотнету',
      'колесо смерти'
    ]
  }
};
