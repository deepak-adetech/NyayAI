"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Scale, CheckCircle, ArrowRight, Briefcase, Brain, FolderSync, Calendar } from "lucide-react";

const steps = [
  {
    icon: Briefcase,
    title: "Add Your First Case",
    desc: "Start by adding an active case. Include case number, court, and parties.",
    action: "Add Case",
    href: "/cases/new",
    color: "bg-blue-500",
  },
  {
    icon: Brain,
    title: "Identify BNS Sections",
    desc: "Paste FIR facts and let AI identify applicable BNS/IPC sections instantly.",
    action: "Try AI",
    href: "/ai",
    color: "bg-purple-500",
  },
  {
    icon: Calendar,
    title: "Schedule a Hearing",
    desc: "Add your next hearing date and receive automatic reminders.",
    action: "Schedule",
    href: "/hearings/new",
    color: "bg-green-500",
  },
  {
    icon: FolderSync,
    title: "Connect Local Folder",
    desc: "Link your documents folder and let AI auto-classify and file documents.",
    action: "Setup Sync",
    href: "/sync",
    color: "bg-gray-500",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState<number[]>([]);

  function markComplete(index: number) {
    if (!completed.includes(index)) {
      setCompleted((prev) => [...prev, index]);
    }
  }

  function goToDashboard() {
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a5f] via-[#1a6ea8] to-[#0f2339] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Scale className="h-8 w-8 text-[#1e3a5f]" />
            <span className="text-2xl font-bold text-[#1e3a5f]">NyayAI</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Welcome to Your Legal Workspace! 🎉
          </h1>
          <p className="text-gray-500">
            Let&apos;s set up NyayAI in 4 quick steps. Your 14-day free trial has started.
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((_, i) => (
            <div key={i} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  completed.includes(i)
                    ? "bg-green-500 text-white"
                    : i === currentStep
                    ? "bg-[#1e3a5f] text-white"
                    : "bg-gray-200 text-gray-400"
                }`}
              >
                {completed.includes(i) ? <CheckCircle className="h-4 w-4" /> : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`w-8 h-0.5 ${
                    completed.includes(i) ? "bg-green-500" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step cards */}
        <div className="space-y-3 mb-8">
          {steps.map((step, i) => (
            <div
              key={i}
              className={`rounded-xl border-2 p-4 transition-all cursor-pointer ${
                i === currentStep
                  ? "border-[#1e3a5f] bg-blue-50 shadow-md"
                  : completed.includes(i)
                  ? "border-green-300 bg-green-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
              onClick={() => setCurrentStep(i)}
            >
              <div className="flex items-center gap-4">
                <div className={`${step.color} p-2.5 rounded-lg flex-shrink-0`}>
                  <step.icon className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    {step.title}
                    {completed.includes(i) && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">{step.desc}</p>
                </div>
                {i === currentStep && !completed.includes(i) && (
                  <a
                    href={step.href}
                    onClick={() => markComplete(i)}
                    className="flex items-center gap-1.5 bg-[#1e3a5f] text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-[#162d4a] transition-colors whitespace-nowrap"
                  >
                    {step.action}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                )}
                {completed.includes(i) && (
                  <span className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full">
                    Done!
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 justify-center">
          <button
            onClick={goToDashboard}
            className="flex items-center gap-2 bg-[#D4AC0D] text-[#1e3a5f] px-6 py-2.5 rounded-lg font-bold hover:bg-yellow-400 transition-colors"
          >
            Go to Dashboard
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            onClick={goToDashboard}
            className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors text-sm"
          >
            Skip Setup
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          You can complete setup anytime from your dashboard.
        </p>
      </div>
    </div>
  );
}
