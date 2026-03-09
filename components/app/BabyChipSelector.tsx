"use client";

import { cn } from "@/lib/utils";
import { useDashboard, type Baby } from "@/components/app/DashboardProvider";

interface BabyChipSelectorProps {
  selectedId: string | null;
  onSelect: (baby: Baby) => void;
  showError?: boolean;
}

export function BabyChipSelector({ selectedId, onSelect, showError }: BabyChipSelectorProps) {
  const { babies } = useDashboard();

  if (babies.length <= 1) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2 flex-wrap">
        {babies.map((baby) => {
          const isSelected = baby.id === selectedId;
          return (
            <button
              key={baby.id}
              type="button"
              onClick={() => onSelect(baby)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : showError
                  ? "bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {baby.firstName}
            </button>
          );
        })}
      </div>
      {showError && (
        <p className="text-xs text-destructive font-medium">Please select a baby first</p>
      )}
    </div>
  );
}
