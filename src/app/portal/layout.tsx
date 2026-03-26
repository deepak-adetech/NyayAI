import { auth } from "@/lib/auth";
import { Scale } from "lucide-react";
import PortalNav from "./PortalNav";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#1e3a5f] text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="h-6 w-6 text-[#D4AC0D]" />
          <span className="font-bold text-lg">NyayAI</span>
          <span className="text-blue-300 text-sm ml-2">Client Portal</span>
        </div>
        {session?.user && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-blue-200">{session.user.name}</span>
            <PortalNav />
          </div>
        )}
      </header>
      <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
