"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Moon, Play, Square } from "lucide-react";
import { formatDuration, formatDistanceToNow, formatTime } from "@/lib/time";

interface SleepEntry {
  id: string;
  startTime: string;
  endTime: string | null;
  notes: string | null;
}

function useBabyId() {
  const [babyId, setBabyId] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/babies")
      .then((r) => r.json())
      .then((data) => setBabyId(data[0]?.id ?? null));
  }, []);
  return babyId;
}

const SLEEP_KEY = "babystep-active-sleep";

interface ActiveSleep {
  id: string;
  startTime: string;
  babyId: string;
}

export default function SleepPage() {
  const babyId = useBabyId();
  const [activeSleep, setActiveSleep] = useState<ActiveSleep | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [history, setHistory] = useState<SleepEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load persisted active sleep from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(SLEEP_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ActiveSleep;
        setActiveSleep(parsed);
      } catch {
        localStorage.removeItem(SLEEP_KEY);
      }
    }
  }, []);

  // Update elapsed time every second when sleeping
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

  // Load history
  useEffect(() => {
    if (!babyId) return;
    fetch(`/api/sleeps?babyId=${babyId}`)
      .then((r) => r.json())
      .then(setHistory);
  }, [babyId, saved]);

  async function startSleep() {
    if (!babyId) return;
    setLoading(true);
    const startTime = new Date().toISOString();
    const res = await fetch("/api/sleeps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ babyId, startTime }),
    });
    const sleep = await res.json();
    const active: ActiveSleep = { id: sleep.id, startTime, babyId };
    localStorage.setItem(SLEEP_KEY, JSON.stringify(active));
    setActiveSleep(active);
    setLoading(false);
  }

  async function stopSleep() {
    if (!activeSleep) return;
    setLoading(true);
    const endTime = new Date().toISOString();
    await fetch("/api/sleeps", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sleepId: activeSleep.id, endTime }),
    });
    localStorage.removeItem(SLEEP_KEY);
    setActiveSleep(null);
    setSaved((v) => !v);
    setLoading(false);
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

      {/* Main sleep timer card */}
      <Card className={isSleeping ? "border-violet-500/40 shadow-lg shadow-violet-500/10" : ""}>
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
      </Card>

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
