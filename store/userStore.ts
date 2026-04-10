import { create } from "zustand";

type User = {
  id: string;
  name: string;
  role: "buyer" | "seller" | "admin";
};

type UserState = {
  user: User | null;
  authChecked: boolean;
  setUser: (user: User) => void;
  clearUser: () => void;
  setAuthChecked: () => void;
};

export const useUserStore = create<UserState>((set) => ({
  user: null,
  authChecked: false,

  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
  setAuthChecked: () => set({ authChecked: true }),
}));
