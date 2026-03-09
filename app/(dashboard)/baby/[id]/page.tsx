"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Milk, Baby, Moon, Plus, ChevronLeft, Pencil, Pill } from "lucide-react";
import { formatDistanceToNow, formatAge, formatDuration, toDatetimeLocal } from "@/lib/time";
import { useDashboard } from "@/components/app/DashboardProvider";
import { formatVolume, parseVolumeToMl, volumeLabel } from "@/lib/units";
import { useSession } from "@/lib/auth-client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LastFeeding { type: string; side: string | null; amountMl: number | null; startTime: string; }
interface LastDiaper { type: string; color: string | null; timestamp: string; }
interface DiaperEntry { type: string; timestamp: string; }
interface FeedingEntry { amountMl: number | null; startTime: string; }
interface LastSleep { startTime: string; endTime: string | null; }

interface ActivityFeeding {
  kind: "feeding"; id: string; type: string; side: string | null; amountMl: number | null;
  startTime: string; endTime: string | null; notes: string | null; sortTime: string;
}
interface ActivityDiaper {
  kind: "diaper"; id: string; type: string; color: string | null; notes: string | null;
  timestamp: string; sortTime: string;
}
interface ActivitySleep {
  kind: "sleep"; id: string; startTime: string; endTime: string | null; notes: string | null;
  sortTime: string;
}
interface ActivityMedication {
  kind: "medication"; id: string; name: string; dosage: string; notes: string | null;
  timestamp: string; sortTime: string;
}
type ActivityItem = ActivityFeeding | ActivityDiaper | ActivitySleep | ActivityMedication;

interface BabyInfo {
  id: string; firstName: string; lastName: string; dob: string;
  birthWeightGrams: number | null; archivedAt: string | null;
}

