import { Lock } from "lucide-react";

export function ReadOnlyBanner() {
  return (
    <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-400 text-sm font-medium">
      <Lock size={15} className="shrink-0" />
      <span>You have read-only access. Contact your admin to make changes.</span>
    </div>
  );
}
