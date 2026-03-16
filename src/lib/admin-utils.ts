// Admin utility helpers shared across admin pages

export function formatINR(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rupees);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(date));
}

export type StatusVariant =
  | "green"
  | "yellow"
  | "red"
  | "gray"
  | "blue"
  | "orange";

export function subscriptionStatusVariant(
  status: string
): StatusVariant {
  switch (status) {
    case "ACTIVE":
      return "green";
    case "TRIAL":
      return "yellow";
    case "EXPIRED":
    case "PAYMENT_FAILED":
      return "red";
    case "CANCELLED":
      return "gray";
    case "PAUSED":
      return "orange";
    default:
      return "gray";
  }
}

export function paymentStatusVariant(status: string): StatusVariant {
  switch (status?.toLowerCase()) {
    case "captured":
    case "success":
      return "green";
    case "failed":
      return "red";
    case "refunded":
      return "orange";
    case "created":
    case "authorized":
      return "yellow";
    default:
      return "gray";
  }
}

export function roleVariant(role: string): StatusVariant {
  switch (role) {
    case "ADMIN":
      return "blue";
    case "LAWYER":
      return "green";
    case "CLIENT":
      return "gray";
    default:
      return "gray";
  }
}

export const BADGE_CLASSES: Record<StatusVariant, string> = {
  green:
    "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700",
  yellow:
    "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700",
  red: "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700",
  gray: "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600",
  blue: "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700",
  orange:
    "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700",
};
