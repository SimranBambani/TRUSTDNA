"use client";

import { create } from "zustand";
import type { UserProfile } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// Auth Store (Zustand)
// ─────────────────────────────────────────────────────────────────────────────

interface AuthState {
  user:          UserProfile | null;
  isLoading:     boolean;
  isHydrated:    boolean;
  setUser:       (user: UserProfile | null) => void;
  setIsLoading:  (loading: boolean) => void;
  setHydrated:   () => void;
  clearAuth:     () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user:         null,
  isLoading:    true,
  isHydrated:   false,
  setUser:      (user) => set({ user }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setHydrated:  () => set({ isHydrated: true }),
  clearAuth:    () => set({ user: null, isLoading: false }),
}));
