import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canManageDevices } from "@/lib/rbac";
import DeviceForm from "@/components/DeviceForm";

export default async function NewDevicePage() {
  const session = await getSession();
  if (!canManageDevices(session)) redirect("/devices");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Register device</h1>
        <p className="text-sm text-ink-muted mt-1">
          Real checks only: the monitor opens an actual TCP connection, issues an actual HTTP(S) request,
          or performs an actual DNS lookup against what you enter here. Point it at anything with a
          routable address the platform can reach.
        </p>
      </div>
      <DeviceForm />
    </div>
  );
}
