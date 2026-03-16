export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Settings, User, Bell, Shield, Mail } from "lucide-react";
import SettingsForm from "./SettingsForm";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id! },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      barCouncilNumber: true,
      barCouncilState: true,
      firmName: true,
      address: true,
      city: true,
      state: true,
      pincode: true,
      timezone: true,
      avatarUrl: true,
    },
  });

  if (!user) redirect("/login");

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="h-7 w-7 text-[#1e3a5f]" />
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
          <p className="text-gray-500 text-sm">Manage your profile and preferences</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Profile */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-gray-500" />
            Profile Information
          </h2>
          <SettingsForm user={user} />
        </div>

        {/* Notification Preferences */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Bell className="h-5 w-5 text-gray-500" />
            Notification Preferences
          </h2>
          <div className="space-y-3">
            {[
              {
                label: "Hearing reminders (3 days before)",
                detail: "Email reminder 3 days before each hearing",
              },
              {
                label: "Hearing reminders (1 day before)",
                detail: "Email reminder the day before each hearing",
              },
              {
                label: "Hearing reminders (morning of)",
                detail: "Email reminder on the morning of each hearing",
              },
              {
                label: "New document notifications",
                detail: "Alert when a document is auto-synced to a case",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between py-2"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.detail}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-3 py-1 rounded-full">
                  ✓ Enabled
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-4">
            Notification settings are managed automatically. SMS and WhatsApp reminders
            require phone number and will be added in future updates.
          </p>
        </div>

        {/* Security */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-gray-500" />
            Security
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-gray-800">Password</p>
                <p className="text-xs text-gray-500">
                  Change your account password
                </p>
              </div>
              <a
                href="/settings/change-password"
                className="text-sm text-[#1e3a5f] hover:underline font-medium"
              >
                Change Password
              </a>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-800">
                  Session Management
                </p>
                <p className="text-xs text-gray-500">
                  Sessions expire after 7 days of inactivity
                </p>
              </div>
              <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                Active
              </span>
            </div>
          </div>
        </div>

        {/* Data & Privacy */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Mail className="h-5 w-5 text-gray-500" />
            Inbound Email
          </h2>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-700 mb-2">
              <strong>Your court email forwarding address:</strong>
            </p>
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
              <code className="text-sm text-[#1e3a5f] font-mono">
                {user.email.split("@")[0]}.cases@inbox.nyayasahayak.com
              </code>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Forward court emails here. AI will automatically extract case numbers,
              hearing dates, and file them to the correct case.
            </p>
          </div>
        </div>

        {/* Danger zone */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <h2 className="font-semibold text-red-800 mb-2">Danger Zone</h2>
          <p className="text-sm text-red-700 mb-3">
            Account deletion is permanent and cannot be undone. All your cases,
            documents, and data will be deleted.
          </p>
          <a
            href="mailto:support@nyayasahayak.com?subject=Account Deletion Request"
            className="text-sm text-red-600 hover:underline font-medium"
          >
            Request Account Deletion →
          </a>
        </div>
      </div>
    </div>
  );
}
