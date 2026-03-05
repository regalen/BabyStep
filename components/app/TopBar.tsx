"use client";

import Link from "next/link";
import { Settings, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useDashboard, type Baby } from "@/components/app/DashboardProvider";

interface TopBarProps {
  babies: Baby[];
}

export function TopBar({ babies }: TopBarProps) {
  const { activeBaby, setActiveBaby } = useDashboard();
  const displayName = activeBaby?.firstName ?? babies[0]?.firstName ?? "BabyStep";
  const showPicker = babies.length > 1;

  return (
    <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-sm border-b border-border/60">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <span className="text-xl">👶</span>
          {showPicker ? (
            <Sheet>
              <SheetTrigger asChild>
                <button className="flex items-center gap-1 text-base font-semibold text-foreground hover:text-primary transition-colors min-h-0">
                  {displayName}
                  <ChevronDown size={16} className="text-muted-foreground" />
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="pb-safe rounded-t-2xl">
                <SheetHeader className="mb-4">
                  <SheetTitle>Switch Baby</SheetTitle>
                </SheetHeader>
                <div className="space-y-2 pb-4">
                  {babies.map((baby) => {
                    const isActive = activeBaby?.id === baby.id;
                    return (
                      <button
                        key={baby.id}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-muted/50 hover:bg-accent transition-colors min-h-0"
                        onClick={() => setActiveBaby(baby)}
                      >
                        <div className="text-left">
                          <p className="font-semibold">
                            {baby.firstName} {baby.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Born {new Date(baby.dob).toLocaleDateString()}
                          </p>
                        </div>
                        {isActive && <Check size={18} className="text-primary shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </SheetContent>
            </Sheet>
          ) : (
            <h1 className="text-base font-semibold text-foreground">{displayName}</h1>
          )}
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
