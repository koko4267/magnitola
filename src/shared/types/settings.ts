export type SupportedLanguage = 'en' | 'ru';

export interface AppSettings {
  downloadFolder: string;
  language: SupportedLanguage;
  isSidebarOpen: boolean;
}
