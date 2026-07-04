export const STATUS_LABEL: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  ESCALATED: "Escalated",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export const STATUS_COLOR: Record<string, string> = {
  OPEN: "text-status-info bg-status-info/10 border-status-info/30",
  IN_PROGRESS: "text-status-warn bg-status-warn/10 border-status-warn/30",
  ESCALATED: "text-status-down bg-status-down/10 border-status-down/30",
  RESOLVED: "text-status-up bg-status-up/10 border-status-up/30",
  CLOSED: "text-ink-muted bg-base-panel2 border-base-border",
};

export const PRIORITY_LABEL: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

export const PRIORITY_COLOR: Record<string, string> = {
  LOW: "text-ink-muted bg-base-panel2 border-base-border",
  MEDIUM: "text-status-info bg-status-info/10 border-status-info/30",
  HIGH: "text-status-warn bg-status-warn/10 border-status-warn/30",
  CRITICAL: "text-status-down bg-status-down/10 border-status-down/30",
};

export const CATEGORY_LABEL: Record<string, string> = {
  ONT_CPE: "ONT / CPE",
  PON_OPTICAL: "PON optical",
  VLAN: "VLAN",
  DHCP_PPPOE: "DHCP / PPPoE",
  WIFI_LAN: "Wi-Fi / LAN",
  BACKEND_API: "Backend / API",
  CORE_UPLINK: "Core uplink",
  OTHER: "Other",
};

export const DEVICE_TYPE_LABEL: Record<string, string> = {
  ONT: "ONT",
  OLT: "OLT",
  ROUTER: "Router",
  SWITCH: "Switch",
  SERVER: "Server",
  ACCESS_POINT: "Access point",
  OTHER: "Other",
};

export const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  ENGINEER: "Engineer",
  VIEWER: "Viewer",
};
