"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Moon, Play, Square } from "lucide-react";
import { formatDuration, formatDistanceToNow, formatTime } from "@/lib/time";
import { useDashboard, type Baby } from "@/components/app/DashboardProvider";
import { BabyChipSelector } from "@/components/app/BabyChipSelector";
import { useSession } from "@/lib/auth-client";
import { ReadOnlyBanner } from "@/components/app/ReadOnlyBanner";

interface SleepEntry {
  id: string;
  startTime: string;
  endTime: string | null;
  notes: string | null;
}

const SLEEPS_KEY = "babystep-active-sleeps";
const SLEEP_KEY_LEGACY = "babystep-active-sleep";

interface ActiveSleep {
  id: string;
  startTime: string;
  babyId: string;
}

function SleepPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const isReadOnly = (session?.user as { role?: string } | undefined)?.role === "read_only";
  const { babies, activeBaby, setActiveBaby } = useDashboard();
  const [selectedBaby, setSelectedBaby] = useState<Baby | null>(null);
  const [showBabyError, setShowBabyError] = useState(false);
  const babyId = selectedBaby?.id ?? null;

  // Map of all active sleeps keyed by babyId
  const [activeSleeps, setActiveSleeps] = useState<Record<string, ActiveSleep>>({});
  const activeSleep = babyId ? (activeSleeps[babyId] ?? null) : null;

  const [elapsed, setElapsed] = useState(0);
  const [history, setHistory] = useState<SleepEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load sleep map from localStorage (with legacy migration)
  function loadSleeps(): Record<string, ActiveSleep> {
    try {
      const raw = localStorage.getItem(SLEEPS_KEY);
      if (raw) return JSON.parse(raw);
      // Migrate old single-sleep format
      const legacy = localStorage.getItem(SLEEP_KEY_LEGACY);
      if (legacy) {
        const old = JSON.parse(legacy) as ActiveSleep;
        const migrated: Record<string, ActiveSleep> = { [old.babyId]: old };
        localStorage.setItem(SLEEPS_KEY, JSON.stringify(migrated));
        localStorage.removeItem(SLEEP_KEY_LEGACY);
        return migrated;
      }
    } catch {
      // ignore
    }
    return {};
  }

  // Load sleeps on mount
  useEffect(() => {
    const sleeps = loadSleeps();
    setActiveSleeps(sleeps);
  }, []);

  // Auto-select baby from ?babyId query param once babies are loaded
  const initialBabyId = searchParams.get("babyId");
  const didAutoSelect = useRef(false);
  useEffect(() => {
    if (didAutoSelect.current || !babies.length) return;
    if (initialBabyId) {
      const baby = babies.find((b) => b.id === initialBabyId);
      if (baby) {
        setSelectedBaby(baby);
        setActiveBaby(baby);
        didAutoSelect.current = true;
        return;
      }
    }
    // Fall back to activeBaby
    if (activeBaby) {
      setSelectedBaby(activeBaby);
      didAutoSelect.current = true;
    }
  }, [babies, initialBabyId, activeBaby]);

  // Update elapsed time every second when selected baby is sleeping
  useEffect(() => {
    if (activeSleep) {
      const update = () => {
        setElapsed(Date.now() - new Date(activeSleep.startTime).getTime());
      };
      update();
      intervalRef.current = setInterval(update, 1000);
    } else {
      setElapsed(0);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeSleep]);

  // Load history for selected baby
  useEffect(() => {
    if (!babyId) return;
    fetch(`/api/sleeps?babyId=${babyId}`)
      .then((r) => r.json())
      .then(setHistory);
  }, [babyId]);

  function saveSleeps(updated: Record<string, ActiveSleep>) {
    localStorage.setItem(SLEEPS_KEY, JSON.stringify(updated));
    setActiveSleeps(updated);
    window.dispatchEvent(new CustomEvent("babystep-sleeps-updated"));
  }

  async function startSleep() {
    if (!babyId) { setShowBabyError(true); return; }
    setShowBabyError(false);
    setLoading(true);
    const startTime = new Date().toISOString();
    const res = await fetch("/api/sleeps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ babyId, startTime }),
    });
    const sleep = await res.json();
    const active: ActiveSleep = { id: sleep.id, startTime, babyId };
    saveSleeps({ ...activeSleeps, [babyId]: active });
    setLoading(false);
  }

  async function stopSleep() {
    if (!activeSleep || !babyId) return;
    setLoading(true);
    const endTime = new Date().toISOString();
    await fetch("/api/sleeps", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sleepId: activeSleep.id, endTime }),
    });
    const updated = { ...activeSleeps };
    delete updated[babyId];
    saveSleeps(updated);
    setLoading(false);
    router.push("/");
  }

  const isSleeping = !!activeSleep;

  return (
    <div className="p-4 space-y-5 max-w-lg mx-auto">
      <div className="pt-2">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Moon className="text-violet-500" size={24} />
          Sleep Tracker
        </h2>
      </div>

      {isReadOnly && <ReadOnlyBanner />}

      {/* Baby selector */}
      <BabyChipSelector
        selectedId={selectedBaby?.id ?? null}
        onSelect={(b) => { setSelectedBaby(b); setActiveBaby(b); setShowBabyError(false); }}
        showError={showBabyError}
      />

      {/* Main sleep timer card */}
      {!isReadOnly && <Card className={isSleeping ? "border-violet-500/40 shadow-lg shadow-violet-500/10" : ""}>
        <CardContent className="pt-6 pb-6 flex flex-col items-center gap-6">
          {/* Status */}
          <div className="text-center">
            {isSleeping ? (
              <>
                <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/30 mb-3">
                  <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse mr-1.5 inline-block" />
                  Sleeping
                </Badge>
                <div className="text-5xl font-mono font-bold tabular-nums text-foreground">
                  {formatDuration(elapsed)}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Started at{" "}
                  {activeSleep ? formatTime(new Date(activeSleep.startTime)) : ""}
                </p>
              </>
            ) : (
              <>
                <Moon size={48} className="text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground">Tap to start tracking sleep</p>
              </>
            )}
          </div>

          {/* Big action button */}
          <Button
            size="lg"
            className={`w-full h-16 text-xl font-bold rounded-2xl shadow-lg ${
              isSleeping
                ? "bg-destructive hover:bg-destructive/90"
                : "bg-violet-600 hover:bg-violet-700"
            }`}
            onClick={isSleeping ? stopSleep : startSleep}
            disabled={loading || !babyId}
          >
            {isSleeping ? (
              <>
                <Square className="mr-2" size={22} /> Wake Up
              </>
            ) : (
              <>
                <Play className="mr-2" size={22} /> Start Sleep
              </>
            )}
          </Button>
        </CardContent>
      </Card>}

      {/* History */}
      {history.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Recent Sleeps</h3>
          <div className="space-y-2">
            {history.slice(0, 10).map((s) => {
              const start = new Date(s.startTime);
              const end = s.endTime ? new Date(s.endTime) : null;
              const duration = end
                ? end.getTime() - start.getTime()
                : null;

              return (
                <Card key={s.id} className="border-border/50">
                  <CardContent className="flex items-center gap-3 p-3">
                    <Moon size={20} className="text-violet-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">
                        {formatTime(start)}
                        {end ? ` → ${formatTime(end)}` : " → …"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(start)}
                        {duration ? ` · ${formatDuration(duration)}` : " · ongoing"}
                      </p>
                    </div>
                    {!s.endTime && (
                      <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/30 text-xs">
                        Active
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SleepPage() {
  return (
    <Suspense>
      <SleepPageInner />
    </Suspense>
  );
}
