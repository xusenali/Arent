import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      setSession: ({ user, accessToken, refreshToken }) =>
        set({ user, accessToken, refreshToken: refreshToken ?? null }),

      setAccessToken: (accessToken) => set({ accessToken }),

      logout: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    { name: 'rent-electro-auth' },
  ),
)
