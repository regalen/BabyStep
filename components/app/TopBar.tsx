"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Settings, Moon, Milk } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/time";
import { useDashboard } from "@/components/app/DashboardProvider";

const SLEEPS_KEY = "babystep-active-sleeps";
const SLEEP_KEY_LEGACY = "babystep-active-sleep";
const FEEDINGS_KEY = "babystep-active-feedings";

interface ActiveSleep {
  id: string;
  startTime: string;
  babyId: string;
}

interface ActiveFeeding {
  startTime: string;
  babyId: string;
  side: string;
  type: string;
}

export function TopBar() {
  const { babies } = useDashboard();
  const [activeSleeps, setActiveSleeps] = useState<Record<string, ActiveSleep>>({});
  const [activeFeedings, setActiveFeedings] = useState<Record<string, ActiveFeeding>>({});
  const [tick, setTick] = useState(0);

  function loadSleeps() {
    try {
      const raw = localStorage.getItem(SLEEPS_KEY);
      if (raw) { setActiveSleeps(JSON.parse(raw)); return; }
      // Migrate old single-sleep format
      const legacy = localStorage.getItem(SLEEP_KEY_LEGACY);
      if (legacy) {
        const old = JSON.parse(legacy) as ActiveSleep;
        const migrated: Record<string, ActiveSleep> = { [old.babyId]: old };
        localStorage.setItem(SLEEPS_KEY, JSON.stringify(migrated));
        localStorage.removeItem(SLEEP_KEY_LEGACY);
        setActiveSleeps(migrated);
      } else {
        setActiveSleeps({});
      }
    } catch {
      setActiveSleeps({});
    }
  }

  function loadFeedings() {
    try {
      const raw = localStorage.getItem(FEEDINGS_KEY);
      setActiveFeedings(raw ? JSON.parse(raw) : {});
    } catch {
      setActiveFeedings({});
    }
  }

  useEffect(() => {
    loadSleeps();
    loadFeedings();

    function onStorage(e: StorageEvent) {
      if (e.key === SLEEPS_KEY || e.key === SLEEP_KEY_LEGACY) loadSleeps();
      if (e.key === FEEDINGS_KEY) loadFeedings();
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener("babystep-sleeps-updated", loadSleeps);
    window.addEventListener("babystep-feedings-updated", loadFeedings);
    const poll = setInterval(() => { loadSleeps(); loadFeedings(); }, 5000);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("babystep-sleeps-updated", loadSleeps);
      window.removeEventListener("babystep-feedings-updated", loadFeedings);
      clearInterval(poll);
    };
  }, []);

  // Tick every second to keep elapsed times fresh
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const sleepEntries = Object.values(activeSleeps);
  const feedingEntries = Object.values(activeFeedings);
  const multiBaby = babies.length > 1;

  function babyLabel(babyId: string, elapsed: number) {
    const baby = babies.find((b) => b.id === babyId);
    return multiBaby && baby
      ? `${baby.firstName} · ${formatDuration(elapsed)}`
      : formatDuration(elapsed);
  }

  return (
    <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-sm border-b border-border/60">
      <div className="flex items-center h-14 px-4">
        {/* Left — logo */}
        <div className="flex items-center gap-2 w-28 shrink-0">
          <span className="text-xl">👶</span>
          <h1 className="text-base font-semibold text-foreground">BabyStep</h1>
        </div>

        {/* Center — active timer pills */}
        <div className="flex-1 flex justify-center gap-2 flex-wrap">
          {feedingEntries.map((feeding) => {
            const elapsed = Date.now() - new Date(feeding.startTime).getTime();
            return (
              <Link
                key={feeding.babyId}
                href={`/feeding?babyId=${feeding.babyId}`}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-colors"
              >
                <Milk size={12} className="animate-pulse" />
                {babyLabel(feeding.babyId, elapsed)}
              </Link>
            );
          })}
          {sleepEntries.map((sleep) => {
            const elapsed = Date.now() - new Date(sleep.startTime).getTime();
            return (
              <Link
                key={sleep.babyId}
                href={`/sleep?babyId=${sleep.babyId}`}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-violet-500/20 text-violet-700 dark:text-violet-300 border border-violet-500/40 hover:bg-violet-500/30 transition-colors"
              >
                <Moon size={12} className="animate-pulse" />
                {babyLabel(sleep.babyId, elapsed)}
              </Link>
            );
          })}
        </div>

        {/* Right — settings */}
        <div className="w-28 shrink-0 flex justify-end">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/settings" aria-label="Settings">
              <Settings size={20} />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
