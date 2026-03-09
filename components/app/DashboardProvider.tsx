"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

export interface Baby {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
  birthWeightGrams: number | null;
}

export interface AppSettings {
  units: "metric" | "imperial";
  formulaOnly: boolean;
  enabledActivities: string[];
}

const DEFAULT_SETTINGS: AppSettings = {
  units: "metric",
  formulaOnly: false,
  enabledActivities: ["feeding", "diaper", "sleep", "medication", "milestones"],
};

const ACTIVE_BABY_KEY = "babystep-active-baby";

interface DashboardContextValue {
  babies: Baby[];
  activeBaby: Baby | null;
  setActiveBaby: (baby: Baby) => void;
  settings: AppSettings;
  patchSettings: (patch: Partial<AppSettings>) => Promise<void>;
}

const DashboardContext = createContext<DashboardContextValue>({
  babies: [],
  activeBaby: null,
  setActiveBaby: () => {},
  settings: DEFAULT_SETTINGS,
  patchSettings: async () => {},
});

interface DashboardProviderProps {
  babies: Baby[];
  children: React.ReactNode;
}

export function DashboardProvider({ babies: initialBabies, children }: DashboardProviderProps) {
  const [babies, setBabies] = useState<Baby[]>(initialBabies);
  const [activeBaby, setActiveBabyState] = useState<Baby | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Resolve active baby from localStorage on mount
  useEffect(() => {
    if (babies.length === 0) return;
    const storedId = localStorage.getItem(ACTIVE_BABY_KEY);
    const found = babies.find((b) => b.id === storedId) ?? babies[0];
    setActiveBabyState(found);
  }, [babies]);

  // Refetch babies when settings page archives/unarchives/deletes one
  useEffect(() => {
    function reload() {
      fetch("/api/babies")
        .then((r) => r.json())
        .then((list: Baby[]) => {
          setBabies(list);
          // If active baby was archived/deleted, reset to first remaining
          setActiveBabyState((prev) => {
            if (!prev) return list[0] ?? null;
            const still = list.find((b) => b.id === prev.id);
            return still ?? list[0] ?? null;
          });
        })
        .catch(() => {});
    }
    window.addEventListener("babystep-babies-updated", reload);
    return () => window.removeEventListener("babystep-babies-updated", reload);
  }, []);

  // Fetch app settings
  useEffect(() => {
    fetch("/api/app-settings")
      .then((r) => r.json())
      .then((data: AppSettings) => setSettings(data))
      .catch(() => {});
  }, []);

  const setActiveBaby = useCallback((baby: Baby) => {
    setActiveBabyState(baby);
    localStorage.setItem(ACTIVE_BABY_KEY, baby.id);
  }, []);

  const patchSettings = useCallback(async (patch: Partial<AppSettings>) => {
    const updated = { ...settings, ...patch };
    setSettings(updated); // optimistic update
    try {
      const res = await fetch("/api/app-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const saved: AppSettings = await res.json();
      setSettings(saved);
    } catch {
      setSettings(settings); // revert on error
    }
  }, [settings]);

  return (
    <DashboardContext.Provider value={{ babies, activeBaby, setActiveBaby, settings, patchSettings }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  return useContext(DashboardContext);
}

export function useActiveBaby() {
  const { activeBaby } = useContext(DashboardContext);
  return activeBaby;
}
