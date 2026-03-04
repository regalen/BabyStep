"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Star, Trophy } from "lucide-react";

interface Milestone {
  id: string;
  title: string;
  date: string;
  notes: string | null;
}

const MILESTONE_SUGGESTIONS = [
  "First smile 😊",
  "First laugh 😄",
  "First word 💬",
  "First steps 👣",
  "Rolled over 🔄",
  "Sat up alone 🪑",
  "First solid food 🥣",
  "First tooth 🦷",
  "Crawled 🐣",
  "Waved bye-bye 👋",
];

function useBabyId() {
  const [babyId, setBabyId] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/babies")
      .then((r) => r.json())
      .then((data) => setBabyId(data[0]?.id ?? null));
  }, []);
  return babyId;
}

export default function MilestonesPage() {
  const babyId = useBabyId();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<Milestone[]>([]);

  useEffect(() => {
    if (!babyId) return;
    fetch(`/api/milestones?babyId=${babyId}`)
      .then((r) => r.json())
      .then(setHistory);
  }, [babyId, saved]);

  async function handleSave() {
    if (!babyId || !title) return;
    setSaving(true);
    await fetch("/api/milestones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ babyId, title, date, notes: notes || null }),
    });
    setSaving(false);
    setSaved((v) => !v);
    setTitle("");
    setNotes("");
    setDate(new Date().toISOString().split("T")[0]);
  }

  return (
    <div className="p-4 space-y-5 max-w-lg mx-auto">
      <div className="pt-2">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Star className="text-yellow-500" size={24} />
          Milestones
        </h2>
      </div>

      <Card>
        <CardContent className="pt-5 space-y-5">
          {/* Suggestions */}
          <div className="space-y-2">
            <Label className="text-base">Quick Add</Label>
            <div className="grid grid-cols-2 gap-2">
              {MILESTONE_SUGGESTIONS.map((s) => (
                <Button
                  key={s}
                  variant={title === s ? "default" : "outline"}
                  className="h-11 text-sm justify-start px-3 truncate"
                  onClick={() => setTitle(title === s ? "" : s)}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom title */}
          <div className="space-y-2">
            <Label htmlFor="milestone-title" className="text-base">
              Custom Milestone
            </Label>
            <Input
              id="milestone-title"
              placeholder="Describe the milestone…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-12 text-base"
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="milestone-date" className="text-base">Date</Label>
            <Input
              id="milestone-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-12 text-base"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="milestone-notes" className="text-base">
              Notes <span className="text-muted-foreground text-sm">(optional)</span>
            </Label>
            <Input
              id="milestone-notes"
              placeholder="Details, feelings, context…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-12 text-base"
            />
          </div>

          <Button
            className="w-full h-14 text-lg font-semibold"
            onClick={handleSave}
            disabled={saving || !babyId || !title}
          >
            {saving ? "Saving…" : "🌟 Save Milestone"}
          </Button>
        </CardContent>
      </Card>

      {/* History */}
      {history.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            All Milestones ({history.length})
          </h3>
          <div className="space-y-2">
            {history.map((m) => (
              <Card key={m.id} className="border-border/50">
                <CardContent className="flex items-start gap-3 p-3">
                  <Trophy size={20} className="text-yellow-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{m.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(m.date).toLocaleDateString([], {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                    {m.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5">{m.notes}</p>
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
