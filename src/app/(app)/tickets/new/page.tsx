import { db } from "@/lib/db";
import NewTicketForm from "@/components/NewTicketForm";

export default async function NewTicketPage() {
  const devices = await db.device.findMany({
    where: { isActive: true },
    select: { id: true, name: true, clusterTag: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">New ticket</h1>
        <p className="text-sm text-ink-muted mt-1">Log a fault as a single, well-scoped investigation.</p>
      </div>
      <NewTicketForm devices={devices} />
    </div>
  );
}
