<p align="center">
  <img src="magnitolalogo.png" alt="MAGNITOLA" width="220" />
</p>

# MAGNITOLA

Desktop music downloader and offline player for SoundCloud built with vanilla HTML/CSS/JS and Electron.

---

## English

### Overview
MAGNITOLA is a standalone desktop application designed to download audio from SoundCloud with automatic ID3v2.3 metadata tagging, embed high-resolution artwork (500x500), and provide offline playback via a retro dual-pane interface. The entire frontend, styles, and client logic are packaged in a single `index.html` file powered by a lightweight Electron runner.

### Features
- **SoundCloud Ingestion**:
  - Individual tracks: `https://soundcloud.com/artist/track`
  - Playlists & albums: `https://soundcloud.com/artist/sets/...`
  - User profiles: `https://soundcloud.com/artist` or `.../likes` fetches the user's entire list of likes (favorites) with automated pagination.
  - Shortlinks: automatic expansion of `https://on.soundcloud.com/xxxx` redirects.
- **Audio & Tagging Engine**:
  - MP3 stream prioritization (`audio/mpeg`, 128 kbps) with HLS (`.m3u8`) segment concatenation fallback.
  - Pure JavaScript ID3v2.3 writer embedding UTF-16 text frames (`TIT2` Title, `TPE1` Artist) and `APIC` front cover art (500x500 JPEG/PNG).
  - Direct file write to system Downloads folder (`~/Downloads`) or selected custom directory.
- **Retro Audio Player**:
  - Accurate seeking and scrub bar dragging via `media://` streaming protocol supporting RFC 7233 (HTTP 206 Partial Content byte ranges).
  - Large artwork display (170x170), seek bar with elapsed/total time, playback controls (`|◀`, `▶/❚❚`, `▶|`), and track list with active playback indicators.
  - Automatic indexing of local audio files (`.mp3`, `.wav`, `.ogg`, `.flac`, `.m4a`, `.aac`) in the target directory upon startup.
- **Architecture**:
  - Single-file frontend: all styles, markup, and JavaScript live directly in `index.html`.
  - Minimal Electron launcher (`main.js`) with disabled Chromium disk caches (`--disable-http-cache`, `--disable-gpu-shader-disk-cache`).
  - Bilingual interface (English / Russian) toggled with a single click.

### Requirements
- Node.js 18 or higher
- npm 9 or higher

### Installation & Run
```bash
npm install
npm start
```

### Build Executables
```bash
# Windows (portable .exe)
npm run build:win

# Linux (AppImage)
npm run build:linux

# macOS (dmg)
npm run build:mac

# All platforms
npm run build:all
```

### Project Structure
```
magnitola/
├── index.html          # Monolithic application file (HTML layout, retro CSS, client JS)
├── main.js             # Electron main process (window lifecycle, media:// HTTP 206 handler)
├── package.json        # Project metadata and electron-builder packaging configurations
├── icon.ico            # Windows application icon
├── magnitolalogo.png   # Application logo
├── synclinelogo.png    # Syncline widget graphic asset
├── .gitignore          # Repository ignore rules
└── README.md           # Documentation
```

### License
MIT

---

## Русский

### Обзор
MAGNITOLA — автономное десктопное приложение для загрузки аудиозаписей с сервиса SoundCloud с автоматической записью метаданных ID3v2.3, встраиванием обложек высокого разрешения (500x500) и локальным воспроизведением через ретро-интерфейс. Вся визуальная часть, стили и клиентская логика содержатся в едином файле `index.html`, работающем под управлением легковесного загрузчика Electron.

### Возможности
- **Загрузка с SoundCloud**:
  - Одиночные треки: `https://soundcloud.com/artist/track`
  - Плейлисты и альбомы: `https://soundcloud.com/artist/sets/...`
  - Профили пользователей: `https://soundcloud.com/artist` или `.../likes` загружает полный список лайков (избранного) пользователя с автоматической пагинацией.
  - Короткие ссылки: автоматическое раскрытие HTTP-редиректов `https://on.soundcloud.com/xxxx`.
- **Движок аудио и тегирования**:
  - Приоритет MP3-потоков (`audio/mpeg`, 128 kbps) с отказоустойчивой склейкой сегментов HLS (`.m3u8`).
  - Чистый JavaScript-генератор ID3v2.3: запись UTF-16 текстовых фреймов (`TIT2` Название, `TPE1` Артист) и обложки `APIC` (500x500 JPEG/PNG).
  - Прямое сохранение файлов в системную папку «Загрузки» (`~/Downloads`) или выбранную директорию.
- **Встроенный ретро-плеер**:
  - Точная перемотка полосы воспроизведения через протокол `media://` со стандартом RFC 7233 (HTTP 206 Partial Content диапазон байтов).
  - Крупная обложка (170x170), полоса перемотки с индикацией текущего и общего времени, кнопки управления (`|◀`, `▶/❚❚`, `▶|`) и список треков.
  - Автоматическое сканирование локальных аудиофайлов (`.mp3`, `.wav`, `.ogg`, `.flac`, `.m4a`, `.aac`) в целевой папке при старте.
- **Архитектура**:
  - Единый файл интерфейса: все стили, разметка и JavaScript-логика находятся внутри `index.html`.
  - Минималистичный загрузчик Electron (`main.js`) с отключенным кэшированием Chromium (`--disable-http-cache`, `--disable-gpu-shader-disk-cache`).
  - Двуязычный интерфейс (русский / английский) с переключением в один клик.

### Требования
- Node.js 18 или выше
- npm 9 или выше

### Установка и запуск
```bash
npm install
npm start
```

### Сборка исполняемых файлов
```bash
# Windows (portable .exe)
npm run build:win

# Linux (AppImage)
npm run build:linux

# macOS (dmg)
npm run build:mac

# Все платформы
npm run build:all
```

### Структура проекта
```
magnitola/
├── index.html          # Монолитный файл приложения (разметка HTML, ретро-CSS, клиентский JS)
├── main.js             # Главный процесс Electron (окно, обработчик media:// HTTP 206)
├── package.json        # Метаданные проекта и конфигурация сборки electron-builder
├── icon.ico            # Иконка приложения для Windows
├── magnitolalogo.png   # Логотип приложения
├── synclinelogo.png    # Графический элемент виджета Syncline
├── .gitignore          # Правила игнорирования Git
└── README.md           # Документация
```

### Лицензия
MIT
