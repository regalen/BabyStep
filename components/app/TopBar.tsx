"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TopBarProps {
  babyName?: string;
}

export function TopBar({ babyName }: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-sm border-b border-border/60">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <span className="text-xl">👶</span>
          <div>
            <h1 className="text-base font-semibold leading-tight text-foreground">
              {babyName ?? "BabyStep"}
            </h1>
          </div>
        </div>
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings" aria-label="Settings">
            <Settings size={20} />
          </Link>
        </Button>
      </div>
    </header>
  );
}
