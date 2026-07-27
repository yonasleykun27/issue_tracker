'use client'

import Link from 'next/link'
import { FaArrowRight, FaTasks, FaUserShield, FaClock } from 'react-icons/fa'

export default function LandingPage() {
  return (
    <div className="flex-1 flex flex-col bg-zinc-50/50 dark:bg-zinc-950 selection:bg-brand-green selection:text-white transition-colors duration-300">

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 flex flex-col items-center justify-center py-12 md:py-24 px-6 relative overflow-hidden">
        {/* Decorative background shapes */}
        <div className="absolute top-1/4 left-10 w-96 h-96 bg-brand-green/5 dark:bg-brand-green/2 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-brand-blue/5 dark:bg-brand-blue/2 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl w-full text-center space-y-12 relative z-10">
          {/* Tagline */}
          <div className="inline-flex items-center space-x-2 bg-brand-green/10 dark:bg-brand-green/15 text-brand-dark-green px-4 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase border border-brand-green/10">
            <span className="h-2 w-2 rounded-full bg-brand-green animate-pulse" />
            <span>Ethio Telecom Internal Operations</span>
          </div>

          {/* Headline */}
          <div className="space-y-4 max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl font-extrabold text-zinc-950 dark:text-zinc-50 tracking-tight leading-tight sm:leading-none">
              Operational Incident &{' '}
              <br className="hidden sm:inline" />
              <span className="bg-linear-to-r from-brand-green to-brand-blue bg-clip-text text-transparent">
                Issue Tracker Portal
              </span>
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed pt-2">
              A secure, centralized operational tracking center designed to log network issues,
              dispatch maintenance workloads, and monitor SLA compliance.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4">
            <Link
              href="/auth/signin"
              className="w-full sm:w-auto bg-brand-green hover:bg-brand-dark-green text-white font-bold px-8 py-3.5 rounded-xl transition-all shadow-md shadow-green-100 dark:shadow-none flex items-center justify-center gap-2 group text-sm cursor-pointer"
            >
              <span>Get Started</span>
              <FaArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/auth/signup"
              className="w-full sm:w-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-850 font-bold px-8 py-3.5 rounded-xl transition-all text-sm cursor-pointer"
            >
              Create Account
            </Link>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16">
            {[
              {
                title: 'Incident Reporting',
                desc: 'Employees submit support tickets complete with location, contact info, and screenshot attachments.',
                color: 'text-brand-green bg-brand-green/5 dark:bg-brand-green/10',
                icon: FaTasks
              },
              {
                title: 'Operational Dispatch',
                desc: 'Admins audit requests, manage staff directory lists, and dispatch tickets directly to support staff.',
                color: 'text-brand-blue bg-brand-blue/5 dark:bg-brand-blue/10',
                icon: FaUserShield
              },
              {
                title: 'SLA Work Queue',
                desc: 'Support agents track assigned logs, update ticket status timelines, and trigger verification notifications.',
                color: 'text-amber-500 bg-amber-50/50 dark:bg-amber-500/10',
                icon: FaClock
              }
            ].map((f, i) => {
              const Icon = f.icon
              return (
                <div key={i} className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 rounded-2xl p-6 text-left shadow-xs hover:shadow-md transition-all duration-300 group flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${f.color} transition-transform group-hover:scale-105 duration-200`}>
                      <Icon size={20} />
                    </div>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{f.title}</h3>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">{f.desc}</p>
                  </div>
                  <div className="pt-4 flex items-center text-xs font-bold text-brand-green group-hover:underline cursor-pointer">
                    <span>Learn more</span>
                    <FaArrowRight size={10} className="ml-1 opacity-0 group-hover:opacity-100 transition-all duration-200" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-6 transition-colors">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center text-zinc-500 dark:text-zinc-400 text-xs gap-4">
          <div className="flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-brand-green" />
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">Ethio Telecom IT Operations</span>
          </div>
          <div>© 2026 Ethio Telecom. All rights reserved.</div>
          <div className="flex space-x-4">
            <a href="https://www.ethiotelecom.et" target="_blank" rel="noreferrer" className="hover:text-brand-green hover:underline">
              Official Website
            </a>
            <span>•</span>
            <span className="text-zinc-400 dark:text-zinc-600">Internal Use Only</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
