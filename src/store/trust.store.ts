"use client";

import { create } from "zustand";
import type { TrustScoreData, TrustEventData } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// Trust Store (Zustand)
// ─────────────────────────────────────────────────────────────────────────────

interface TrustState {
  score:      TrustScoreData | null;
  events:     TrustEventData[];
  isLoading:  boolean;
  setScore:   (score: TrustScoreData | null) => void;
  setEvents:  (events: TrustEventData[]) => void;
  setLoading: (loading: boolean) => void;
}

export const useTrustStore = create<TrustState>((set) => ({
  score:      null,
  events:     [],
  isLoading:  false,
  setScore:   (score)   => set({ score }),
  setEvents:  (events)  => set({ events }),
  setLoading: (isLoading) => set({ isLoading }),
}));
