"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Milk, Clock, Play, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { toDatetimeLocal, formatDistanceToNow, formatDuration } from "@/lib/time";
import { useDashboard, type Baby } from "@/components/app/DashboardProvider";
import { formatVolume, parseVolumeToMl, volumeLabel, volumePlaceholder } from "@/lib/units";
import { BabyChipSelector } from "@/components/app/BabyChipSelector";

type FeedType = "breast" | "bottle" | "both";
type Side = "left" | "right" | "both";

interface FeedEntry {
  id: string;
  type: FeedType;
  side: Side | null;
  amountMl: number | null;
  startTime: string;
  endTime: string | null;
  notes: string | null;
}

const FEEDINGS_KEY = "babystep-active-feedings";

interface ActiveFeeding {
  startTime: string;
  babyId: string;
  side: Side;
  type: "breast" | "both";
}

function FeedingPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { babies, activeBaby, setActiveBaby, settings } = useDashboard();
  const { formulaOnly, units } = settings;

  const [selectedBaby, setSelectedBaby] = useState<Baby | null>(null);
  const [showBabyError, setShowBabyError] = useState(false);
  const babyId = selectedBaby?.id ?? null;

  const [type, setType] = useState<FeedType>(formulaOnly ? "bottle" : "breast");
  const [side, setSide] = useState<Side>("left");
  const [amount, setAmount] = useState("");
  const [timestamp, setTimestamp] = useState(toDatetimeLocal(new Date()));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<FeedEntry[]>([]);

  // Active breast feeding timers keyed by babyId
  const [activeFeedings, setActiveFeedings] = useState<Record<string, ActiveFeeding>>({});
  const activeFeeding = babyId ? (activeFeedings[babyId] ?? null) : null;

  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FEEDINGS_KEY);
      if (raw) setActiveFeedings(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  // Auto-select baby from ?babyId param once babies are available
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
    if (activeBaby) {
      setSelectedBaby(activeBaby);
      didAutoSelect.current = true;
    }
  }, [babies, initialBabyId, activeBaby]);

  // When an active feeding exists for selected baby, sync the type/side display
  useEffect(() => {
    if (activeFeeding) {
      setType(activeFeeding.type);
      setSide(activeFeeding.side);
    }
  }, [activeFeeding]);

  // Elapsed timer for active breast feeding
  useEffect(() => {
    if (activeFeeding) {
      const update = () => setElapsed(Date.now() - new Date(activeFeeding.startTime).getTime());
      update();
      intervalRef.current = setInterval(update, 1000);
    } else {
      setElapsed(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [activeFeeding]);

  // Load history
  useEffect(() => {
    if (!babyId) return;
    fetch(`/api/feedings?babyId=${babyId}`)
      .then((r) => r.json())
      .then(setHistory);
  }, [babyId, saving]);

  // If formulaOnly changes and type is breast, switch to bottle
  useEffect(() => {
    if (formulaOnly && type === "breast") setType("bottle");
  }, [formulaOnly, type]);

  function saveActiveFeedings(updated: Record<string, ActiveFeeding>) {
    localStorage.setItem(FEEDINGS_KEY, JSON.stringify(updated));
    setActiveFeedings(updated);
    window.dispatchEvent(new CustomEvent("babystep-feedings-updated"));
  }

  function startFeeding() {
    if (!babyId) { setShowBabyError(true); return; }
    setShowBabyError(false);
    const startTime = new Date().toISOString();
    saveActiveFeedings({ ...activeFeedings, [babyId]: { startTime, babyId, side, type: type as "breast" | "both" } });
  }

  async function stopFeeding() {
    if (!activeFeeding || !babyId) return;
    setSaving(true);
    const endTime = new Date().toISOString();
    await fetch("/api/feedings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        babyId,
        type: activeFeeding.type,
        side: activeFeeding.side,
        amountMl: null,
        startTime: activeFeeding.startTime,
        endTime,
        notes: notes || null,
      }),
    });
    const updated = { ...activeFeedings };
    delete updated[babyId];
    saveActiveFeedings(updated);
    setSaving(false);
    router.push("/");
  }

  async function handleSave() {
    if (!babyId) { setShowBabyError(true); return; }
    setShowBabyError(false);
    setSaving(true);
    const amountMl = amount ? parseVolumeToMl(amount, units) : null;
    await fetch("/api/feedings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        babyId,
        type,
        side: type !== "bottle" ? side : null,
        amountMl,
        startTime: new Date(timestamp).toISOString(),
        notes: notes || null,
      }),
    });
    setSaving(false);
    router.push("/");
  }

  const showBreastOptions = !formulaOnly;
  const isBreastMode = showBreastOptions && (type === "breast" || type === "both");

  return (
    <div className="p-4 space-y-5 max-w-lg mx-auto">
      <div className="pt-2">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Milk className="text-amber-500" size={24} />
          Log Feeding
        </h2>
      </div>

      <Card className={activeFeeding ? "border-amber-500/40 shadow-lg shadow-amber-500/10" : ""}>
        <CardContent className="pt-5 space-y-5">
          {/* Baby selector */}
          <BabyChipSelector
            selectedId={selectedBaby?.id ?? null}
            onSelect={(b) => { setSelectedBaby(b); setActiveBaby(b); setShowBabyError(false); }}
            showError={showBabyError}
          />

          {/* Feed type */}
          {showBreastOptions ? (
            <div className="space-y-2">
              <Label className="text-base">Type</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["breast", "bottle", "both"] as FeedType[]).map((t) => (
                  <Button
                    key={t}
                    variant={type === t ? "default" : "outline"}
                    className={cn("h-14 flex-col gap-1 text-sm", type === t && "shadow-md")}
                    onClick={() => { if (!activeFeeding) setType(t); }}
                    disabled={!!activeFeeding && type !== t}
                  >
                    <span className="text-xl">
                      {t === "breast" ? "🤱" : t === "bottle" ? "🍼" : "🤱🍼"}
                    </span>
                    <span className="capitalize">{t}</span>
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <span className="text-xl">🍼</span>
              <span className="font-medium">Bottle / Formula</span>
            </div>
          )}

          {/* Side (breast/both only) */}
          {showBreastOptions && type !== "bottle" && (
            <div className="space-y-2">
              <Label className="text-base">Side</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["left", "right", "both"] as Side[]).map((s) => (
                  <Button
                    key={s}
                    variant={side === s ? "default" : "outline"}
                    className="h-12 text-sm capitalize"
                    onClick={() => { if (!activeFeeding) setSide(s); }}
                    disabled={!!activeFeeding && side !== s}
                  >
                    {s === "left" ? "← Left" : s === "right" ? "Right →" : "Both"}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Breast timer UI */}
          {isBreastMode ? (
            activeFeeding ? (
              // Timer running
              <div className="flex flex-col items-center gap-4 py-2">
                <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse mr-1.5 inline-block" />
                  Feeding
                </Badge>
                <div className="text-5xl font-mono font-bold tabular-nums text-foreground">
                  {formatDuration(elapsed)}
                </div>
                <Button
                  size="lg"
                  className="w-full h-16 text-xl font-bold rounded-2xl shadow-lg bg-destructive hover:bg-destructive/90"
                  onClick={stopFeeding}
                  disabled={saving}
                >
                  <Square className="mr-2" size={22} /> Stop Feeding
                </Button>
              </div>
            ) : (
              // Ready to start
              <Button
                size="lg"
                className="w-full h-16 text-xl font-bold rounded-2xl shadow-lg bg-amber-500 hover:bg-amber-600 text-white"
                onClick={startFeeding}
                disabled={!babyId}
              >
                <Play className="mr-2" size={22} /> Start Feeding
              </Button>
            )
          ) : (
            // Bottle: manual form
            <>
              <div className="space-y-2">
                <Label htmlFor="feed-amount" className="text-base">
                  Amount <span className="text-muted-foreground text-sm">({volumeLabel(units)}, optional)</span>
                </Label>
                <Input
                  id="feed-amount"
                  type="number"
                  placeholder={volumePlaceholder(units)}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-12 text-base"
                  inputMode="decimal"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="feed-time" className="text-base flex items-center gap-1.5">
                  <Clock size={16} /> Time
                </Label>
                <Input
                  id="feed-time"
                  type="datetime-local"
                  value={timestamp}
                  onChange={(e) => setTimestamp(e.target.value)}
                  className="h-12 text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="feed-notes" className="text-base">
                  Notes <span className="text-muted-foreground text-sm">(optional)</span>
                </Label>
                <Input
                  id="feed-notes"
                  placeholder="Any observations…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-12 text-base"
                />
              </div>

              <Button
                className="w-full h-14 text-lg font-semibold"
                onClick={handleSave}
                disabled={saving || !babyId}
              >
                {saving ? "Saving…" : "Save Feeding"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* History */}
      {history.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Recent Feedings</h3>
          <div className="space-y-2">
            {history.slice(0, 10).map((f) => {
              const start = new Date(f.startTime);
              const end = f.endTime ? new Date(f.endTime) : null;
              const duration = end ? end.getTime() - start.getTime() : null;
              return (
                <Card key={f.id} className="border-border/50">
                  <CardContent className="flex items-center gap-3 p-3">
                    <span className="text-xl">
                      {f.type === "breast" ? "🤱" : f.type === "bottle" ? "🍼" : "🤱🍼"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm capitalize">
                        {f.type}
                        {f.side ? ` · ${f.side}` : ""}
                        {f.amountMl ? ` · ${formatVolume(f.amountMl, units)}` : ""}
                        {duration ? ` · ${formatDuration(duration)}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(start)}
                      </p>
                      {f.notes && (
                        <p className="text-xs text-muted-foreground truncate">{f.notes}</p>
                      )}
                    </div>
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

export default function FeedingPage() {
  return (
    <Suspense>
      <FeedingPageInner />
    </Suspense>
  );
}
