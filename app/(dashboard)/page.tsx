"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Milk, Baby, Moon, Pill, Star, Plus } from "lucide-react";
import { formatDistanceToNow } from "@/lib/time";
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

interface LastSleep {
  startTime: string;
  endTime: string | null;
}

interface DashboardData {
  lastFeeding: LastFeeding | null;
  lastDiaper: LastDiaper | null;
  lastSleep: LastSleep | null;
  isSleeping: boolean;
}

const ALL_QUICK_ACTIONS = [
  { key: "feeding", href: "/feeding", icon: Milk, label: "Feeding", color: "text-amber-500" },
  { key: "diaper", href: "/diaper", icon: Baby, label: "Diaper", color: "text-sky-500" },
  { key: "sleep", href: "/sleep", icon: Moon, label: "Sleep", color: "text-violet-500" },
  { key: "medication", href: "/medication", icon: Pill, label: "Medication", color: "text-rose-500" },
  { key: "milestones", href: "/milestones", icon: Star, label: "Milestone", color: "text-yellow-500" },
];

export default function HomePage() {
  const { activeBaby, settings } = useDashboard();
  const { enabledActivities, units } = settings;

  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    if (!activeBaby) return;
    const babyId = activeBaby.id;
    Promise.all([
      fetch(`/api/feedings?babyId=${babyId}&limit=1`).then((r) => r.json()),
      fetch(`/api/diapers?babyId=${babyId}&limit=1`).then((r) => r.json()),
      fetch(`/api/sleeps?babyId=${babyId}&limit=1`).then((r) => r.json()),
    ]).then(([feedings, diapers, sleeps]) => {
      const lastSleep = sleeps[0] ?? null;
      setData({
        lastFeeding: feedings[0] ?? null,
        lastDiaper: diapers[0] ?? null,
        lastSleep,
        isSleeping: lastSleep ? !lastSleep.endTime : false,
      });
    }).catch(() => {});
  }, [activeBaby]);

  const quickActions = ALL_QUICK_ACTIONS.filter((a) => enabledActivities.includes(a.key));

  if (!activeBaby) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5 max-w-lg mx-auto">
      {/* Greeting */}
      <div className="pt-2">
        <p className="text-muted-foreground text-sm">Today</p>
        <h2 className="text-2xl font-bold">
          {activeBaby.firstName}&apos;s Day
        </h2>
      </div>

      {/* Status cards — only enabled activities */}
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
      </div>

      {/* Quick actions — filtered by enabled activities */}
      {quickActions.length > 0 && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-3">Quick Log</p>
          <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${quickActions.length}, minmax(0, 1fr))` }}>
            {quickActions.map(({ href, icon: Icon, label, color }) => (
              <Link key={href} href={href}>
                <div className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-card border border-border/60 hover:bg-accent/30 transition-colors active:scale-95">
                  <Icon size={24} className={color} />
                  <span className="text-[10px] text-muted-foreground font-medium leading-tight text-center">
                    {label}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
