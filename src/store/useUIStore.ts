import { create } from 'zustand';

interface UIState {
  isGestionOpen: boolean;
  setIsGestionOpen: (open: boolean) => void;
  toggleGestionOpen: () => void;
  isQAModalOpen: boolean;
  setIsQAModalOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isGestionOpen: false,
  setIsGestionOpen: (open) => set({ isGestionOpen: open }),
  toggleGestionOpen: () => set((state) => ({ isGestionOpen: !state.isGestionOpen })),
  isQAModalOpen: false,
  setIsQAModalOpen: (open) => set({ isQAModalOpen: open }),
}));
