# MAGNITOLA

Десктопное приложение для загрузки музыки с сервиса **SoundCloud** и встроенный автономный аудиоплеер. Разработано на базе **TypeScript**, **Electron**, **React** и **Vite**.

Desktop application for downloading music from **SoundCloud** and offline audio player. Built with **TypeScript**, **Electron**, **React**, and **Vite**.

---

## Языки / Languages

- [Русский](#русский)
- [English](#english)

---

<a name="русский"></a>
## Русский

### 1. Назначение

MAGNITOLA предназначена для загрузки аудиозаписей с платформы SoundCloud на локальный диск пользователя с автоматическим извлечением метаданных, генерацией ID3v2.3 тегов и встраиванием обложек. Программа также содержит встроенный плеер для локального воспроизведения скачанных треков.

### 2. Загрузка с SoundCloud

#### Поддерживаемые форматы ссылок
- **Отдельные треки**: `https://soundcloud.com/artist-name/track-name`
- **Плейлисты и сеты**: `https://soundcloud.com/artist-name/sets/playlist-name`
- **Альбомы**: `https://soundcloud.com/artist-name/sets/album-name`
- **Избранное пользователя (лайки)**: `https://soundcloud.com/artist-name/likes`
- **Мобильные короткие ссылки**: `https://on.soundcloud.com/xxxx`
- **Ссылки без указания протокола**: `soundcloud.com/artist-name/track-name`

#### Механизм работы загрузчика
1. **Разрешение ссылки**: адрес разрешается через API SoundCloud (`api-v2.soundcloud.com/resolve`). При передаче коротких ссылок `on.soundcloud.com` выполняется автоматическое раскрытие HTTP-редиректа.
2. **Выбор аудиопотока**:
   - Приоритет отдается прямому прогрессивному потоку MP3 (`audio/mpeg`, 128 kbps).
   - В случае отсутствия прямого MP3 используется поток HLS MP3.
   - Предусмотрен отказоустойчивый перебор кандидатов транскодирования при сбоях отдельных CDN-эндпоинтов SoundCloud.
3. **Обработка в оперативной памяти**: потоковые данные аудио и обложки скачиваются непосредственно в память без записи промежуточных данных во временные системные папки (`%TEMP%` / `/tmp`).
4. **Тегирование ID3v2.3**:
   - Название трека (титр `TIT2`).
   - Исполнитель (титр `TPE1`).
   - Встроенная обложка альбома (титр `APIC`, JPEG/PNG, 500x500).
5. **Предотвращение дубликатов**: перед загрузкой проверяется наличие файла с аналогичным именем в целевой папке; уже существующие треки пропускаются без повторной загрузки.
6. **Атомарная запись**: итоговый файл сохраняется напрямую в выбранную пользователем папку загрузок.

### 3. Встроенный аудиоплеер

- **Автоматическая индексация**: при запуске приложение сканирует выбранную папку загрузок и строит локальную библиотеку треков.
- **Поддерживаемые форматы воспроизведения**: `.mp3`, `.wav`, `.flac`, `.ogg`, `.m4a`.
- **Потоковый протокол `media://`**: использует протокол со стандартом RFC 7233 (HTTP 206 Partial Content), что обеспечивает мгновенную перемотку файлов любого размера без предварительного чтения файла целиком.
- **Интерфейс воспроизведения**:
   - Кнопки управления («Предыдущий», «Воспроизведение/Пауза», «Следующий»).
   - Интерактивный регулятор перемотки (seek bar) с индикацией текущего времени и общей длительности.
   - Окно крупной обложки активного трека.
   - Список треков с метаданными и длительностью.
   - Циклический переход к следующему треку по окончании текущего.

### 4. Автономность и отсутствие следов в системе

- **Портативный режим**: приложение не требует установки, не создает записей в системном реестре Windows и не регистрирует фоновых служб.
- **Отключение дисковых кэшей Chromium**: запуск с параметрами `--disable-http-cache` и `--disable-gpu-shader-disk-cache` предотвращает накопление кэш-файлов браузерного движка на жестком диске.
- **Очистка данных сессии**: при закрытии приложения вызывается принудительная очистка данных сессии (`clearCache`, `clearStorageData`).
- **Изоляция конфигурации**: файл настроек (`magnitola-settings.json`) сохраняет исключительно выбранную папку загрузок, язык интерфейса и состояние боковой панели.

### 5. Архитектура и безопасность

- **Многопроцессная модель Electron**:
  - `Main Process`: сетевые запросы к API SoundCloud, запись файлов на диск, регистрация кастомного протокола `media://`, системные диалоги выбора папок.
  - `Preload Script`: строго ограниченный, типизированный интерфейс `electronAPI` через `contextBridge`.
  - `Renderer Process`: графический интерфейс на React с изолированным контекстом (`contextIsolation: true`, `nodeIntegration: false`).
- **Политика безопасности контента (CSP)**: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: media: https:; media-src 'self' media: data:;`.

### 6. Системные требования

- **Node.js**: версия 20.0.0 или выше.
- **npm**: версия 10.0.0 или выше.
- **Поддерживаемые ОС**: Windows 10/11 (x64), Linux (x64), macOS 11+ (x64 / arm64).

### 7. Команды проекта

```bash
# Установка зависимостей
npm install

# Запуск в режиме разработки с HMR
npm run dev

# Проверка типов TypeScript (Node + Web)
npm run typecheck

# Запуск набора модульных тестов Vitest
npm test

# Сборка продакшн-бандла
npm run build

# Сборка portable .exe для Windows
npm run build:win

# Сборка AppImage для Linux
npm run build:linux

# Сборка DMG для macOS
npm run build:mac

# Сборка для всех платформ
npm run build:all
```

---

<a name="english"></a>
## English

### 1. Purpose

MAGNITOLA is a standalone desktop application designed to download audio tracks from the SoundCloud platform directly to the local filesystem with automatic metadata extraction, ID3v2.3 tag writing, and artwork embedding. It includes an integrated local audio player for offline playback.

### 2. SoundCloud Downloading

#### Supported URL Formats
- **Individual Tracks**: `https://soundcloud.com/artist-name/track-name`
- **Playlists & Sets**: `https://soundcloud.com/artist-name/sets/playlist-name`
- **Albums**: `https://soundcloud.com/artist-name/sets/album-name`
- **User Likes**: `https://soundcloud.com/artist-name/likes`
- **Mobile Short Links**: `https://on.soundcloud.com/xxxx`
- **URLs without Protocol**: `soundcloud.com/artist-name/track-name`

#### Ingestion Workflow
1. **URL Resolution**: The URL is resolved via the SoundCloud API (`api-v2.soundcloud.com/resolve`). When an `on.soundcloud.com` short link is provided, HTTP redirects are followed automatically.
2. **Audio Stream Selection**:
   - Progressive MP3 streams (`audio/mpeg`, 128 kbps) are prioritized.
   - If progressive MP3 is unavailable, HLS MP3 streams are selected.
   - An automatic fallback traversal mechanism tests candidate stream endpoints sequentially if a specific CDN URL returns an error.
3. **In-Memory Streaming**: Audio chunks and album covers are downloaded into memory buffers without creating unmanaged temporary files in system directories (`%TEMP%` / `/tmp`).
4. **ID3v2.3 Tagging**:
   - Track title (`TIT2` frame).
   - Artist name (`TPE1` frame).
   - High-resolution album artwork (`APIC` frame, JPEG/PNG, 500x500).
5. **Deduplication**: Files with matching filenames in the destination folder are detected and skipped to avoid duplicate downloads.
6. **Atomic File Persistence**: Finished audio data is written directly to the user-selected destination directory.

### 3. Integrated Audio Player

- **Automatic Library Discovery**: On launch, the player indexes audio files located in the configured download folder.
- **Supported Audio Formats**: `.mp3`, `.wav`, `.flac`, `.ogg`, `.m4a`.
- **Custom `media://` Protocol**: Supports RFC 7233 byte-range requests (HTTP 206 Partial Content), enabling instantaneous seek bar scrubbing without buffering entire audio files into memory.
- **Controls & Interface**:
  - Playback controls (Previous, Play/Pause, Next).
  - Scrub bar with current position and total duration display.
  - Large album artwork display for the currently active track.
  - Track list displaying titles, artists, and durations.
  - Sequential cyclic playback queue.

### 4. Privacy & System Non-Intrusiveness

- **Portable Operation**: The application runs portably without requiring administrative installation, registry modifications, or background daemon services.
- **Disabled Disk Caching**: Chromium runtime flags `--disable-http-cache` and `--disable-gpu-shader-disk-cache` are enforced to prevent cache accumulation on disk.
- **Session Cleanup**: Session caches and storage entries are flushed on application exit (`clearCache`, `clearStorageData`).
- **Isolated Settings Storage**: Configuration (`magnitola-settings.json`) only retains user preferences: download directory path, UI language, and sidebar state.

### 5. Architecture & Security

- **Multi-Process Architecture**:
  - `Main Process`: Handles SoundCloud API communication, file writes, custom protocol registration, and native folder dialogs.
  - `Preload Script`: Exposes a secure, strictly-typed `electronAPI` bridge via `contextBridge`.
  - `Renderer Process`: React user interface running in a sandboxed context (`contextIsolation: true`, `nodeIntegration: false`).
- **Content Security Policy (CSP)**: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: media: https:; media-src 'self' media: data:;`.

### 6. System Requirements

- **Node.js**: version 20.0.0 or higher.
- **npm**: version 10.0.0 or higher.
- **Supported Operating Systems**: Windows 10/11 (x64), Linux (x64), macOS 11+ (x64 / arm64).

### 7. Commands

```bash
# Install dependencies
npm install

# Start development server with HMR
npm run dev

# Run TypeScript type check (Node + Web)
npm run typecheck

# Run Vitest test suite
npm test

# Build production bundle
npm run build

# Build portable Windows executable (.exe)
npm run build:win

# Build Linux AppImage
npm run build:linux

# Build macOS DMG
npm run build:mac

# Build for all platforms
npm run build:all
```

---

## License

[MIT](LICENSE)
