/**
 * UI Store — manages navigation, sidebar, modals, toast, and splash screen state.
 * Replaces: activeView, targetProjectId, targetTaskId, isAIOpen, isSidebarOpen,
 *           toast, splashFinished, hidePushPrompt useState calls from App.tsx.
 */
import { create } from 'zustand';

interface Toast {
  title: string;
  message: string;
}

interface UIState {
  // Navigation
  activeView: string;
  targetProjectId: string | null;
  targetTaskId: string | null;

  // Sidebar
  isSidebarOpen: boolean;

  // AI Assistant
  isAIOpen: boolean;

  // Toast
  toast: Toast | null;

  // Splash screen
  splashFinished: boolean;

  // Push notification prompt
  hidePushPrompt: boolean;

  // Actions
  setActiveView: (view: string) => void;
  setTargetProjectId: (id: string | null) => void;
  setTargetTaskId: (id: string | null) => void;
  navigateToTask: (taskId: string) => void;
  openProject: (projectId: string) => void;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  openSidebar: () => void;
  setIsAIOpen: (open: boolean) => void;
  showToast: (toast: Toast) => void;
  clearToast: () => void;
  setSplashFinished: (finished: boolean) => void;
  setHidePushPrompt: (hide: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Initial state
  activeView: 'dashboard',
  targetProjectId: null,
  targetTaskId: null,
  isSidebarOpen: false,
  isAIOpen: false,
  toast: null,
  splashFinished: false,
  hidePushPrompt: (() => {
    try {
      const stored = window.localStorage.getItem('iris_hide_push_prompt');
      return stored !== null ? JSON.parse(stored) : false;
    } catch {
      return false;
    }
  })(),

  // Actions
  setActiveView: (view) => set({ activeView: view }),
  setTargetProjectId: (id) => set({ targetProjectId: id }),
  setTargetTaskId: (id) => set({ targetTaskId: id }),
  navigateToTask: (taskId) => set({ targetTaskId: taskId }),
  openProject: (projectId) => set({ targetProjectId: projectId, activeView: 'projects' }),
  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
  closeSidebar: () => set({ isSidebarOpen: false }),
  openSidebar: () => set({ isSidebarOpen: true }),
  setIsAIOpen: (open) => set({ isAIOpen: open }),
  showToast: (toast) => set({ toast }),
  clearToast: () => set({ toast: null }),
  setSplashFinished: (finished) => set({ splashFinished: finished }),
  setHidePushPrompt: (hide) => {
    try {
      window.localStorage.setItem('iris_hide_push_prompt', JSON.stringify(hide));
    } catch { /* ignore */ }
    set({ hidePushPrompt: hide });
  },
}));
