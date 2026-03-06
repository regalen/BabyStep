"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Milk, Baby, Moon, Plus, ChevronLeft } from "lucide-react";
import { formatDistanceToNow, formatAge } from "@/lib/time";
import { useDashboard } from "@/components/app/DashboardProvider";
import { formatVolume } from "@/lib/units";

interface LastFeeding {
  type: string;
  side: string | null;
  amountMl: number | null;
  startTime: string;
}

interface LastDiaper {
  type: string;
  color: string | null;
  timestamp: string;
}

interface DiaperEntry {
  type: string;
  timestamp: string;
}

interface FeedingEntry {
  amountMl: number | null;
  startTime: string;
}

interface LastSleep {
  startTime: string;
  endTime: string | null;
}

interface DashboardData {
  lastFeeding: LastFeeding | null;
  lastDiaper: LastDiaper | null;
  lastSleep: LastSleep | null;
  isSleeping: boolean;
  todayFeedingsTotal: number;
  last7DaysDiapers: DiaperEntry[];
}

function todayMidnightISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function sevenDaysAgoISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// Build 7-day diaper chart data
function buildDiaperChart(diapers: DiaperEntry[]) {
  const days: { label: string; date: string; wet: number; solid: number; both: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateKey = d.toLocaleDateString();
    const label = i === 0 ? "Today" : d.toLocaleDateString([], { weekday: "short" });
    days.push({ label, date: dateKey, wet: 0, solid: 0, both: 0 });
  }
  for (const diaper of diapers) {
    const key = new Date(diaper.timestamp).toLocaleDateString();
    const day = days.find((d) => d.date === key);
    if (!day) continue;
    if (diaper.type === "wet") day.wet++;
    else if (diaper.type === "solid") day.solid++;
    else day.both++;
  }
  return days;
}

