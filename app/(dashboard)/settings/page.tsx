"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/components/app/ThemeProvider";
import { useDashboard } from "@/components/app/DashboardProvider";
import { cn } from "@/lib/utils";
import { LogOut, Moon, Sun, Baby, Download, Plus, Trash2, Pill } from "lucide-react";
import { formatWeight } from "@/lib/units";

interface BabyProfile {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
  birthWeightGrams: number | null;
}

interface MedPreset {
  id: string;
  name: string;
  defaultDosage: string | null;
}

const ALL_ACTIVITIES = [
  { key: "feeding", label: "Feeding", emoji: "🤱" },
  { key: "diaper", label: "Diaper", emoji: "👶" },
  { key: "sleep", label: "Sleep", emoji: "🌙" },
  { key: "medication", label: "Medication", emoji: "💊" },
  { key: "milestones", label: "Milestones", emoji: "⭐" },
];

export default function SettingsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();
  const { activeBaby, settings, patchSettings } = useDashboard();

  const [babies, setBabies] = useState<BabyProfile[]>([]);
  const [showAddBaby, setShowAddBaby] = useState(false);
  const [saving, setSaving] = useState(false);

  // New baby form
  const [babyFirst, setBabyFirst] = useState("");
  const [babyLast, setBabyLast] = useState("");
  const [dob, setDob] = useState("");
  const [birthWeight, setBirthWeight] = useState("");

  // Medication presets
  const [presets, setPresets] = useState<MedPreset[]>([]);
  const [presetName, setPresetName] = useState("");
  const [presetDosage, setPresetDosage] = useState("");
  const [addingPreset, setAddingPreset] = useState(false);
  const [savingPreset, setSavingPreset] = useState(false);

  useEffect(() => {
    fetch("/api/babies")
      .then((r) => r.json())
      .then(setBabies);
  }, []);

  useEffect(() => {
    if (!activeBaby) return;
    fetch(`/api/medication-presets?babyId=${activeBaby.id}`)
      .then((r) => r.json())
      .then(setPresets)
      .catch(() => {});
  }, [activeBaby]);

  async function handleAddBaby(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/babies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: babyFirst,
        lastName: babyLast,
        dob,
        birthWeightGrams: birthWeight ? parseFloat(birthWeight) * 1000 : null,
      }),
    });
    if (res.ok) {
      const baby = await res.json();
      setBabies((prev) => [...prev, baby]);
      setShowAddBaby(false);
      setBabyFirst(""); setBabyLast(""); setDob(""); setBirthWeight("");
    }
    setSaving(false);
  }

  async function handleAddPreset(e: React.FormEvent) {
    e.preventDefault();
    if (!activeBaby || !presetName) return;
    setSavingPreset(true);
    const res = await fetch("/api/medication-presets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        babyId: activeBaby.id,
        name: presetName,
        defaultDosage: presetDosage || null,
      }),
    });
    if (res.ok) {
      const preset = await res.json();
      setPresets((prev) => [...prev, preset]);
      setPresetName("");
      setPresetDosage("");
      setAddingPreset(false);
    }
    setSavingPreset(false);
  }

  async function handleDeletePreset(id: string) {
    await fetch(`/api/medication-presets?id=${id}`, { method: "DELETE" });
    setPresets((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleExport() {
    const data = { exportedAt: new Date().toISOString(), babies };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `babystep-export-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleSignOut() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  function toggleActivity(key: string) {
    const current = settings.enabledActivities;
    const updated = current.includes(key)
      ? current.filter((k) => k !== key)
      : [...current, key];
    if (updated.length === 0) return;
    patchSettings({ enabledActivities: updated });
  }

  return (
    <div className="p-4 space-y-5 max-w-lg mx-auto">
      <div className="pt-2">
        <h2 className="text-2xl font-bold">Settings</h2>
        {session?.user && (
          <p className="text-muted-foreground text-sm mt-0.5">
            Signed in as {session.user.email}
          </p>
        )}
      </div>

      {/* Baby Profiles */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Baby size={18} className="text-sky-500" />
            Baby Profiles
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {babies.map((baby) => (
            <div key={baby.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <p className="font-medium">{baby.firstName} {baby.lastName}</p>
                <p className="text-xs text-muted-foreground">
                  Born {new Date(baby.dob).toLocaleDateString()}
                  {baby.birthWeightGrams
                    ? ` · ${formatWeight(baby.birthWeightGrams, settings.units)} at birth`
                    : ""}
                </p>
              </div>
            </div>
          ))}

          {showAddBaby ? (
            <form onSubmit={handleAddBaby} className="space-y-3 pt-2 border-t border-border">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="nb-first" className="text-sm">First Name</Label>
                  <Input id="nb-first" value={babyFirst} onChange={(e) => setBabyFirst(e.target.value)} required className="h-10" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="nb-last" className="text-sm">Last Name</Label>
                  <Input id="nb-last" value={babyLast} onChange={(e) => setBabyLast(e.target.value)} required className="h-10" />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="nb-dob" className="text-sm">Date of Birth</Label>
                <Input id="nb-dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} required className="h-10" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="nb-weight" className="text-sm">
                  Birth Weight ({settings.units === "imperial" ? "lbs" : "kg"}) <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input id="nb-weight" type="number" value={birthWeight} onChange={(e) => setBirthWeight(e.target.value)} className="h-10" inputMode="decimal" />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={saving}>{saving ? "Saving…" : "Add Baby"}</Button>
                <Button type="button" variant="outline" onClick={() => setShowAddBaby(false)}>Cancel</Button>
              </div>
            </form>
          ) : (
            <Button variant="outline" className="w-full h-11" onClick={() => setShowAddBaby(true)}>
              <Plus size={16} className="mr-2" />Add Baby
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Units */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Units of Measure</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {(["metric", "imperial"] as const).map((u) => (
              <button
                key={u}
                onClick={() => patchSettings({ units: u })}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition-all",
                  settings.units === u ? "border-primary bg-primary/10" : "border-border"
                )}
              >
                <span className="text-xl">{u === "metric" ? "🌍" : "🇺🇸"}</span>
                <span className="font-semibold text-sm capitalize">{u}</span>
                <span className="text-xs text-muted-foreground">{u === "metric" ? "ml, kg, cm" : "oz, lbs, in"}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Feeding Mode */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Feeding Mode</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Formula / Bottle Only</p>
              <p className="text-xs text-muted-foreground">Hide breastfeeding options</p>
            </div>
            <button
              onClick={() => patchSettings({ formulaOnly: !settings.formulaOnly })}
              className={cn(
                "relative w-12 h-6 rounded-full transition-colors",
                settings.formulaOnly ? "bg-primary" : "bg-muted-foreground/30"
              )}
              aria-label="Toggle formula only mode"
            >
              <span className={cn(
                "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
                settings.formulaOnly && "translate-x-6"
              )} />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Activity Tracking */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Activity Tracking</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {ALL_ACTIVITIES.map(({ key, label, emoji }) => {
            const on = settings.enabledActivities.includes(key);
            return (
              <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="flex items-center gap-2 font-medium text-sm">
                  <span>{emoji}</span>{label}
                </span>
                <button
                  onClick={() => toggleActivity(key)}
                  className={cn(
                    "relative w-10 h-5 rounded-full transition-colors",
                    on ? "bg-primary" : "bg-muted-foreground/30"
                  )}
                  aria-label={`Toggle ${label}`}
                >
                  <span className={cn(
                    "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                    on && "translate-x-5"
                  )} />
                </button>
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground pt-1">
            Disabled activities are hidden from the nav and home screen.
          </p>
        </CardContent>
      </Card>

      {/* Medication Presets */}
      {activeBaby && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Pill size={18} className="text-rose-500" />
              Medication Presets
              <span className="text-muted-foreground text-xs font-normal">({activeBaby.firstName})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {presets.length === 0 && !addingPreset && (
              <p className="text-sm text-muted-foreground">No presets yet.</p>
            )}
            {presets.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium text-sm">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.defaultDosage ?? "Enter dose manually"}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeletePreset(p.id)}>
                  <Trash2 size={15} />
                </Button>
              </div>
            ))}

            {addingPreset ? (
              <form onSubmit={handleAddPreset} className="space-y-3 pt-2 border-t border-border">
                <div className="space-y-1">
                  <Label htmlFor="preset-name" className="text-sm">Medication Name</Label>
                  <Input id="preset-name" placeholder="e.g. Infant Tylenol" value={presetName} onChange={(e) => setPresetName(e.target.value)} required className="h-10" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="preset-dose" className="text-sm">
                    Default Dose <span className="text-muted-foreground">(optional — leave blank to enter manually each time)</span>
                  </Label>
                  <Input id="preset-dose" placeholder="e.g. 2.5ml" value={presetDosage} onChange={(e) => setPresetDosage(e.target.value)} className="h-10" />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1" disabled={savingPreset}>{savingPreset ? "Saving…" : "Add Preset"}</Button>
                  <Button type="button" variant="outline" onClick={() => setAddingPreset(false)}>Cancel</Button>
                </div>
              </form>
            ) : (
              <Button variant="outline" className="w-full h-11" onClick={() => setAddingPreset(true)}>
                <Plus size={16} className="mr-2" />Add Preset
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Appearance */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Moon size={18} className="text-violet-500" />
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Dark Mode</p>
              <p className="text-xs text-muted-foreground">Low blue light for night feedings</p>
            </div>
            <Button variant="outline" size="icon" className="h-11 w-11" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Download size={18} className="text-green-500" />
            Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full h-12 text-base" onClick={handleExport} disabled={babies.length === 0}>
            <Download size={18} className="mr-2" />
            Export All Data (JSON)
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Export your data for pediatrician visits or backups.
          </p>
        </CardContent>
      </Card>

      {/* Account */}
      <Card>
        <CardContent className="pt-5">
          <Button variant="destructive" className="w-full h-12 text-base" onClick={handleSignOut}>
            <LogOut size={18} className="mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground pb-4">
        BabyStep · Self-hosted · Privacy first
      </p>
    </div>
  );
}
