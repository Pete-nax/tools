import { STATUS_LABEL, STATUS_COLOR } from "@/lib/labels";

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
        STATUS_COLOR[status] ?? STATUS_COLOR.CLOSED
      }`}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}