export default function BabyDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { babies, setActiveBaby, settings } = useDashboard();
  const { enabledActivities, units } = settings;

  const baby = babies.find((b) => b.id === id) ?? null;
  const [data, setData] = useState<DashboardData | null>(null);

  // Sync active baby when user lands on this page
  useEffect(() => {
    if (baby) setActiveBaby(baby);
  }, [baby, setActiveBaby]);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/feedings?babyId=${id}&limit=1`).then((r) => r.json()),
      fetch(`/api/feedings?babyId=${id}&from=${todayMidnightISO()}&limit=200`).then((r) => r.json()),
      fetch(`/api/diapers?babyId=${id}&limit=1`).then((r) => r.json()),
      fetch(`/api/diapers?babyId=${id}&from=${sevenDaysAgoISO()}&limit=200`).then((r) => r.json()),
      fetch(`/api/sleeps?babyId=${id}&limit=1`).then((r) => r.json()),
    ]).then(([lastFeedingArr, todayFeedings, lastDiaperArr, last7Diapers, lastSleepArr]) => {
      const lastSleep = lastSleepArr[0] ?? null;
      const todayTotal = (todayFeedings as FeedingEntry[]).reduce(
        (sum, f) => sum + (f.amountMl ?? 0),
        0
      );
      setData({
        lastFeeding: lastFeedingArr[0] ?? null,
        lastDiaper: lastDiaperArr[0] ?? null,
        lastSleep,
        isSleeping: lastSleep ? !lastSleep.endTime : false,
        todayFeedingsTotal: todayTotal,
        last7DaysDiapers: last7Diapers,
      });
    }).catch(() => {});
  }, [id]);

  if (!baby) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    );
  }

  const diaperChart = data ? buildDiaperChart(data.last7DaysDiapers) : null;
  const maxDiaperCount = diaperChart
    ? Math.max(...diaperChart.map((d) => d.wet + d.solid + d.both), 1)
    : 1;

  return (
    <div className="p-4 space-y-5 max-w-lg mx-auto">
      {/* Header */}
      <div className="pt-2 flex items-center gap-3">
        <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={22} />
        </Link>
        <div>
          <h2 className="text-2xl font-bold">{baby.firstName}&apos;s Day</h2>
          <p className="text-muted-foreground text-sm">{formatAge(baby.dob)}</p>
        </div>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-1 gap-3">
        {enabledActivities.includes("feeding") && (
          <Link href="/feeding">
            <Card className="hover:bg-accent/30 transition-colors active:scale-[0.98]">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="w-11 h-11 rounded-full bg-amber-500/15 flex items-center justify-center">
                  <Milk size={22} className="text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">Last feeding</p>
                  <p className="font-semibold text-foreground">
                    {data?.lastFeeding
                      ? formatDistanceToNow(new Date(data.lastFeeding.startTime))
                      : "No feedings yet"}
                  </p>
                  {data?.lastFeeding && (
                    <p className="text-xs text-muted-foreground capitalize">
                      {data.lastFeeding.type}
                      {data.lastFeeding.side ? ` · ${data.lastFeeding.side}` : ""}
                      {data.lastFeeding.amountMl ? ` · ${formatVolume(data.lastFeeding.amountMl, units)}` : ""}
                    </p>
                  )}
                </div>
                <Plus size={18} className="text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          </Link>
        )}

        {enabledActivities.includes("diaper") && (
          <Link href="/diaper">
            <Card className="hover:bg-accent/30 transition-colors active:scale-[0.98]">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="w-11 h-11 rounded-full bg-sky-500/15 flex items-center justify-center">
                  <Baby size={22} className="text-sky-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">Last diaper</p>
                  <p className="font-semibold text-foreground">
                    {data?.lastDiaper
                      ? formatDistanceToNow(new Date(data.lastDiaper.timestamp))
                      : "No changes yet"}
                  </p>
                  {data?.lastDiaper && (
                    <p className="text-xs text-muted-foreground capitalize">
                      {data.lastDiaper.type}
                      {data.lastDiaper.color ? ` · ${data.lastDiaper.color}` : ""}
                    </p>
                  )}
                </div>
                <Plus size={18} className="text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          </Link>
        )}

        {enabledActivities.includes("sleep") && (
          <Link href="/sleep">
            <Card className="hover:bg-accent/30 transition-colors active:scale-[0.98]">
              <CardContent className="flex items-center gap-4 p-4">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center ${data?.isSleeping ? "bg-violet-500/30" : "bg-violet-500/15"}`}>
                  <Moon size={22} className={`text-violet-500 ${data?.isSleeping ? "animate-pulse" : ""}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">Sleep</p>
                  <p className="font-semibold text-foreground">
                    {data?.isSleeping
                      ? "Currently sleeping…"
                      : data?.lastSleep
                      ? `Woke ${formatDistanceToNow(new Date(data.lastSleep.endTime ?? data.lastSleep.startTime))}`
                      : "No sleep logged"}
                  </p>
                </div>
                <Plus size={18} className="text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Today's feeding total */}
        {enabledActivities.includes("feeding") && data && data.todayFeedingsTotal > 0 && (
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="w-11 h-11 rounded-full bg-amber-500/15 flex items-center justify-center">
                <Milk size={22} className="text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Today&apos;s total</p>
                <p className="font-semibold text-foreground">
                  {formatVolume(data.todayFeedingsTotal, units)}
                </p>
                <p className="text-xs text-muted-foreground">across all feedings today</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 7-day diaper chart */}
      {enabledActivities.includes("diaper") && diaperChart && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-3">Diapers — last 7 days</p>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-end gap-1 h-16">
                {diaperChart.map((day) => {
                  const total = day.wet + day.solid + day.both;
                  const barHeight = total === 0 ? 0 : Math.max(8, Math.round((total / maxDiaperCount) * 48));
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                      {total > 0 && (
                        <span className="text-[10px] text-muted-foreground leading-none">{total}</span>
                      )}
                      <div
                        className="w-full rounded-sm overflow-hidden flex flex-col-reverse"
                        style={{ height: `${barHeight}px` }}
                      >
                        {day.wet > 0 && (
                          <div
                            className="w-full bg-sky-400"
                            style={{ height: `${(day.wet / total) * barHeight}px` }}
                          />
                        )}
                        {day.solid > 0 && (
                          <div
                            className="w-full bg-amber-400"
                            style={{ height: `${(day.solid / total) * barHeight}px` }}
                          />
                        )}
                        {day.both > 0 && (
                          <div
                            className="w-full bg-violet-400"
                            style={{ height: `${(day.both / total) * barHeight}px` }}
                          />
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground leading-none">{day.label}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-3 mt-3 pt-3 border-t border-border/50">
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <span className="w-2.5 h-2.5 rounded-sm bg-sky-400 inline-block" /> Wet
                </span>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" /> Solid
                </span>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <span className="w-2.5 h-2.5 rounded-sm bg-violet-400 inline-block" /> Both
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}
