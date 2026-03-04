"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn, signUp } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect to /setup if this is a first-time install
  useEffect(() => {
    fetch("/api/setup")
      .then((r) => r.json())
      .then((data) => {
        if (data.needsSetup) router.replace("/setup");
      });
  }, [router]);

  // Sign-in form
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  // Register form
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: err } = await signIn.email({
      email: signInEmail,
      password: signInPassword,
    });
    setLoading(false);
    if (err) {
      setError(err.message || "Invalid credentials");
    } else {
      router.push("/");
      router.refresh();
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: err } = await signUp.email({
      email: regEmail,
      password: regPassword,
      name: `${firstName} ${lastName}`,
      firstName,
      lastName,
    } as Parameters<typeof signUp.email>[0]);
    setLoading(false);
    if (err) {
      setError(err.message || "Registration failed");
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo / Brand */}
        <div className="text-center space-y-1">
          <div className="text-5xl">👶</div>
          <h1 className="text-3xl font-bold text-foreground">BabyStep</h1>
          <p className="text-muted-foreground text-sm">Your private baby tracker</p>
        </div>

        <Card className="border-border/50 shadow-lg">
          <Tabs defaultValue="signin">
            <CardHeader className="pb-0">
              <TabsList className="w-full">
                <TabsTrigger value="signin" className="flex-1 text-base">
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="register" className="flex-1 text-base">
                  Register
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            {/* Sign In */}
            <TabsContent value="signin">
              <CardContent className="pt-4">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-base">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="you@example.com"
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      required
                      className="h-12 text-base"
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="text-base">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      required
                      className="h-12 text-base"
                      autoComplete="current-password"
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
                    {loading ? "Signing in…" : "Sign In"}
                  </Button>
                </form>
              </CardContent>
            </TabsContent>

            {/* Register */}
            <TabsContent value="register">
              <CardContent className="pt-4">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="first-name" className="text-base">First Name</Label>
                      <Input
                        id="first-name"
                        placeholder="Jane"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        className="h-12 text-base"
                        autoComplete="given-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last-name" className="text-base">Last Name</Label>
                      <Input
                        id="last-name"
                        placeholder="Doe"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        className="h-12 text-base"
                        autoComplete="family-name"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-email" className="text-base">Email</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="you@example.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      required
                      className="h-12 text-base"
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password" className="text-base">Password</Label>
                    <Input
                      id="reg-password"
                      type="password"
                      placeholder="Create a password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      required
                      minLength={8}
                      className="h-12 text-base"
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
                    {loading ? "Creating account…" : "Create Account"}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Your data stays on your server. Always.
                  </p>
                </form>
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </main>
  );
}
