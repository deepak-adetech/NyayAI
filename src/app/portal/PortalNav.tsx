"use client";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function PortalNav() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/portal/login" })}
      className="flex items-center gap-1 text-sm text-blue-200 hover:text-white transition-colors"
    >
      <LogOut className="h-4 w-4" />
      Sign Out
    </button>
  );
}
