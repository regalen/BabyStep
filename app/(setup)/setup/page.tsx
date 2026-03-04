"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signUp } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

type Step = "account" | "baby" | "done";

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("account");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // Account fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Baby fields
  const [babyFirst, setBabyFirst] = useState("");
  const [babyLast, setBabyLast] = useState("");
  const [dob, setDob] = useState("");
  const [birthWeight, setBirthWeight] = useState("");

  // Check if setup is actually needed
  useEffect(() => {
    fetch("/api/setup")
      .then((r) => r.json())
      .then((data) => {
        if (!data.needsSetup) {
          router.replace("/login");
        } else {
          setChecking(false);
        }
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
    if (err) {
      setError(err.message || "Failed to create account");
    } else {
      setStep("baby");
    }
  }

  async function handleAddBaby(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
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
    setLoading(false);
    if (!res.ok) {
      setError("Failed to add baby profile");
    } else {
      setStep("done");
      setTimeout(() => router.push("/"), 1500);
    }
  }

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
            {step === "account"
              ? "Welcome! Let's get you set up."
              : step === "baby"
              ? "Now tell us about your baby."
              : "All done!"}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 justify-center">
          {(["account", "baby", "done"] as Step[]).map((s, i) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all ${
                step === s
                  ? "w-8 bg-primary"
                  : i < ["account", "baby", "done"].indexOf(step)
                  ? "w-4 bg-primary/60"
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
                    <Input
                      id="s-first"
                      placeholder="Jane"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className="h-12"
                      autoComplete="given-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="s-last">Last Name</Label>
                    <Input
                      id="s-last"
                      placeholder="Doe"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      className="h-12"
                      autoComplete="family-name"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="s-email">Email</Label>
                  <Input
                    id="s-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12"
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="s-password">Password</Label>
                  <Input
                    id="s-password"
                    type="password"
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="h-12"
                    autoComplete="new-password"
                  />
                </div>
                {error && (
                  <p className="text-destructive text-sm text-center">{error}</p>
                )}
                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold"
                  disabled={loading}
                >
                  {loading ? "Creating…" : "Continue →"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Your data never leaves your server.
                </p>
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
                    <Input
                      id="b-first"
                      placeholder="Emma"
                      value={babyFirst}
                      onChange={(e) => setBabyFirst(e.target.value)}
                      required
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="b-last">Last Name</Label>
                    <Input
                      id="b-last"
                      placeholder="Doe"
                      value={babyLast}
                      onChange={(e) => setBabyLast(e.target.value)}
                      required
                      className="h-12"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="b-dob">Date of Birth</Label>
                  <Input
                    id="b-dob"
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    required
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="b-weight">
                    Birth Weight (grams){" "}
                    <span className="text-muted-foreground text-sm">(optional)</span>
                  </Label>
                  <Input
                    id="b-weight"
                    type="number"
                    placeholder="e.g. 3400"
                    value={birthWeight}
                    onChange={(e) => setBirthWeight(e.target.value)}
                    className="h-12"
                    inputMode="decimal"
                  />
                </div>
                {error && (
                  <p className="text-destructive text-sm text-center">{error}</p>
                )}
                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold"
                  disabled={loading}
                >
                  {loading ? "Saving…" : "Let's Go! →"}
                </Button>
              </form>
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
