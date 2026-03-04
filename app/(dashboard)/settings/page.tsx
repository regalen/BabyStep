"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/components/app/ThemeProvider";
import { LogOut, Moon, Sun, Baby, Download, Plus, Trash2 } from "lucide-react";

interface BabyProfile {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
  birthWeightGrams: number | null;
}

export default function SettingsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();

  const [babies, setBabies] = useState<BabyProfile[]>([]);
  const [showAddBaby, setShowAddBaby] = useState(false);
  const [saving, setSaving] = useState(false);

  // New baby form
  const [babyFirst, setBabyFirst] = useState("");
  const [babyLast, setBabyLast] = useState("");
  const [dob, setDob] = useState("");
  const [birthWeight, setBirthWeight] = useState("");

  useEffect(() => {
    fetch("/api/babies")
      .then((r) => r.json())
      .then(setBabies);
  }, []);

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
        birthWeightGrams: birthWeight ? parseFloat(birthWeight) : null,
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

  async function handleExport() {
    const [feedingsRes, diapersRes, sleepsRes, medsRes, milestonesRes] = await Promise.all(
      babies.flatMap((b) => [
        fetch(`/api/feedings?babyId=${b.id}`),
        fetch(`/api/diapers?babyId=${b.id}`),
        fetch(`/api/sleeps?babyId=${b.id}`),
        fetch(`/api/medications?babyId=${b.id}`),
        fetch(`/api/milestones?babyId=${b.id}`),
      ])
    );

    const data = {
      exportedAt: new Date().toISOString(),
      babies,
      // This is a simplified export — in a multi-baby scenario you'd map by babyId
    };

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
            <div
              key={baby.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
            >
              <div>
                <p className="font-medium">{baby.firstName} {baby.lastName}</p>
                <p className="text-xs text-muted-foreground">
                  Born {new Date(baby.dob).toLocaleDateString()}
                  {baby.birthWeightGrams
                    ? ` · ${(baby.birthWeightGrams / 1000).toFixed(2)}kg at birth`
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
                  <Input
                    id="nb-first"
                    value={babyFirst}
                    onChange={(e) => setBabyFirst(e.target.value)}
                    required
                    className="h-10"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="nb-last" className="text-sm">Last Name</Label>
                  <Input
                    id="nb-last"
                    value={babyLast}
                    onChange={(e) => setBabyLast(e.target.value)}
                    required
                    className="h-10"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="nb-dob" className="text-sm">Date of Birth</Label>
                <Input
                  id="nb-dob"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  required
                  className="h-10"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="nb-weight" className="text-sm">
                  Birth Weight (g) <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="nb-weight"
                  type="number"
                  value={birthWeight}
                  onChange={(e) => setBirthWeight(e.target.value)}
                  className="h-10"
                  inputMode="decimal"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={saving}>
                  {saving ? "Saving…" : "Add Baby"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddBaby(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <Button
              variant="outline"
              className="w-full h-11"
              onClick={() => setShowAddBaby(true)}
            >
              <Plus size={16} className="mr-2" />
              Add Baby
            </Button>
          )}
        </CardContent>
      </Card>

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
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
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
          <Button
            variant="outline"
            className="w-full h-12 text-base"
            onClick={handleExport}
            disabled={babies.length === 0}
          >
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
          <Button
            variant="destructive"
            className="w-full h-12 text-base"
            onClick={handleSignOut}
          >
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
