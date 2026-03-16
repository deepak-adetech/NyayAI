"use client";
import { Bell, User } from "lucide-react";

interface TopBarProps {
  user: {
    name?: string | null;
    email?: string | null;
  };
}

export default function TopBar({ user }: TopBarProps) {
  const now = new Date();
  const hours = now.getHours();
  const greeting =
    hours < 12 ? "Good morning" : hours < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div>
        <p className="text-sm text-gray-500">{greeting},</p>
        <p className="font-semibold text-gray-800">{user.name ?? "Lawyer"}</p>
      </div>
      <div className="flex items-center gap-3">
        <button className="relative p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
          <Bell className="h-5 w-5" />
        </button>
        <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ background: "#1e3a5f" }}>
          <User className="h-4 w-4 text-white" />
        </div>
      </div>
    </div>
  );
}
