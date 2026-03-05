"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signUp } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { parseWeightToGrams } from "@/lib/units";
import { cn } from "@/lib/utils";

type Step = "account" | "baby" | "units" | "activities" | "done";
type UnitSystem = "metric" | "imperial";

const STEPS: Step[] = ["account", "baby", "units", "activities", "done"];

const ALL_ACTIVITIES = [
  { key: "feeding", label: "Feeding", emoji: "🤱" },
  { key: "diaper", label: "Diaper", emoji: "👶" },
  { key: "sleep", label: "Sleep", emoji: "🌙" },
  { key: "medication", label: "Medication", emoji: "💊" },
  { key: "milestones", label: "Milestones", emoji: "⭐" },
];

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("account");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // Account
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Baby
  const [babyFirst, setBabyFirst] = useState("");
  const [babyLast, setBabyLast] = useState("");
  const [dob, setDob] = useState("");
  const [birthWeight, setBirthWeight] = useState("");
  const [units, setUnits] = useState<UnitSystem>("metric");

  // Activities
  const [enabledActivities, setEnabledActivities] = useState<string[]>(
    ALL_ACTIVITIES.map((a) => a.key)
  );

  useEffect(() => {
    fetch("/api/setup")
      .then((r) => r.json())
      .then((data) => {
        if (!data.needsSetup) router.replace("/login");
        else setChecking(false);
      });
  }, [router]);

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: err } = await signUp.email({
      email,
      password,
      name: `${firstName} ${lastName}`,
      firstName,
      lastName,
    } as Parameters<typeof signUp.email>[0]);
    setLoading(false);
    if (err) setError(err.message || "Failed to create account");
    else setStep("baby");
  }

  async function handleAddBaby(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const weightGrams = birthWeight
      ? parseWeightToGrams(birthWeight, units)
      : null;
    const res = await fetch("/api/babies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: babyFirst,
        lastName: babyLast,
        dob,
        birthWeightGrams: weightGrams,
      }),
    });
    setLoading(false);
    if (!res.ok) setError("Failed to add baby profile");
    else setStep("units");
  }

  async function handleFinish() {
    setLoading(true);
    await fetch("/api/app-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ units, enabledActivities }),
    });
    setLoading(false);
    setStep("done");
    setTimeout(() => router.push("/"), 1500);
  }

  function toggleActivity(key: string) {
    setEnabledActivities((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  const stepIndex = STEPS.indexOf(step);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading…</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand */}
        <div className="text-center space-y-1">
          <div className="text-5xl">👶</div>
          <h1 className="text-3xl font-bold text-foreground">BabyStep</h1>
          <p className="text-muted-foreground text-sm">
            {step === "account" && "Welcome! Let's get you set up."}
            {step === "baby" && "Tell us about your baby."}
            {step === "units" && "Choose your units of measure."}
            {step === "activities" && "What do you want to track?"}
            {step === "done" && "All done!"}
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 justify-center">
          {STEPS.filter((s) => s !== "done").map((s, i) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all ${
                i < stepIndex
                  ? "w-4 bg-primary/60"
                  : i === stepIndex
                  ? "w-8 bg-primary"
                  : "w-4 bg-border"
              }`}
            />
          ))}
        </div>

        {/* Step: Account */}
        {step === "account" && (
          <Card className="shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Create Your Account</CardTitle>
              <CardDescription>You&apos;ll use this to sign in.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateAccount} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="s-first">First Name</Label>
                    <Input id="s-first" placeholder="Jane" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="h-12" autoComplete="given-name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="s-last">Last Name</Label>
                    <Input id="s-last" placeholder="Doe" value={lastName} onChange={(e) => setLastName(e.target.value)} required className="h-12" autoComplete="family-name" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="s-email">Email</Label>
                  <Input id="s-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12" autoComplete="email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="s-password">Password</Label>
                  <Input id="s-password" type="password" placeholder="Min. 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="h-12" autoComplete="new-password" />
                </div>
                {error && <p className="text-destructive text-sm text-center">{error}</p>}
                <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={loading}>
                  {loading ? "Creating…" : "Continue →"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">Your data never leaves your server.</p>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step: Baby */}
        {step === "baby" && (
          <Card className="shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Add Your Baby</CardTitle>
              <CardDescription>You can add more babies later in Settings.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddBaby} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="b-first">First Name</Label>
                    <Input id="b-first" placeholder="Emma" value={babyFirst} onChange={(e) => setBabyFirst(e.target.value)} required className="h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="b-last">Last Name</Label>
                    <Input id="b-last" placeholder="Doe" value={babyLast} onChange={(e) => setBabyLast(e.target.value)} required className="h-12" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="b-dob">Date of Birth</Label>
                  <Input id="b-dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} required className="h-12" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="b-weight">
                    Birth Weight{" "}
                    <span className="text-muted-foreground text-sm">
                      ({units === "imperial" ? "lbs" : "kg"}, optional)
                    </span>
                  </Label>
                  <Input id="b-weight" type="number" placeholder={units === "imperial" ? "e.g. 7.5" : "e.g. 3.4"} value={birthWeight} onChange={(e) => setBirthWeight(e.target.value)} className="h-12" inputMode="decimal" />
                </div>
                {error && <p className="text-destructive text-sm text-center">{error}</p>}
                <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={loading}>
                  {loading ? "Saving…" : "Continue →"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step: Units */}
        {step === "units" && (
          <Card className="shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Units of Measure</CardTitle>
              <CardDescription>You can change this later in Settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setUnits("metric")}
                  className={cn(
                    "flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all",
                    units === "metric"
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-border/80"
                  )}
                >
                  <span className="text-2xl">🌍</span>
                  <span className="font-semibold">Metric</span>
                  <span className="text-xs text-muted-foreground">ml, kg, cm</span>
                </button>
                <button
                  onClick={() => setUnits("imperial")}
                  className={cn(
                    "flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all",
                    units === "imperial"
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-border/80"
                  )}
                >
                  <span className="text-2xl">🇺🇸</span>
                  <span className="font-semibold">Imperial</span>
                  <span className="text-xs text-muted-foreground">oz, lbs, in</span>
                </button>
              </div>
              <Button className="w-full h-12 text-base font-semibold" onClick={() => setStep("activities")}>
                Continue →
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step: Activities */}
        {step === "activities" && (
          <Card className="shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">What to Track</CardTitle>
              <CardDescription>Select the activities you want to log. You can change these in Settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {ALL_ACTIVITIES.map(({ key, label, emoji }) => {
                  const on = enabledActivities.includes(key);
                  return (
                    <button
                      key={key}
                      onClick={() => toggleActivity(key)}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all",
                        on ? "border-primary bg-primary/10" : "border-border"
                      )}
                    >
                      <span className="flex items-center gap-3 font-medium">
                        <span className="text-xl">{emoji}</span>
                        {label}
                      </span>
                      <span className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs",
                        on ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground"
                      )}>
                        {on && "✓"}
                      </span>
                    </button>
                  );
                })}
              </div>
              <Button
                className="w-full h-12 text-base font-semibold"
                onClick={handleFinish}
                disabled={loading || enabledActivities.length === 0}
              >
                {loading ? "Saving…" : "Let's Go! →"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step: Done */}
        {step === "done" && (
          <Card className="shadow-lg text-center">
            <CardContent className="pt-8 pb-8 space-y-4">
              <div className="text-6xl">🎉</div>
              <h2 className="text-xl font-bold">You&apos;re all set!</h2>
              <p className="text-muted-foreground text-sm">Redirecting to the dashboard…</p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
