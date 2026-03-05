import { BottomNav } from "@/components/app/BottomNav";
import { TopBar } from "@/components/app/TopBar";
import { DashboardProvider } from "@/components/app/DashboardProvider";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { babies } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let babyList: (typeof babies.$inferSelect)[] = [];

  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (session?.user) {
      babyList = await db
        .select()
        .from(babies)
        .where(eq(babies.userId, session.user.id));
    }
  } catch {
    // session unavailable — proxy will redirect if needed
  }

  return (
    <DashboardProvider babies={babyList}>
      <div className="min-h-screen flex flex-col bg-background">
        <TopBar babies={babyList} />
        <main className="flex-1 pb-20 overflow-y-auto">{children}</main>
        <BottomNav />
      </div>
    </DashboardProvider>
  );
}
