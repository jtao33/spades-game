"use client";

import { create } from "zustand";

interface SettingsState {
  cardSortOrder: "ascending" | "descending";
  spadesPosition: "left" | "right";
  setCardSortOrder: (order: "ascending" | "descending") => void;
  setSpadesPosition: (position: "left" | "right") => void;
  loadSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  cardSortOrder: "ascending",
  spadesPosition: "left",

  setCardSortOrder: (order) => set({ cardSortOrder: order }),
  setSpadesPosition: (position) => set({ spadesPosition: position }),

  loadSettings: async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        set({
          cardSortOrder: data.cardSortOrder || "ascending",
          spadesPosition: data.spadesPosition || "left",
        });
      }
    } catch {
      // Use defaults on error
    }
  },
}));
