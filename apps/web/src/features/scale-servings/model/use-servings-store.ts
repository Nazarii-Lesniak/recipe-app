"use client";

import type { UnitSystem } from "@recipes/domain";
import { create } from "zustand";

interface ServingsState {
  servingsByRecipe: Record<string, number>;
  unitSystem: UnitSystem;
  setServings: (recipeId: string, servings: number) => void;
  setUnitSystem: (system: UnitSystem) => void;
}

export const useServingsStore = create<ServingsState>((set) => ({
  servingsByRecipe: {},
  unitSystem: "metric",
  setServings: (recipeId, servings) =>
    set((state) => ({
      servingsByRecipe: {
        ...state.servingsByRecipe,
        [recipeId]: Math.max(1, Math.min(50, Math.round(servings))),
      },
    })),
  setUnitSystem: (unitSystem) => set({ unitSystem }),
}));
