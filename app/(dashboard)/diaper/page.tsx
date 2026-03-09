"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Baby, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toDatetimeLocal, formatDistanceToNow } from "@/lib/time";
import { useDashboard, type Baby as BabyProfile } from "@/components/app/DashboardProvider";
import { BabyChipSelector } from "@/components/app/BabyChipSelector";
import { useSession } from "@/lib/auth-client";
import { ReadOnlyBanner } from "@/components/app/ReadOnlyBanner";

type DiaperType = "wet" | "dirty" | "both";

const DIAPER_COLORS = [
  { label: "Black", value: "black", emoji: "⚫" },
  { label: "Brown", value: "brown", emoji: "🟤" },
  { label: "Green", value: "green", emoji: "🟢" },
  { label: "Yellow", value: "yellow", emoji: "🟡" },
];

interface DiaperEntry {
  id: string;
  type: DiaperType;
  color: string | null;
  notes: string | null;
  timestamp: string;
}

const typeConfig = {
  wet: { emoji: "💧", label: "Wet" },
  dirty: { emoji: "💩", label: "Dirty" },
  both: { emoji: "💧💩", label: "Both" },
};

export default function DiaperPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const isReadOnly = (session?.user as { role?: string } | undefined)?.role === "read_only";
  const { activeBaby, setActiveBaby } = useDashboard();
  const [selectedBaby, setSelectedBaby] = useState<BabyProfile | null>(null);
  const [showBabyError, setShowBabyError] = useState(false);
  const babyId = selectedBaby?.id ?? null;
  const [type, setType] = useState<DiaperType>("wet");
  const [color, setColor] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [timestamp, setTimestamp] = useState(toDatetimeLocal(new Date()));
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<DiaperEntry[]>([]);

  useEffect(() => {
    if (!babyId) return;
    fetch(`/api/diapers?babyId=${babyId}`)
      .then((r) => r.json())
      .then(setHistory);
  }, [babyId]);

  async function handleSave() {
    if (!babyId) { setShowBabyError(true); return; }
    setShowBabyError(false);
    setSaving(true);
    await fetch("/api/diapers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        babyId,
        type,
        color: color || null,
        notes: notes || null,
        timestamp: new Date(timestamp).toISOString(),
      }),
    });
    setSaving(false);
    router.push("/");
  }

  return (
    <div className="p-4 space-y-5 max-w-lg mx-auto">
      <div className="pt-2">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Baby className="text-sky-500" size={24} />
          Log Diaper
        </h2>
      </div>

      {isReadOnly ? (
        <ReadOnlyBanner />
      ) : (
      <Card>
        <CardContent className="pt-5 space-y-5">
          {/* Baby selector */}
          <BabyChipSelector
            selectedId={selectedBaby?.id ?? null}
            onSelect={(b) => { setSelectedBaby(b); setActiveBaby(b); setShowBabyError(false); }}
            showError={showBabyError}
          />

          {/* Type */}
          <div className="space-y-2">
            <Label className="text-base">Type</Label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(typeConfig) as [DiaperType, typeof typeConfig["wet"]][]).map(
                ([t, cfg]) => (
                  <Button
                    key={t}
                    variant={type === t ? "default" : "outline"}
                    className={cn("h-16 flex-col gap-1 text-sm", type === t && "shadow-md")}
                    onClick={() => setType(t)}
                  >
                    <span className="text-xl">{cfg.emoji}</span>
                    <span>{cfg.label}</span>
                  </Button>
                )
              )}
            </div>
          </div>

          {/* Color (for dirty/both) */}
          {(type === "dirty" || type === "both") && (
            <div className="space-y-2">
              <Label className="text-base">Color</Label>
              <div className="grid grid-cols-3 gap-2">
                {DIAPER_COLORS.map((c) => (
                  <Button
                    key={c.value}
                    variant={color === c.value ? "default" : "outline"}
                    className="h-12 text-sm gap-1"
                    onClick={() => setColor(color === c.value ? "" : c.value)}
                  >
                    <span>{c.emoji}</span> {c.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Time */}
          <div className="space-y-2">
            <Label htmlFor="diaper-time" className="text-base flex items-center gap-1.5">
              <Clock size={16} /> Time
            </Label>
            <Input
              id="diaper-time"
              type="datetime-local"
              value={timestamp}
              onChange={(e) => setTimestamp(e.target.value)}
              className="h-12 text-base"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="diaper-notes" className="text-base">
              Notes <span className="text-muted-foreground text-sm">(optional)</span>
            </Label>
            <Input
              id="diaper-notes"
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
            {saving ? "Saving…" : "Save Diaper Change"}
          </Button>
        </CardContent>
      </Card>
      )}

      {/* History */}
      {history.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Recent Changes</h3>
          <div className="space-y-2">
            {history.slice(0, 10).map((d) => (
              <Card key={d.id} className="border-border/50">
                <CardContent className="flex items-center gap-3 p-3">
                  <span className="text-xl">{typeConfig[d.type].emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm capitalize">
                      {d.type}{d.color ? ` · ${d.color}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(d.timestamp))}
                    </p>
                    {d.notes && (
                      <p className="text-xs text-muted-foreground truncate">{d.notes}</p>
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
