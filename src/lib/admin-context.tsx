"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

interface AdminContextValue {
  adminKey: string | null;
  isAuthenticated: boolean;
  logout: () => void;
  refreshData: () => void;
  refreshKey: number;
}

const AdminContext = createContext<AdminContextValue>({
  adminKey: null,
  isAuthenticated: false,
  logout: () => {},
  refreshData: () => {},
  refreshKey: 0,
});

const STORAGE_KEY = "stowstack_admin_key";

export function AdminProvider({
  children,
  initialKey,
}: {
  children: React.ReactNode;
  initialKey: string | null;
}) {
  const [adminKey, setAdminKey] = useState<string | null>(initialKey);
  const [refreshKey, setRefreshKey] = useState(0);

  const logout = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
    setAdminKey(null);
  }, []);

  const refreshData = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const value = useMemo<AdminContextValue>(
    () => ({
      adminKey,
      isAuthenticated: adminKey !== null,
      logout,
      refreshData,
      refreshKey,
    }),
    [adminKey, logout, refreshData, refreshKey],
  );

  return (
    <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return ctx;
}

export { STORAGE_KEY };
