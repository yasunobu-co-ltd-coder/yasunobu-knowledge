"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type AppUser = {
  id: string;
  name: string;
  sort_order: number;
};

type UserContextType = {
  user: AppUser | null;
  initialized: boolean;
  login: (user: AppUser) => void;
  logout: () => void;
};

const UserContext = createContext<UserContextType>({
  user: null,
  initialized: false,
  login: () => {},
  logout: () => {},
});

const STORAGE_KEY = "yasunobu-knowledge-user";

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setUser(JSON.parse(stored));
    } catch { /* ignore */ }
    setInitialized(true);
  }, []);

  const login = (u: AppUser) => {
    setUser(u);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <UserContext.Provider value={{ user, initialized, login, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
