"use client";

import { useEffect, useRef } from "react";
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

  const hasLoaded = useRef(false);

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    const loadUser = async () => {
      try {
        console.log("Checking auth...");

        const res = await api.get("/auth/me");

        console.log("User loaded:", res.data);

        setUser(res.data);
      } catch (error: any) {
        console.log(
          "Auth failed:",
          error?.response?.status,
          error?.response?.data
        );

        clearUser();
      } finally {
        setAuthChecked();
      }
    };

    loadUser();
  }, []);

  return <>{children}</>;
}