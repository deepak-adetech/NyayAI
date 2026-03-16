"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, Lock, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export default function ChangePasswordPage() {
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  }

  // Password strength checks
  const checks = {
    length: formData.newPassword.length >= 8,
    uppercase: /[A-Z]/.test(formData.newPassword),
    number: /[0-9]/.test(formData.newPassword),
    match:
      formData.newPassword === formData.confirmPassword &&
      formData.confirmPassword.length > 0,
  };
  const strength = Object.values(checks).filter(Boolean).length;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (formData.newPassword !== formData.confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to change password");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch {
      setError("Request failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/settings" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Change Password</h1>
          <p className="text-gray-500 text-sm">Update your account password</p>
        </div>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3 text-green-700">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-medium">Password changed successfully</p>
            <p className="text-sm text-green-600">Your account is now secured with the new password.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <Lock className="h-5 w-5 text-[#1e3a5f]" />
          <h2 className="font-semibold text-gray-800">Update Password</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                required
                autoComplete="current-password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-[#1e3a5f] outline-none text-sm"
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                required
                autoComplete="new-password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-[#1e3a5f] outline-none text-sm"
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Strength indicator */}
            {formData.newPassword.length > 0 && (
              <div className="mt-2">
                <div className="flex gap-1 mb-2">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`h-1.5 flex-1 rounded-full transition-colors ${
                        strength >= level
                          ? strength <= 1
                            ? "bg-red-400"
                            : strength === 2
                            ? "bg-yellow-400"
                            : strength === 3
                            ? "bg-blue-400"
                            : "bg-green-500"
                          : "bg-gray-200"
                      }`}
                    />
                  ))}
                </div>
                <ul className="space-y-1">
                  {[
                    { key: "length", label: "At least 8 characters" },
                    { key: "uppercase", label: "One uppercase letter" },
                    { key: "number", label: "One number" },
                  ].map(({ key, label }) => (
                    <li
                      key={key}
                      className={`text-xs flex items-center gap-1 ${
                        checks[key as keyof typeof checks]
                          ? "text-green-600"
                          : "text-gray-400"
                      }`}
                    >
                      <span>{checks[key as keyof typeof checks] ? "✓" : "○"}</span>
                      {label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                autoComplete="new-password"
                className={`w-full border rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-[#1e3a5f] outline-none text-sm ${
                  formData.confirmPassword.length > 0
                    ? checks.match
                      ? "border-green-400"
                      : "border-red-300"
                    : "border-gray-300"
                }`}
                placeholder="Confirm new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {formData.confirmPassword.length > 0 && (
              <p
                className={`text-xs mt-1 ${
                  checks.match ? "text-green-600" : "text-red-500"
                }`}
              >
                {checks.match ? "✓ Passwords match" : "✗ Passwords do not match"}
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading || !checks.length || !checks.uppercase || !checks.number || !checks.match}
              className="flex items-center gap-2 bg-[#1e3a5f] text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-[#162d4a] disabled:opacity-50 transition-colors text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Updating...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" /> Update Password
                </>
              )}
            </button>
            <Link
              href="/settings"
              className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors text-sm"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>

      {/* Security tips */}
      <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">Security Tips</h3>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• Use a unique password not used on other sites</li>
          <li>• Avoid personal information like your name or DOB</li>
          <li>• Consider using a password manager for strong, unique passwords</li>
          <li>• Change your password periodically for better security</li>
        </ul>
      </div>
    </div>
  );
}
