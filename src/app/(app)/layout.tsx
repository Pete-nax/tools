import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import TopBar from "@/components/TopBar";
import type { HeartbeatDevice } from "@/components/HeartbeatStrip";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const devices = await db.device.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      checks: {
        orderBy: { timestamp: "desc" },
        take: 1,
        select: { success: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const heartbeatDevices: HeartbeatDevice[] = devices.map((d) => ({
    id: d.id,
    name: d.name,
    lastSuccess: d.checks[0]?.success ?? null,
  }));

  return (
    <div className="min-h-screen flex bg-base-bg">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar session={session} devices={heartbeatDevices} />
        <main className="flex-1 p-6 md:p-8 pb-24 md:pb-8 max-w-[1400px] w-full mx-auto">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}
