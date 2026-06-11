import { create } from 'zustand'

export const useAppStore = create((set) => ({
  activeModule: 'fund',
  setActiveModule: (module) => set({ activeModule: module }),
  chatOpen: false,
  setChatOpen: (open) => set({ chatOpen: open }),
  darkMode: false,
  toggleDarkMode: () => set((state) => {
    const next = !state.darkMode
    const root = document.documentElement
    if (next) {
      root.classList.add('dark')
      root.style.colorScheme = 'dark'
    } else {
      root.classList.remove('dark')
      root.style.colorScheme = 'light'
    }
    localStorage.setItem('darkMode', next)
    return { darkMode: next }
  }),
  initDarkMode: () => {
    const saved = localStorage.getItem('darkMode') === 'true'
    const root = document.documentElement
    if (saved) {
      root.classList.add('dark')
      root.style.colorScheme = 'dark'
    }
    set({ darkMode: saved })
  }
}))
