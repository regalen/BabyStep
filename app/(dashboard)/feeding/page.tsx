"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Milk, Clock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toDatetimeLocal, formatDistanceToNow } from "@/lib/time";

type FeedingType = "breast" | "bottle";
type Side = "left" | "right" | "both";

interface Feeding {
  id: string;
  type: FeedingType;
  amountMl: number | null;
  side: Side | null;
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

export default function FeedingPage() {
  const babyId = useBabyId();
  const [type, setType] = useState<FeedingType>("breast");
  const [side, setSide] = useState<Side>("left");
  const [amount, setAmount] = useState("");
  const [startTime, setStartTime] = useState(toDatetimeLocal(new Date()));
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<Feeding[]>([]);

  useEffect(() => {
    if (!babyId) return;
    fetch(`/api/feedings?babyId=${babyId}`)
      .then((r) => r.json())
      .then(setHistory);
  }, [babyId, saved]);

  async function handleSave() {
    if (!babyId) return;
    setSaving(true);
    await fetch("/api/feedings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        babyId,
        type,
        amountMl: amount ? parseFloat(amount) : null,
        side: type === "breast" ? side : null,
        startTime: new Date(startTime).toISOString(),
        endTime: endTime ? new Date(endTime).toISOString() : null,
        notes: notes || null,
      }),
    });
    setSaving(false);
    setSaved((v) => !v);
    setAmount("");
    setNotes("");
    setEndTime("");
    setStartTime(toDatetimeLocal(new Date()));
  }

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
          {/* Type toggle */}
          <div className="space-y-2">
            <Label className="text-base">Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["breast", "bottle"] as FeedingType[]).map((t) => (
                <Button
                  key={t}
                  variant={type === t ? "default" : "outline"}
                  className={cn("h-14 text-base capitalize", type === t && "shadow-md")}
                  onClick={() => setType(t)}
                >
                  {t === "breast" ? "🤱 Breast" : "🍼 Bottle"}
                </Button>
              ))}
            </div>
          </div>

          {/* Breast side */}
          {type === "breast" && (
            <div className="space-y-2">
              <Label className="text-base">Side</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["left", "right", "both"] as Side[]).map((s) => (
                  <Button
                    key={s}
                    variant={side === s ? "default" : "outline"}
                    className="h-12 text-base capitalize"
                    onClick={() => setSide(s)}
                  >
                    {s === "left" ? "◀ Left" : s === "right" ? "Right ▶" : "Both"}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Amount (bottle) */}
          {type === "bottle" && (
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-base">Amount (ml)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="e.g. 90"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-12 text-base"
                inputMode="decimal"
              />
            </div>
          )}

          {/* Start time */}
          <div className="space-y-2">
            <Label htmlFor="start-time" className="text-base flex items-center gap-1.5">
              <Clock size={16} /> Start Time
            </Label>
            <Input
              id="start-time"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="h-12 text-base"
            />
          </div>

          {/* End time */}
          <div className="space-y-2">
            <Label htmlFor="end-time" className="text-base">
              End Time <span className="text-muted-foreground text-sm">(optional)</span>
            </Label>
            <Input
              id="end-time"
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="h-12 text-base"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-base">
              Notes <span className="text-muted-foreground text-sm">(optional)</span>
            </Label>
            <Input
              id="notes"
              placeholder="Any notes…"
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
                  <span className="text-xl">{f.type === "breast" ? "🤱" : "🍼"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium capitalize text-sm">
                      {f.type}{f.side ? ` · ${f.side}` : ""}
                      {f.amountMl ? ` · ${f.amountMl}ml` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(f.startTime))}
                    </p>
                  </div>
                  <Badge variant="secondary" className="capitalize text-xs">
                    {f.type}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
