import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canManageDevices } from "@/lib/rbac";
import DeviceForm from "@/components/DeviceForm";

export default async function EditDevicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!canManageDevices(session)) redirect(`/devices/${id}`);

  const device = await db.device.findUnique({ where: { id } });
  if (!device) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Edit device</h1>
      </div>
      <DeviceForm existing={device} />
    </div>
  );
}
