import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      accessToken: null,

      setSession: ({ user, accessToken }) => set({ user, accessToken }),

      logout: () => set({ user: null, accessToken: null }),
    }),
    { name: 'rent-electro-auth' },
  ),
)
