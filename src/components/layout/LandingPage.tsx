"use client";
// src/components/layout/LandingPage.tsx
import { signIn } from "next-auth/react";
import { motion } from "framer-motion";
import {
  CalendarDays,
  Sparkles,
  Mail,
  CheckSquare,
  Zap,
  Shield,
  ArrowRight,
} from "lucide-react";

const features = [
  {
    icon: CalendarDays,
    title: "Smart Scheduling",
    desc: "Create, edit & reschedule events with natural language",
  },
  {
    icon: Zap,
    title: "Availability Check",
    desc: "Instantly see if you're free and get alternative suggestions",
  },
  {
    icon: Mail,
    title: "Email Integration",
    desc: "Send schedule summaries to yourself or anyone",
  },
  {
    icon: CheckSquare,
    title: "Task Management",
    desc: "Create reminders and tasks from conversation",
  },
  {
    icon: Shield,
    title: "Secure by Design",
    desc: "Google OAuth only — your tokens never leave the server",
  },
  {
    icon: Sparkles,
    title: "AI-Powered",
    desc: "Claude AI understands context, intent and relative time",
  },
];

const examples = [
  "Am I free tomorrow at 2pm?",
  "Show me my schedule for this week",
  "Schedule a team standup for Monday at 9am",
  "Email me my agenda for tomorrow",
  "Remind me to prep for the Friday meeting",
  "Move my 3pm call to 4pm",
];

export function LandingPage() {
  return (
    <div className="mesh-bg min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-slate-100 tracking-tight">
            Aria
          </span>
        </div>
        <button
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          Sign in
        </button>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-medium mb-6">
            <Sparkles className="w-3 h-3" />
            Powered by Claude AI
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl font-bold text-slate-50 tracking-tight leading-[1.1] mb-5">
            Your calendar,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-blue-400">
              finally intelligent
            </span>
          </h1>

          <p className="text-lg text-slate-400 max-w-xl mx-auto mb-10 leading-relaxed">
            Aria is your AI calendar assistant. Chat naturally to manage your
            schedule, check availability, send emails, and create tasks — all
            without leaving a single interface.
          </p>

          {/* CTA */}
          <button
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="group inline-flex items-center gap-3 px-6 py-3.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-all duration-200 glow-purple text-base"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                opacity="0.8"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                opacity="0.6"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                opacity="0.7"
              />
            </svg>
            Continue with Google
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>

          <p className="text-xs text-slate-600 mt-3">
            We only request the minimum permissions needed
          </p>

          <div className="mt-5 bg-slate-900/70 border border-violet-300/30 rounded-xl p-4 text-left text-sm text-slate-200">
            <p className="font-semibold text-violet-300 mb-1">
              Quick test login
            </p>
            <p>
              If you’re testing from the public site, use the test account below
              (no repo needed):
            </p>
            <ul className="list-disc list-inside mt-2 text-slate-300">
              <li>
                Email: <code>example.tester001@gmail.com</code>
              </li>
              <li>
                Password: <code>exampletester@123</code>
              </li>
            </ul>
            <p className="text-xs text-slate-400 mt-2">
              Please ensure this account is added to your Google Cloud OAuth
              test users first.
            </p>
          </div>
        </motion.div>

        {/* Example queries */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-16 max-w-2xl mx-auto w-full"
        >
          <p className="text-xs text-slate-500 text-center uppercase tracking-widest mb-4">
            Try asking
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {examples.map((ex) => (
              <div
                key={ex}
                className="glass rounded-lg px-4 py-2.5 text-sm text-slate-400 flex items-center gap-2"
              >
                <span className="text-violet-500 text-xs">›</span>
                <span>&ldquo;{ex}&rdquo;</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="mt-20 max-w-4xl mx-auto w-full"
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {features.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="glass rounded-xl p-4 hover:border-violet-500/20 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center mb-3">
                  <Icon className="w-4 h-4 text-violet-400" />
                </div>
                <p className="text-sm font-semibold text-slate-200 mb-1">
                  {title}
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-slate-700">
        Built with Next.js · Claude AI · Google Calendar API
      </footer>
    </div>
  );
}
