import { create } from 'zustand';
import { AppSettings, SupportedLanguage } from '@shared/types/settings';

interface SettingsState extends AppSettings {
  isInitialized: boolean;
  initSettings: () => Promise<void>;
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  toggleSidebar: () => Promise<void>;
  selectDownloadFolder: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  downloadFolder: '',
  language: 'en',
  isSidebarOpen: false,
  isInitialized: false,

  initSettings: async () => {
    try {
      const settings = await window.electronAPI.settings.get();
      set({
        ...settings,
        isInitialized: true
      });
    } catch (err) {
      console.error('Failed to initialize settings:', err);
      set({ isInitialized: true });
    }
  },

  setLanguage: async (language: SupportedLanguage) => {
    set({ language });
    try {
      await window.electronAPI.settings.update({ language });
    } catch (err) {
      console.error('Failed to persist language setting:', err);
    }
  },

  toggleSidebar: async () => {
    const nextState = !get().isSidebarOpen;
    set({ isSidebarOpen: nextState });
    try {
      await window.electronAPI.settings.update({ isSidebarOpen: nextState });
    } catch (err) {
      console.error('Failed to persist sidebar state:', err);
    }
  },

  selectDownloadFolder: async () => {
    try {
      const result = await window.electronAPI.settings.selectFolder();
      if (result) {
        set({ downloadFolder: result.path });
      }
    } catch (err) {
      console.error('Failed to select folder:', err);
    }
  }
}));
