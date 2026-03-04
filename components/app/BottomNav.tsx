"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Milk, Baby, Moon, Pill, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/feeding", icon: Milk, label: "Feed" },
  { href: "/diaper", icon: Baby, label: "Diaper" },
  { href: "/sleep", icon: Moon, label: "Sleep" },
  { href: "/medication", icon: Pill, label: "Meds" },
  { href: "/milestones", icon: Star, label: "More" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border/60 pb-safe">
      <div className="flex items-stretch">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition-colors min-h-[56px]",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon
                size={22}
                strokeWidth={active ? 2.5 : 1.8}
                className={cn("transition-all", active && "scale-110")}
              />
              <span className="text-[10px] leading-tight">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
