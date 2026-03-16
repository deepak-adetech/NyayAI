import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null, format = "short"): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (format === "short") {
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  return d.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function formatCurrency(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(rupees);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.substring(0, length) + "...";
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-800",
    DISPOSED: "bg-gray-100 text-gray-800",
    ARCHIVED: "bg-yellow-100 text-yellow-800",
    TRANSFERRED: "bg-blue-100 text-blue-800",
    STAYED: "bg-orange-100 text-orange-800",
    TRIAL: "bg-blue-100 text-blue-800",
    PAYMENT_FAILED: "bg-red-100 text-red-800",
    EXPIRED: "bg-red-100 text-red-800",
    CANCELLED: "bg-gray-100 text-gray-800",
    SCHEDULED: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-green-100 text-green-800",
    ADJOURNED: "bg-yellow-100 text-yellow-800",
  };
  return colors[status] ?? "bg-gray-100 text-gray-800";
}
