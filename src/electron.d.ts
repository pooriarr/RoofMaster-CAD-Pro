export interface ElectronAPI {
  platform: string;
  isMac: boolean;
  version: string;
  onAppAction: (callback: (action: string, data?: any) => void) => () => void;
  sendAction: (action: string, data?: any) => void;
  openFileDialog: () => Promise<{ success: boolean; data?: string; filename?: string; canceled?: boolean }>;
  saveFileDialog: (content: string, defaultName?: string) => Promise<{ success: boolean; filePath?: string; canceled?: boolean }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
