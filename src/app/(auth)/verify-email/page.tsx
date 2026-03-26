"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Scale, Mail, AlertCircle, CheckCircle } from "lucide-react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  // Error states from the verify-email API redirect
  if (error === "expired") {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-md p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Link expired</h2>
        <p className="text-gray-500 text-sm mb-6">
          Your verification link has expired. Links are valid for 24 hours. Please sign up again or contact support.
        </p>
        <Link
          href="/register"
          className="block w-full bg-[#1e3a5f] text-white py-2.5 rounded-lg font-semibold hover:bg-[#162d4a] transition-colors text-center"
        >
          Sign Up Again
        </Link>
      </div>
    );
  }

  if (error === "invalid" || error === "notfound") {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-md p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Invalid link</h2>
        <p className="text-gray-500 text-sm mb-6">
          This verification link is invalid or has already been used. If you&apos;re having trouble, please contact support.
        </p>
        <Link
          href="/login"
          className="block w-full bg-[#1e3a5f] text-white py-2.5 rounded-lg font-semibold hover:bg-[#162d4a] transition-colors text-center"
        >
          Back to Sign In
        </Link>
      </div>
    );
  }

  // Default: "check your email" state (shown after signup redirect)
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-md p-8 text-center">
      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Mail className="h-8 w-8 text-[#1e3a5f]" />
      </div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Check your inbox</h2>
      <p className="text-gray-500 text-sm mb-2">
        We&apos;ve sent a verification link to your email address.
      </p>
      <p className="text-gray-400 text-xs mb-6">
        Click the link in the email to activate your account. The link expires in 24 hours. Don&apos;t forget to check your spam folder.
      </p>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6 text-left">
        <p className="text-xs text-blue-800">
          <strong>Didn&apos;t receive it?</strong> Check your spam or junk folder, or make sure you entered the correct email address when signing up.
        </p>
      </div>
      <Link
        href="/login"
        className="block w-full bg-[#1e3a5f] text-white py-2.5 rounded-lg font-semibold hover:bg-[#162d4a] transition-colors text-center"
      >
        Back to Sign In
      </Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2">
            <Scale className="h-8 w-8 text-[#1e3a5f]" />
            <span className="text-2xl font-bold text-[#1e3a5f]">NyayAI</span>
          </div>
        </div>
        <Suspense fallback={
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-md p-8 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a5f]" />
          </div>
        }>
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
