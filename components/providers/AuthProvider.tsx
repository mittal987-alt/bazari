"use client";

import { useEffect } from "react";
import api from "@/lib/api";
import { useUserStore } from "@/store/userStore";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const setUser = useUserStore((s) => s.setUser);
  const clearUser = useUserStore((s) => s.clearUser);
  const setAuthChecked = useUserStore((s) => s.setAuthChecked);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await api.get("/auth/me");
        setUser(res.data);
      } catch {
        clearUser();
      } finally {
        setAuthChecked(); // 🔥 VERY IMPORTANT
      }
    };

    loadUser();
  }, [setUser, clearUser, setAuthChecked]);

  return <>{children}</>;
}
