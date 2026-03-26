"use client";

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
    <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div>
        <p className="text-sm text-gray-500">
          {greeting}, <span className="font-semibold text-gray-800">{user.name ?? "Lawyer"}</span>
        </p>
      </div>
    </div>
  );
}
