"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { useDashboard } from "@/components/app/DashboardProvider";
import { formatAge, formatDob } from "@/lib/time";

export default function HomePage() {
  const { babies } = useDashboard();

  if (babies.length === 0) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      <div className="pt-2">
        <h2 className="text-2xl font-bold">Good {getTimeOfDay()}</h2>
        <p className="text-muted-foreground text-sm">
          {babies.length === 1 ? "Tap to see today's summary" : "Select a baby to get started"}
        </p>
      </div>

      <div className="space-y-8">
        {babies.map((baby) => (
          <Link key={baby.id} href={`/baby/${baby.id}`} className="block">
            <Card className="hover:bg-accent/30 transition-colors active:scale-[0.98] shadow-sm">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-2xl shrink-0">
                  👶
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-lg leading-tight">
                    {baby.firstName} {baby.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatAge(baby.dob)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Born {formatDob(baby.dob)}
                  </p>
                </div>
                <ChevronRight size={20} className="text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
