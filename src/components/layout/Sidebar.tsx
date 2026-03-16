"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Scale,
  LayoutDashboard,
  Briefcase,
  FileText,
  Calendar,
  Brain,
  CreditCard,
  Settings,
  FolderSync,
  Users,
  LogOut,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/cases", icon: Briefcase, label: "Cases" },
  { href: "/documents", icon: FileText, label: "Documents" },
  { href: "/hearings", icon: Calendar, label: "Hearings" },
  { href: "/ai", icon: Brain, label: "AI Assistant" },
  { href: "/sync", icon: FolderSync, label: "File Sync" },
  { href: "/billing", icon: CreditCard, label: "Billing" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 flex flex-col h-full" style={{ background: "#1e3a5f" }}>
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Scale className="h-7 w-7 text-white" />
          <div>
            <div className="text-white font-bold text-lg leading-none">NyayaSahayak</div>
            <div className="text-blue-200 text-xs">न्यायसहायक</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            (item.href === "/dashboard" && pathname === "/dashboard") ||
            (item.href !== "/dashboard" && (pathname === item.href || pathname.startsWith(item.href + "/")));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-white/20 text-white"
                  : "text-blue-100 hover:bg-white/10 hover:text-white"
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-blue-100 hover:bg-white/10 hover:text-white transition-colors w-full"
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
