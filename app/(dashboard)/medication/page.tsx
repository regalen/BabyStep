"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pill, Clock } from "lucide-react";
import { toDatetimeLocal, formatDistanceToNow } from "@/lib/time";

interface MedEntry {
  id: string;
  name: string;
  dosage: string;
  timestamp: string;
  notes: string | null;
}

const COMMON_MEDS = [
  "Infant Tylenol",
  "Infant Advil",
  "Vitamin D",
  "Gripe Water",
  "Simethicone",
  "Probiotics",
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

export default function MedicationPage() {
  const babyId = useBabyId();
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [timestamp, setTimestamp] = useState(toDatetimeLocal(new Date()));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<MedEntry[]>([]);

  useEffect(() => {
    if (!babyId) return;
    fetch(`/api/medications?babyId=${babyId}`)
      .then((r) => r.json())
      .then(setHistory);
  }, [babyId, saved]);

  async function handleSave() {
    if (!babyId || !name || !dosage) return;
    setSaving(true);
    await fetch("/api/medications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        babyId,
        name,
        dosage,
        timestamp: new Date(timestamp).toISOString(),
        notes: notes || null,
      }),
    });
    setSaving(false);
    setSaved((v) => !v);
    setName("");
    setDosage("");
    setNotes("");
    setTimestamp(toDatetimeLocal(new Date()));
  }

  return (
    <div className="p-4 space-y-5 max-w-lg mx-auto">
      <div className="pt-2">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Pill className="text-rose-500" size={24} />
          Log Medication
        </h2>
      </div>

      <Card>
        <CardContent className="pt-5 space-y-5">
          {/* Quick select */}
          <div className="space-y-2">
            <Label className="text-base">Common Medications</Label>
            <div className="grid grid-cols-2 gap-2">
              {COMMON_MEDS.map((m) => (
                <Button
                  key={m}
                  variant={name === m ? "default" : "outline"}
                  className="h-11 text-sm justify-start px-3"
                  onClick={() => setName(name === m ? "" : m)}
                >
                  {m}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom name */}
          <div className="space-y-2">
            <Label htmlFor="med-name" className="text-base">
              Medication Name
            </Label>
            <Input
              id="med-name"
              placeholder="Or type a custom name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 text-base"
            />
          </div>

          {/* Dosage */}
          <div className="space-y-2">
            <Label htmlFor="dosage" className="text-base">Dosage</Label>
            <Input
              id="dosage"
              placeholder="e.g. 2.5ml, 1 drop"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              className="h-12 text-base"
            />
          </div>

          {/* Time */}
          <div className="space-y-2">
            <Label htmlFor="med-time" className="text-base flex items-center gap-1.5">
              <Clock size={16} /> Time
            </Label>
            <Input
              id="med-time"
              type="datetime-local"
              value={timestamp}
              onChange={(e) => setTimestamp(e.target.value)}
              className="h-12 text-base"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="med-notes" className="text-base">
              Notes <span className="text-muted-foreground text-sm">(optional)</span>
            </Label>
            <Input
              id="med-notes"
              placeholder="Reason, reaction, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-12 text-base"
            />
          </div>

          <Button
            className="w-full h-14 text-lg font-semibold"
            onClick={handleSave}
            disabled={saving || !babyId || !name || !dosage}
          >
            {saving ? "Saving…" : "Save Medication"}
          </Button>
        </CardContent>
      </Card>

      {/* History */}
      {history.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Recent Medications</h3>
          <div className="space-y-2">
            {history.slice(0, 10).map((m) => (
              <Card key={m.id} className="border-border/50">
                <CardContent className="flex items-center gap-3 p-3">
                  <Pill size={20} className="text-rose-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{m.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.dosage} · {formatDistanceToNow(new Date(m.timestamp))}
                    </p>
                    {m.notes && (
                      <p className="text-xs text-muted-foreground truncate">{m.notes}</p>
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
