import { BottomNav } from "@/components/app/BottomNav";
import { TopBar } from "@/components/app/TopBar";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { babies } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { cookies } from "next/headers";

async function getActiveBaby(userId: string) {
  const result = await db
    .select()
    .from(babies)
    .where(eq(babies.userId, userId))
    .limit(1);
  return result[0] ?? null;
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let babyName: string | undefined;

  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (session?.user) {
      const baby = await getActiveBaby(session.user.id);
      if (baby) babyName = baby.firstName;
    }
  } catch {
    // session unavailable — middleware will redirect if needed
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopBar babyName={babyName} />
      <main className="flex-1 pb-20 overflow-y-auto">{children}</main>
      <BottomNav />
    </div>
  );
}