interface DashboardData {
  lastFeeding: LastFeeding | null; lastDiaper: LastDiaper | null; lastSleep: LastSleep | null;
  isSleeping: boolean; todayFeedingsTotal: number; last7DaysDiapers: DiaperEntry[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayMidnightISO() { const d = new Date(); d.setHours(0,0,0,0); return d.toISOString(); }
function sevenDaysAgoISO() { const d = new Date(); d.setDate(d.getDate()-6); d.setHours(0,0,0,0); return d.toISOString(); }

function buildDiaperChart(diapers: DiaperEntry[]) {
  const days: { label: string; date: string; wet: number; solid: number; both: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push({ label: i === 0 ? "Today" : d.toLocaleDateString([], { weekday: "short" }), date: d.toLocaleDateString(), wet: 0, solid: 0, both: 0 });
  }
  for (const diaper of diapers) {
    const key = new Date(diaper.timestamp).toLocaleDateString();
    const day = days.find((d) => d.date === key);
    if (!day) continue;
    if (diaper.type === "wet") day.wet++;
    else if (diaper.type === "solid" || diaper.type === "dirty") day.solid++;
    else day.both++;
  }
  return days;
}

function activitySummary(item: ActivityItem, units: "metric" | "imperial"): { iconKind: string; title: string; detail: string; timeStr: string } {
  switch (item.kind) {
    case "feeding": {
      const dur = item.endTime ? formatDuration(new Date(item.endTime).getTime() - new Date(item.startTime).getTime()) : null;
      return { iconKind: "feeding",
        title: `${item.type.charAt(0).toUpperCase()}${item.type.slice(1)} feeding`,
        detail: [item.side, item.amountMl ? formatVolume(item.amountMl, units) : null, dur].filter(Boolean).join(" · "),
        timeStr: formatDistanceToNow(new Date(item.startTime)) };
    }
    case "diaper":
      return { iconKind: "diaper",
        title: `${item.type.charAt(0).toUpperCase()}${item.type.slice(1)} diaper`,
        detail: item.color ?? "", timeStr: formatDistanceToNow(new Date(item.timestamp)) };
    case "sleep": {
      const dur = item.endTime ? formatDuration(new Date(item.endTime).getTime() - new Date(item.startTime).getTime()) : null;
      return { iconKind: "sleep", title: item.endTime ? "Sleep" : "Sleeping...",
        detail: dur ?? "ongoing", timeStr: formatDistanceToNow(new Date(item.startTime)) };
    }
    case "medication":
      return { iconKind: "medication", title: item.name, detail: item.dosage,
        timeStr: formatDistanceToNow(new Date(item.timestamp)) };
  }
}

const DIAPER_TYPES = ["wet", "dirty", "both"] as const;
const DIAPER_COLORS = [
  { label: "Black", value: "black" },
  { label: "Brown", value: "brown" },
  { label: "Green", value: "green" },
  { label: "Yellow", value: "yellow" },
];
const FEED_TYPES = ["breast", "bottle", "both"] as const;
const FEED_SIDES = ["left", "right", "both"] as const;

// ─── Edit Dialog ──────────────────────────────────────────────────────────────

function EditDialog({ item, units, onClose, onSaved }: {
  item: ActivityItem; units: "metric" | "imperial"; onClose: () => void; onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [feedType, setFeedType] = useState(item.kind === "feeding" ? item.type : "breast");
  const [feedSide, setFeedSide] = useState(item.kind === "feeding" ? (item.side ?? "left") : "left");
  const [feedAmount, setFeedAmount] = useState(item.kind === "feeding" && item.amountMl ? String(Math.round(item.amountMl)) : "");
  const [feedStart, setFeedStart] = useState(item.kind === "feeding" ? toDatetimeLocal(new Date(item.startTime)) : "");
  const [feedEnd, setFeedEnd] = useState(item.kind === "feeding" && item.endTime ? toDatetimeLocal(new Date(item.endTime)) : "");
  const [diaperType, setDiaperType] = useState(item.kind === "diaper" ? item.type : "wet");
  const [diaperColor, setDiaperColor] = useState(item.kind === "diaper" ? (item.color ?? "") : "");
  const [diaperTime, setDiaperTime] = useState(item.kind === "diaper" ? toDatetimeLocal(new Date(item.timestamp)) : "");
  const [sleepStart, setSleepStart] = useState(item.kind === "sleep" ? toDatetimeLocal(new Date(item.startTime)) : "");
  const [sleepEnd, setSleepEnd] = useState(item.kind === "sleep" && item.endTime ? toDatetimeLocal(new Date(item.endTime)) : "");
  const [medName, setMedName] = useState(item.kind === "medication" ? item.name : "");
  const [medDosage, setMedDosage] = useState(item.kind === "medication" ? item.dosage : "");
  const [medTime, setMedTime] = useState(item.kind === "medication" ? toDatetimeLocal(new Date(item.timestamp)) : "");
  const [notes, setNotes] = useState(item.notes ?? "");

  async function handleSave() {
    setSaving(true);
    try {
      if (item.kind === "feeding") {
        await fetch("/api/feedings", { method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.id, type: feedType,
            side: feedType !== "bottle" ? feedSide : null,
            amountMl: feedAmount ? parseVolumeToMl(feedAmount, units) : null,
            startTime: new Date(feedStart).toISOString(),
            endTime: feedEnd ? new Date(feedEnd).toISOString() : null,
            notes: notes || null }) });
      } else if (item.kind === "diaper") {
        await fetch("/api/diapers", { method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.id, type: diaperType,
            color: diaperType !== "wet" ? (diaperColor || null) : null,
            timestamp: new Date(diaperTime).toISOString(), notes: notes || null }) });
      } else if (item.kind === "sleep") {
        await fetch("/api/sleeps", { method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sleepId: item.id,
            startTime: new Date(sleepStart).toISOString(),
            endTime: sleepEnd ? new Date(sleepEnd).toISOString() : null,
            notes: notes || null }) });
      } else if (item.kind === "medication") {
        await fetch("/api/medications", { method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.id, name: medName, dosage: medDosage,
            timestamp: new Date(medTime).toISOString(), notes: notes || null }) });
      }
      onSaved();
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    const ep = item.kind === "feeding" ? "feedings" : item.kind === "diaper" ? "diapers"
      : item.kind === "sleep" ? "sleeps" : "medications";
    await fetch(`/api/${ep}?id=${item.id}`, { method: "DELETE" });
    setDeleting(false);
    onSaved();
  }

  const kindLabel = item.kind === "feeding" ? "Feeding" : item.kind === "diaper" ? "Diaper"
    : item.kind === "sleep" ? "Sleep" : "Medication";

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit {kindLabel}</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">

          {item.kind === "feeding" && (<>
            <div className="space-y-1.5"><Label>Type</Label>
              <div className="grid grid-cols-3 gap-2">
                {FEED_TYPES.map((t) => (
                  <Button key={t} size="sm" variant={feedType === t ? "default" : "outline"} onClick={() => setFeedType(t)} className="capitalize">{t}</Button>
                ))}
              </div>
            </div>
            {feedType !== "bottle" && (
              <div className="space-y-1.5"><Label>Side</Label>
                <div className="grid grid-cols-3 gap-2">
                  {FEED_SIDES.map((s) => (
                    <Button key={s} size="sm" variant={feedSide === s ? "default" : "outline"} onClick={() => setFeedSide(s)} className="capitalize">{s}</Button>
                  ))}
                </div>
              </div>
            )}
            {feedType === "bottle" && (
              <div className="space-y-1.5">
                <Label>Amount ({volumeLabel(units)})</Label>
                <Input type="number" value={feedAmount} onChange={(e) => setFeedAmount(e.target.value)} inputMode="decimal" />
              </div>
            )}
            <div className="space-y-1.5"><Label>Start time</Label>
              <Input type="datetime-local" value={feedStart} onChange={(e) => setFeedStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>End time <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input type="datetime-local" value={feedEnd} onChange={(e) => setFeedEnd(e.target.value)} />
            </div>
          </>)}

          {item.kind === "diaper" && (<>
            <div className="space-y-1.5"><Label>Type</Label>
              <div className="grid grid-cols-3 gap-2">
                {DIAPER_TYPES.map((t) => (
                  <Button key={t} size="sm" variant={diaperType === t ? "default" : "outline"} onClick={() => setDiaperType(t)} className="capitalize">{t}</Button>
                ))}
              </div>
            </div>
            {diaperType !== "wet" && (
              <div className="space-y-1.5"><Label>Color</Label>
                <div className="grid grid-cols-4 gap-2">
                  {DIAPER_COLORS.map((c) => (
                    <Button key={c.value} size="sm" variant={diaperColor === c.value ? "default" : "outline"}
                      onClick={() => setDiaperColor(diaperColor === c.value ? "" : c.value)}
                      className="h-auto py-2 text-xs">{c.label}</Button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-1.5"><Label>Time</Label>
              <Input type="datetime-local" value={diaperTime} onChange={(e) => setDiaperTime(e.target.value)} />
            </div>
          </>)}

          {item.kind === "sleep" && (<>
            <div className="space-y-1.5"><Label>Start time</Label>
              <Input type="datetime-local" value={sleepStart} onChange={(e) => setSleepStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>End time <span className="text-muted-foreground text-xs">(leave blank if still sleeping)</span></Label>
              <Input type="datetime-local" value={sleepEnd} onChange={(e) => setSleepEnd(e.target.value)} />
            </div>
          </>)}

          {item.kind === "medication" && (<>
            <div className="space-y-1.5"><Label>Medication name</Label>
              <Input value={medName} onChange={(e) => setMedName(e.target.value)} />
            </div>
            <div className="space-y-1.5"><Label>Dosage</Label>
              <Input value={medDosage} onChange={(e) => setMedDosage(e.target.value)} />
            </div>
            <div className="space-y-1.5"><Label>Time</Label>
              <Input type="datetime-local" value={medTime} onChange={(e) => setMedTime(e.target.value)} />
            </div>
          </>)}

          <div className="space-y-1.5">
            <Label>Notes <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input placeholder="Any observations..." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <Button className="w-full" onClick={handleSave} disabled={saving || deleting}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
          <Button variant="destructive" className="w-full" onClick={handleDelete} disabled={saving || deleting}>
            {deleting ? "Deleting..." : confirmDelete ? "Tap again to confirm delete" : "Delete entry"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BabyDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const isReadOnly = (session?.user as { role?: string } | undefined)?.role === "read_only";
  const { babies, setActiveBaby, settings } = useDashboard();
  const { enabledActivities, units } = settings;
  const activeBaby = babies.find((b) => b.id === id) ?? null;
  const [archivedBaby, setArchivedBaby] = useState<BabyInfo | null>(null);
  const baby = activeBaby ?? archivedBaby;
  const [data, setData] = useState<DashboardData | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [editItem, setEditItem] = useState<ActivityItem | null>(null);

  useEffect(() => { if (activeBaby) setActiveBaby(activeBaby); }, [activeBaby, setActiveBaby]);

  // If baby not in active list, check if it's archived
  useEffect(() => {
    if (activeBaby || !id) return;
    fetch(`/api/babies?includeArchived=true`)
      .then((r) => r.json())
      .then((all: BabyInfo[]) => {
        const found = all.find((b) => b.id === id) ?? null;
        setArchivedBaby(found);
      })
      .catch(() => {});
  }, [id, activeBaby]);

  function fetchDashboard() {
    if (!id) return;
    Promise.all([
      fetch(`/api/feedings?babyId=${id}&limit=1`).then((r) => r.json()),
      fetch(`/api/feedings?babyId=${id}&from=${todayMidnightISO()}&limit=200`).then((r) => r.json()),
      fetch(`/api/diapers?babyId=${id}&limit=1`).then((r) => r.json()),
      fetch(`/api/diapers?babyId=${id}&from=${sevenDaysAgoISO()}&limit=200`).then((r) => r.json()),
      fetch(`/api/sleeps?babyId=${id}&limit=1`).then((r) => r.json()),
    ]).then(([lastFeedingArr, todayFeedings, lastDiaperArr, last7Diapers, lastSleepArr]) => {
      const lastSleep = lastSleepArr[0] ?? null;
      setData({
        lastFeeding: lastFeedingArr[0] ?? null, lastDiaper: lastDiaperArr[0] ?? null, lastSleep,
        isSleeping: lastSleep ? !lastSleep.endTime : false,
        todayFeedingsTotal: (todayFeedings as FeedingEntry[]).reduce((s, f) => s + (f.amountMl ?? 0), 0),
        last7DaysDiapers: last7Diapers,
      });
    }).catch(() => {});
  }

  function fetchActivity() {
    if (!id) return;
    const fetches: Promise<ActivityItem[]>[] = [];
    if (enabledActivities.includes("feeding"))
      fetches.push(fetch(`/api/feedings?babyId=${id}&limit=20`).then((r) => r.json()).then((arr: any[]) =>
        arr.map((f) => ({ kind: "feeding" as const, ...f, sortTime: f.startTime }))));
    if (enabledActivities.includes("diaper"))
      fetches.push(fetch(`/api/diapers?babyId=${id}&limit=20`).then((r) => r.json()).then((arr: any[]) =>
        arr.map((d) => ({ kind: "diaper" as const, ...d, sortTime: d.timestamp }))));
    if (enabledActivities.includes("sleep"))
      fetches.push(fetch(`/api/sleeps?babyId=${id}&limit=20`).then((r) => r.json()).then((arr: any[]) =>
        arr.map((s) => ({ kind: "sleep" as const, ...s, sortTime: s.startTime }))));
    if (enabledActivities.includes("medication"))
      fetches.push(fetch(`/api/medications?babyId=${id}&limit=20`).then((r) => r.json()).then((arr: any[]) =>
        arr.map((m) => ({ kind: "medication" as const, ...m, sortTime: m.timestamp }))));
    Promise.all(fetches).then((results) => {
      const merged = results.flat().sort((a, b) => new Date(b.sortTime).getTime() - new Date(a.sortTime).getTime());
      setActivity(merged.slice(0, 30));
    }).catch(() => {});
  }

  useEffect(() => { fetchDashboard(); fetchActivity(); }, [id]);

  if (!baby) return (
    <div className="p-4 flex items-center justify-center min-h-[60vh]">
      <p className="text-muted-foreground text-sm">Loading...</p>
    </div>
  );

  const diaperChart = data ? buildDiaperChart(data.last7DaysDiapers) : null;
  const maxDiaperCount = diaperChart ? Math.max(...diaperChart.map((d) => d.wet + d.solid + d.both), 1) : 1;

  function ActivityIcon({ kind }: { kind: string }) {
    if (kind === "feeding") return <Milk size={18} className="text-amber-500" />;
    if (kind === "diaper") return <Baby size={18} className="text-sky-500" />;
    if (kind === "sleep") return <Moon size={18} className="text-violet-500" />;
    return <Pill size={18} className="text-rose-500" />;
  }

  return (
    <div className="p-4 space-y-5 max-w-lg mx-auto">
      {archivedBaby && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-sm">
          <span className="shrink-0">⚠</span>
          <span>This baby is archived. Go to <Link href="/settings" className="underline underline-offset-2">Settings</Link> to restore them.</span>
        </div>
      )}
      <div className="pt-2 flex items-center gap-3">
        <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={22} />
        </Link>
        <div>
          <h2 className="text-2xl font-bold">{baby.firstName}&apos;s Day</h2>
          <p className="text-muted-foreground text-sm">{formatAge(baby.dob)}</p>
        </div>
      </div>

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
                    {data?.lastFeeding ? formatDistanceToNow(new Date(data.lastFeeding.startTime)) : "No feedings yet"}
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
                    {data?.lastDiaper ? formatDistanceToNow(new Date(data.lastDiaper.timestamp)) : "No changes yet"}
                  </p>
                  {data?.lastDiaper && (
                    <p className="text-xs text-muted-foreground capitalize">
                      {data.lastDiaper.type}{data.lastDiaper.color ? ` · ${data.lastDiaper.color}` : ""}
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
                    {data?.isSleeping ? "Currently sleeping..."
                      : data?.lastSleep ? `Woke ${formatDistanceToNow(new Date(data.lastSleep.endTime ?? data.lastSleep.startTime))}`
                      : "No sleep logged"}
                  </p>
                </div>
                <Plus size={18} className="text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          </Link>
        )}
        {enabledActivities.includes("feeding") && data && data.todayFeedingsTotal > 0 && (
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="w-11 h-11 rounded-full bg-amber-500/15 flex items-center justify-center">
                <Milk size={22} className="text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Today&apos;s total</p>
                <p className="font-semibold text-foreground">{formatVolume(data.todayFeedingsTotal, units)}</p>
                <p className="text-xs text-muted-foreground">across all feedings today</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

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
                      {total > 0 && <span className="text-[10px] text-muted-foreground leading-none">{total}</span>}
                      <div className="w-full rounded-sm overflow-hidden flex flex-col-reverse" style={{ height: `${barHeight}px` }}>
                        {day.wet > 0 && <div className="w-full bg-sky-400" style={{ height: `${(day.wet / total) * barHeight}px` }} />}
                        {day.solid > 0 && <div className="w-full bg-amber-400" style={{ height: `${(day.solid / total) * barHeight}px` }} />}
                        {day.both > 0 && <div className="w-full bg-violet-400" style={{ height: `${(day.both / total) * barHeight}px` }} />}
                      </div>
                      <span className="text-[10px] text-muted-foreground leading-none">{day.label}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-3 mt-3 pt-3 border-t border-border/50">
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><span className="w-2.5 h-2.5 rounded-sm bg-sky-400 inline-block" /> Wet</span>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" /> Solid</span>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><span className="w-2.5 h-2.5 rounded-sm bg-violet-400 inline-block" /> Both</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activity.length > 0 && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-3">Recent Activity</p>
          <div className="space-y-2">
            {activity.map((item) => {
              const { iconKind, title, detail, timeStr } = activitySummary(item, units);
              return (
                <Card key={`${item.kind}-${item.id}`} className="border-border/50">
                  <CardContent className="flex items-center gap-3 p-3">
                    <div className="shrink-0"><ActivityIcon kind={iconKind} /></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{title}</p>
                      <p className="text-xs text-muted-foreground">
                        {timeStr}{detail ? ` · ${detail}` : ""}
                      </p>
                    </div>
                    {!isReadOnly && (
                      <Button variant="ghost" size="icon"
                        className="shrink-0 h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => setEditItem(item)}>
                        <Pencil size={15} />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {editItem && (
        <EditDialog item={editItem} units={units}
          onClose={() => setEditItem(null)}
          onSaved={() => { setEditItem(null); fetchDashboard(); fetchActivity(); }} />
      )}
    </div>
  );
}
