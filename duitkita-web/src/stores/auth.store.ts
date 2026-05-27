import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  sessionId: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string, refreshToken: string, sessionId: string) => void;
  setTokens: (token: string, refreshToken: string) => void;
  updateUser: (user: Partial<User>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      sessionId: null,
      isAuthenticated: false,

      setAuth: (user, token, refreshToken, sessionId) =>
        set({ user, token, refreshToken, sessionId, isAuthenticated: true }),

      setTokens: (token, refreshToken) =>
        set({ token, refreshToken }),

      updateUser: (updatedUser) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updatedUser } : null,
        })),

      logout: () =>
        set({
          user: null,
          token: null,
          refreshToken: null,
          sessionId: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: "duitkita-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        sessionId: state.sessionId,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
