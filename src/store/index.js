import { create } from 'zustand'

export const useAppStore = create((set) => ({
  activeModule: 'fund',
  setActiveModule: (module) => set({ activeModule: module }),
  chatOpen: false,
  setChatOpen: (open) => set({ chatOpen: open }),
}))
