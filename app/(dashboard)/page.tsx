import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { babies, feedings, diapers, sleeps } from "@/lib/db/schema";
import { eq, desc, gte, and } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Milk, Baby, Moon, Pill, Star, Plus } from "lucide-react";
import { formatDistanceToNow } from "@/lib/time";

async function getDashboardData(babyId: string) {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const [lastFeeding, lastDiaper, lastSleep, activeSleep] = await Promise.all([
    db
      .select()
      .from(feedings)
      .where(eq(feedings.babyId, babyId))
      .orderBy(desc(feedings.startTime))
      .limit(1),
    db
      .select()
      .from(diapers)
      .where(eq(diapers.babyId, babyId))
      .orderBy(desc(diapers.timestamp))
      .limit(1),
    db
      .select()
      .from(sleeps)
      .where(and(eq(sleeps.babyId, babyId)))
      .orderBy(desc(sleeps.startTime))
      .limit(1),
    db
      .select()
      .from(sleeps)
      .where(and(eq(sleeps.babyId, babyId)))
      .orderBy(desc(sleeps.startTime))
      .limit(1),
  ]);

  return {
    lastFeeding: lastFeeding[0] ?? null,
    lastDiaper: lastDiaper[0] ?? null,
    lastSleep: lastSleep[0] ?? null,
    isSleeping: lastSleep[0] ? !lastSleep[0].endTime : false,
  };
}

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const userBabies = await db
    .select()
    .from(babies)
    .where(eq(babies.userId, session.user.id));

  if (userBabies.length === 0) {
    redirect("/settings?tab=baby&new=true");
  }

  const baby = userBabies[0];
  const data = await getDashboardData(baby.id);

  const quickActions = [
    { href: "/feeding", icon: Milk, label: "Feeding", color: "text-amber-500" },
    { href: "/diaper", icon: Baby, label: "Diaper", color: "text-sky-500" },
    { href: "/sleep", icon: Moon, label: "Sleep", color: "text-violet-500" },
    { href: "/medication", icon: Pill, label: "Medication", color: "text-rose-500" },
    { href: "/milestones", icon: Star, label: "Milestone", color: "text-yellow-500" },
  ];

  return (
    <div className="p-4 space-y-5 max-w-lg mx-auto">
      {/* Greeting */}
      <div className="pt-2">
        <p className="text-muted-foreground text-sm">Today</p>
        <h2 className="text-2xl font-bold">
          {baby.firstName}&apos;s Day
        </h2>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-1 gap-3">
        {/* Last feeding */}
        <Link href="/feeding">
          <Card className="hover:bg-accent/30 transition-colors active:scale-[0.98]">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="w-11 h-11 rounded-full bg-amber-500/15 flex items-center justify-center">
                <Milk size={22} className="text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Last feeding</p>
                <p className="font-semibold text-foreground">
                  {data.lastFeeding
                    ? formatDistanceToNow(data.lastFeeding.startTime)
                    : "No feedings yet"}
                </p>
                {data.lastFeeding && (
                  <p className="text-xs text-muted-foreground capitalize">
                    {data.lastFeeding.type}
                    {data.lastFeeding.side ? ` · ${data.lastFeeding.side}` : ""}
                    {data.lastFeeding.amountMl
                      ? ` · ${data.lastFeeding.amountMl}ml`
                      : ""}
                  </p>
                )}
              </div>
              <Plus size={18} className="text-muted-foreground shrink-0" />
            </CardContent>
          </Card>
        </Link>

        {/* Last diaper */}
        <Link href="/diaper">
          <Card className="hover:bg-accent/30 transition-colors active:scale-[0.98]">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="w-11 h-11 rounded-full bg-sky-500/15 flex items-center justify-center">
                <Baby size={22} className="text-sky-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Last diaper</p>
                <p className="font-semibold text-foreground">
                  {data.lastDiaper
                    ? formatDistanceToNow(data.lastDiaper.timestamp)
                    : "No changes yet"}
                </p>
                {data.lastDiaper && (
                  <p className="text-xs text-muted-foreground capitalize">
                    {data.lastDiaper.type}
                    {data.lastDiaper.color ? ` · ${data.lastDiaper.color}` : ""}
                  </p>
                )}
              </div>
              <Plus size={18} className="text-muted-foreground shrink-0" />
            </CardContent>
          </Card>
        </Link>

        {/* Sleep */}
        <Link href="/sleep">
          <Card className="hover:bg-accent/30 transition-colors active:scale-[0.98]">
            <CardContent className="flex items-center gap-4 p-4">
              <div
                className={`w-11 h-11 rounded-full flex items-center justify-center ${
                  data.isSleeping ? "bg-violet-500/30" : "bg-violet-500/15"
                }`}
              >
                <Moon
                  size={22}
                  className={`text-violet-500 ${data.isSleeping ? "animate-pulse" : ""}`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Sleep</p>
                <p className="font-semibold text-foreground">
                  {data.isSleeping
                    ? "Currently sleeping…"
                    : data.lastSleep
                    ? `Woke ${formatDistanceToNow(data.lastSleep.endTime ?? data.lastSleep.startTime)}`
                    : "No sleep logged"}
                </p>
              </div>
              <Plus size={18} className="text-muted-foreground shrink-0" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Quick actions */}
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-3">Quick Log</p>
        <div className="grid grid-cols-5 gap-2">
          {quickActions.map(({ href, icon: Icon, label, color }) => (
            <Link key={href} href={href}>
              <div className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-card border border-border/60 hover:bg-accent/30 transition-colors active:scale-95">
                <Icon size={24} className={color} />
                <span className="text-[10px] text-muted-foreground font-medium leading-tight text-center">
                  {label}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
