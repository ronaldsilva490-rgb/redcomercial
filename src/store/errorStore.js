import { create } from 'zustand'

const useErrorStore = create((set, get) => ({
  error: null,
  isVisible: false,

  setError: (error, showModal = true) => {
    console.error('【ERROR】', error)
    set({ error, isVisible: showModal })
  },

  clearError: () => set({ error: null, isVisible: false }),

  showError: (error) => {
    set({ error, isVisible: true })
  },

  hideError: () => set({ isVisible: false }),
}))

export default useErrorStore
