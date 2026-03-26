import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Scale, Users, CreditCard, BarChart2, LogOut, Brain } from "lucide-react";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const user = session?.user as { role?: string; name?: string; email?: string } | undefined;

  if (!session || user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: BarChart2 },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
    { href: "/admin/payments", label: "Payments", icon: CreditCard },
    { href: "/admin/rag", label: "AI Knowledge", icon: Brain },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#1e3a5f] text-white flex flex-col fixed h-full">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <Scale className="h-6 w-6" />
            <span className="font-bold text-lg">NyayAI</span>
          </div>
          <div className="text-blue-300 text-xs">Admin Panel</div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-blue-100 hover:bg-white/10 hover:text-white transition-colors"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="text-xs text-blue-300 mb-3">
            <div className="font-medium text-white">{user?.name}</div>
            <div>{user?.email}</div>
          </div>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-blue-300 hover:text-white text-xs transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Back to Dashboard
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 flex-1 p-8">
        {children}
      </main>
    </div>
  );
}
