"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Milk, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toDatetimeLocal, formatDistanceToNow } from "@/lib/time";
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

export default function FeedingPage() {
  const router = useRouter();
  const { activeBaby, setActiveBaby, settings } = useDashboard();
  const { formulaOnly, units } = settings;
  const [selectedBaby, setSelectedBaby] = useState<Baby | null>(null);
  const [showBabyError, setShowBabyError] = useState(false);

  const [type, setType] = useState<FeedType>(formulaOnly ? "bottle" : "breast");
  const [side, setSide] = useState<Side>("left");
  const [amount, setAmount] = useState("");
  const [timestamp, setTimestamp] = useState(toDatetimeLocal(new Date()));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<FeedEntry[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const babyId = selectedBaby?.id ?? null;

  useEffect(() => {
    if (!babyId) return;
    fetch(`/api/feedings?babyId=${babyId}`)
      .then((r) => r.json())
      .then(setHistory);
  }, [babyId, refreshKey]);

  // If formulaOnly changes and current type is breast, switch to bottle
  useEffect(() => {
    if (formulaOnly && type === "breast") setType("bottle");
  }, [formulaOnly, type]);

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

  return (
    <div className="p-4 space-y-5 max-w-lg mx-auto">
      <div className="pt-2">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Milk className="text-amber-500" size={24} />
          Log Feeding
        </h2>
      </div>

      <Card>
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
                    onClick={() => setType(t)}
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

          {/* Side (breast only) */}
          {showBreastOptions && type !== "bottle" && (
            <div className="space-y-2">
              <Label className="text-base">Side</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["left", "right", "both"] as Side[]).map((s) => (
                  <Button
                    key={s}
                    variant={side === s ? "default" : "outline"}
                    className="h-12 text-sm capitalize"
                    onClick={() => setSide(s)}
                  >
                    {s === "left" ? "← Left" : s === "right" ? "Right →" : "Both"}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Amount */}
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

          {/* Time */}
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

          {/* Notes */}
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
        </CardContent>
      </Card>

      {/* History */}
      {history.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Recent Feedings</h3>
          <div className="space-y-2">
            {history.slice(0, 10).map((f) => (
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
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(f.startTime))}
                    </p>
                    {f.notes && (
                      <p className="text-xs text-muted-foreground truncate">{f.notes}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
