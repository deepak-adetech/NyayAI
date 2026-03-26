"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
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
  LogOut,
  Wrench,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  GitCompare,
  FileSignature,
  Shield,
  PenTool,
  Receipt,
  Users,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

interface NavGroup {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  basePath: string;
  children: NavItem[];
}

type NavEntry = NavItem | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return "children" in entry;
}

const navEntries: NavEntry[] = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/cases", icon: Briefcase, label: "Cases" },
  { href: "/clients", icon: Users, label: "Clients" },
  { href: "/documents", icon: FileText, label: "Documents" },
  { href: "/hearings", icon: Calendar, label: "Hearings" },
  { href: "/ai", icon: Brain, label: "AI Assistant" },
  {
    label: "Tools",
    icon: Wrench,
    basePath: "/tools",
    children: [
      { href: "/tools/section-mapper", icon: GitCompare, label: "Section Mapper" },
      { href: "/tools/notice-generator", icon: FileSignature, label: "Notice Generator" },
      { href: "/tools/bail-drafter", icon: Shield, label: "Bail Drafter" },
      { href: "/tools/draft-generator", icon: PenTool, label: "Draft Generator" },
    ],
  },
  { href: "/sync", icon: FolderSync, label: "File Sync" },
  { href: "/invoices", icon: Receipt, label: "Invoices" },
  { href: "/billing", icon: CreditCard, label: "Billing" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const expanded = new Set<string>();
    for (const entry of navEntries) {
      if (isGroup(entry) && pathname.startsWith(entry.basePath)) {
        expanded.add(entry.basePath);
      }
    }
    return expanded;
  });

  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored !== null) {
      setCollapsed(stored === "true");
    }
    setHydrated(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  }

  const [flyout, setFlyout] = useState<string | null>(null);

  function toggleGroup(basePath: string) {
    if (collapsed) {
      // Show flyout menu instead of expanding sidebar
      setFlyout((prev) => (prev === basePath ? null : basePath));
      return;
    }
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(basePath)) next.delete(basePath);
      else next.add(basePath);
      return next;
    });
  }

  function isActive(href: string): boolean {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(href + "/");
  }

  function isGroupActive(basePath: string): boolean {
    return pathname.startsWith(basePath);
  }

  return (
    <div
      className={cn(
        "flex flex-col h-full transition-all duration-200",
        collapsed ? "w-16" : "w-64"
      )}
      style={{ background: "#1e3a5f" }}
    >
      {/* Logo & Toggle */}
      <div className="px-3 py-5 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className={cn("flex items-center gap-2", collapsed && "justify-center w-full")}>
            <Scale className="h-7 w-7 text-white flex-shrink-0" />
            {!collapsed && (
              <div>
                <div className="text-white font-bold text-lg leading-none">NyayAI</div>
                <div className="text-blue-200 text-xs">AI-Powered Legal Intelligence</div>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={toggleCollapsed}
              className="p-1.5 hover:bg-white/10 rounded-lg text-blue-200 hover:text-white transition-colors"
              title="Collapse sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>
        {collapsed && (
          <button
            onClick={toggleCollapsed}
            className="mt-3 p-1.5 hover:bg-white/10 rounded-lg text-blue-200 hover:text-white transition-colors w-full flex justify-center"
            title="Expand sidebar"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navEntries.map((entry) => {
          if (isGroup(entry)) {
            const groupActive = isGroupActive(entry.basePath);
            const expanded = expandedGroups.has(entry.basePath);
            return (
              <div key={entry.basePath}>
                <button
                  onClick={() => toggleGroup(entry.basePath)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full",
                    collapsed && "justify-center px-0",
                    groupActive
                      ? "bg-white/15 text-white"
                      : "text-blue-100 hover:bg-white/10 hover:text-white"
                  )}
                  title={collapsed ? entry.label : undefined}
                >
                  <entry.icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{entry.label}</span>
                      {expanded ? (
                        <ChevronDown className="h-4 w-4 opacity-60" />
                      ) : (
                        <ChevronRight className="h-4 w-4 opacity-60" />
                      )}
                    </>
                  )}
                </button>
                {/* Expanded inline children */}
                {expanded && !collapsed && (
                  <div className="ml-4 mt-1 space-y-0.5">
                    {entry.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                          isActive(child.href)
                            ? "bg-white/20 text-white"
                            : "text-blue-200 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        <child.icon className="h-4 w-4 flex-shrink-0" />
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
                {/* Flyout menu when collapsed */}
                {collapsed && flyout === entry.basePath && (
                  <div
                    className="fixed left-16 z-50 ml-1 bg-[#1e3a5f] border border-white/20 rounded-xl shadow-2xl py-2 px-1 min-w-48"
                    style={{ top: "auto", marginTop: "-2.5rem" }}
                    onMouseLeave={() => setFlyout(null)}
                  >
                    <p className="text-blue-200 text-xs font-semibold px-3 py-1.5 uppercase tracking-wider">{entry.label}</p>
                    {entry.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={() => setFlyout(null)}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                          isActive(child.href)
                            ? "bg-white/20 text-white"
                            : "text-blue-100 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        <child.icon className="h-4 w-4 flex-shrink-0" />
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={entry.href}
              href={entry.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                collapsed && "justify-center px-0",
                isActive(entry.href)
                  ? "bg-white/20 text-white"
                  : "text-blue-100 hover:bg-white/10 hover:text-white"
              )}
              title={collapsed ? entry.label : undefined}
            >
              <entry.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{entry.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-2 py-4 border-t border-white/10">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-blue-100 hover:bg-white/10 hover:text-white transition-colors w-full",
            collapsed && "justify-center px-0"
          )}
          title={collapsed ? "Sign Out" : undefined}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );
}
