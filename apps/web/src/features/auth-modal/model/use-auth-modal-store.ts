"use client";

import { create } from "zustand";

type AuthModalMode = "login" | "register";

interface AuthModalState {
  isOpen: boolean;
  mode: AuthModalMode;
  reasonMessage: string | null;
  openLogin: (reasonMessage?: string) => void;
  openRegister: (reasonMessage?: string) => void;
  setMode: (mode: AuthModalMode) => void;
  close: () => void;
}

export const useAuthModalStore = create<AuthModalState>((set) => ({
  isOpen: false,
  mode: "login",
  reasonMessage: null,
  openLogin: (reasonMessage) =>
    set({ isOpen: true, mode: "login", reasonMessage: reasonMessage ?? null }),
  openRegister: (reasonMessage) =>
    set({ isOpen: true, mode: "register", reasonMessage: reasonMessage ?? null }),
  setMode: (mode) => set({ mode }),
  close: () => set({ isOpen: false, reasonMessage: null }),
}));
