import { PRIORITY_LABEL, PRIORITY_COLOR } from "@/lib/labels";

export default function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
        PRIORITY_COLOR[priority] ?? PRIORITY_COLOR.MEDIUM
      }`}
    >
      {PRIORITY_LABEL[priority] ?? priority}
    </span>
  );
}
