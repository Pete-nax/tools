import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(1).max(200),
});

export const ticketCreateSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(3).max(5000),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  category: z.enum([
    "ONT_CPE",
    "PON_OPTICAL",
    "VLAN",
    "DHCP_PPPOE",
    "WIFI_LAN",
    "BACKEND_API",
    "CORE_UPLINK",
    "OTHER",
  ]).default("OTHER"),
  clusterTag: z.string().trim().max(100).optional().or(z.literal("")),
  deviceId: z.string().trim().max(50).optional().or(z.literal("")),
  reporterName: z.string().trim().max(150).optional().or(z.literal("")),
  reporterContact: z.string().trim().max(150).optional().or(z.literal("")),
});

export const ticketUpdateSchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  description: z.string().trim().min(3).max(5000).optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "ESCALATED", "RESOLVED", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  category: z.enum([
    "ONT_CPE",
    "PON_OPTICAL",
    "VLAN",
    "DHCP_PPPOE",
    "WIFI_LAN",
    "BACKEND_API",
    "CORE_UPLINK",
    "OTHER",
  ]).optional(),
  clusterTag: z.string().trim().max(100).nullable().optional(),
  assigneeId: z.string().trim().max(50).nullable().optional(),
});

export const commentCreateSchema = z.object({
  body: z.string().trim().min(1).max(3000),
});

const kbBlockSchema = z.object({
  type: z.enum(["heading", "text", "checklist", "code"]),
  text: z.string().max(4000),
});

export const kbCreateSchema = z.object({
  title: z.string().trim().min(3).max(200),
  category: z.string().trim().min(1).max(80),
  tags: z.array(z.string().trim().max(40)).max(20).default([]),
  content: z.array(kbBlockSchema).min(1).max(200),
});

export const kbUpdateSchema = kbCreateSchema.partial();

export const deviceCreateSchema = z.object({
  name: z.string().trim().min(2).max(150),
  type: z.enum(["ONT", "OLT", "ROUTER", "SWITCH", "SERVER", "ACCESS_POINT", "OTHER"]),
  host: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .regex(
      /^[a-zA-Z0-9.\-:]+$/,
      "Host must be a valid hostname or IP address (letters, numbers, dots, hyphens, colons only)"
    ),
  port: z.coerce.number().int().min(1).max(65535).optional(),
  checkType: z.enum(["TCP", "HTTP", "HTTPS", "DNS"]),
  clusterTag: z.string().trim().max(100).optional().or(z.literal("")),
  ownerTeam: z.string().trim().max(100).optional().or(z.literal("")),
  expectedUptimeTarget: z.coerce.number().min(0).max(100).default(99.9),
  failureThreshold: z.coerce.number().int().min(1).max(20).default(3),
});

export const deviceUpdateSchema = deviceCreateSchema.partial().extend({
  isActive: z.boolean().optional(),
});
