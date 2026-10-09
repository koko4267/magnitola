import { contextBridge } from 'electron';
import { api } from './api';

// Safely expose electronAPI to renderer
try {
  contextBridge.exposeInMainWorld('electronAPI', api);
} catch (error) {
  console.error('Failed to expose electronAPI via contextBridge:', error);
}
