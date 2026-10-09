import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import { AppSettings } from '@shared/types/settings';

const DEFAULT_SETTINGS: AppSettings = {
  downloadFolder: '',
  language: 'en',
  isSidebarOpen: false
};

export class SettingsService {
  private configPath: string;
  private currentSettings: AppSettings;

  constructor() {
    this.configPath = path.join(app.getPath('userData'), 'magnitola-settings.json');
    this.currentSettings = this.loadSettings();
  }

  private getDefaultDownloadFolder(): string {
    try {
      return app.getPath('downloads');
    } catch {
      return path.join(process.cwd(), 'Downloads');
    }
  }

  private loadSettings(): AppSettings {
    const fallbackDownloadFolder = this.getDefaultDownloadFolder();
    const defaults: AppSettings = {
      ...DEFAULT_SETTINGS,
      downloadFolder: fallbackDownloadFolder
    };

    if (!fs.existsSync(this.configPath)) {
      return defaults;
    }

    try {
      const data = fs.readFileSync(this.configPath, 'utf-8');
      const parsed = JSON.parse(data) as Partial<AppSettings>;

      const downloadFolder =
        parsed.downloadFolder && typeof parsed.downloadFolder === 'string'
          ? parsed.downloadFolder
          : fallbackDownloadFolder;

      return {
        downloadFolder,
        language: parsed.language === 'ru' ? 'ru' : 'en',
        isSidebarOpen: Boolean(parsed.isSidebarOpen)
      };
    } catch (err) {
      console.error('Failed to load settings from file, using defaults:', err);
      return defaults;
    }
  }

  public get(): AppSettings {
    // If the saved downloadFolder no longer exists on disk, check and fallback
    if (!fs.existsSync(this.currentSettings.downloadFolder)) {
      try {
        fs.mkdirSync(this.currentSettings.downloadFolder, { recursive: true });
      } catch {
        this.currentSettings.downloadFolder = this.getDefaultDownloadFolder();
      }
    }
    return { ...this.currentSettings };
  }

  public update(partial: Partial<AppSettings>): AppSettings {
    const validated: Partial<AppSettings> = {};

    if (partial.language === 'en' || partial.language === 'ru') {
      validated.language = partial.language;
    }

    if (typeof partial.isSidebarOpen === 'boolean') {
      validated.isSidebarOpen = partial.isSidebarOpen;
    }

    if (partial.downloadFolder && typeof partial.downloadFolder === 'string' && partial.downloadFolder.trim()) {
      validated.downloadFolder = partial.downloadFolder.trim();
    }

    this.currentSettings = {
      ...this.currentSettings,
      ...validated
    };
    this.saveSettings();
    return { ...this.currentSettings };
  }

  private saveSettings(): void {
    const tempPath = `${this.configPath}.tmp`;
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(tempPath, JSON.stringify(this.currentSettings, null, 2), 'utf-8');

      try {
        fs.renameSync(tempPath, this.configPath);
      } catch (renameErr) {
        // Fallback for Windows file locks (e.g. EPERM / EBUSY)
        fs.copyFileSync(tempPath, this.configPath);
        fs.unlinkSync(tempPath);
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
      try {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      } catch {}
    }
  }
}
