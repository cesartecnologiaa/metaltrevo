import { useCallback, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = "/login" } = options ?? {};
  const [location, setLocation] = useLocation();
  const { currentUser, userData, loading, signOut } = useAuthContext();

  const logout = useCallback(async () => {
    await signOut();
    setLocation(redirectPath);
  }, [redirectPath, setLocation, signOut]);

  const state = useMemo(() => {
    const user = currentUser && userData
      ? {
          id: userData.uid,
          uid: userData.uid,
          email: userData.email,
          name: userData.name,
          role: userData.role,
        }
      : null;

    localStorage.setItem("manus-runtime-user-info", JSON.stringify(user));

    return {
      user,
      loading,
      error: null,
      isAuthenticated: Boolean(user),
    };
  }, [currentUser, userData, loading]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (loading) return;
    if (state.user) return;
    if (location === redirectPath) return;
    setLocation(redirectPath);
  }, [loading, location, redirectOnUnauthenticated, redirectPath, setLocation, state.user]);

  return {
    ...state,
    refresh: async () => state.user,
    logout,
  };
}
