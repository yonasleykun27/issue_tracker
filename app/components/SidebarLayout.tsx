'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import Sidebar from './Sidebar'

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const userStatus = (session?.user as any)?.status

  // During loading, show a loading placeholder
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-50/50 dark:bg-zinc-950">
        <div className="text-zinc-500 dark:text-zinc-400 font-semibold text-sm">Loading portal shell...</div>
      </div>
    )
  }

  // If not authenticated or pending approval, render full screen without sidebar navigation
  if (status === 'unauthenticated' || userStatus === 'PENDING') {
    return (
      <div className="min-h-[calc(100vh-64px)] flex flex-col bg-zinc-50/50 dark:bg-zinc-950">
        <div className="flex-1">
          {children}
        </div>
        {/* Footer for unauthenticated pages (Landing Page) */}
        <footer className="bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 py-5 mt-auto no-print">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-zinc-500 dark:text-zinc-400 text-xs gap-3">
            <div className="flex items-center space-x-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-green" />
              <span className="font-semibold text-zinc-600 dark:text-zinc-300">Ethio Telecom IT Operations</span>
            </div>
            <div>© 2026 Ethio Telecom. All rights reserved.</div>
            <div className="flex space-x-3">
              <a href="https://www.ethiotelecom.et" target="_blank" rel="noreferrer"
                className="hover:text-brand-green hover:underline">Official Website</a>
              <span>•</span>
              <span className="text-zinc-400 dark:text-zinc-600">Internal Use Only</span>
            </div>
          </div>
        </footer>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col md:flex-row bg-zinc-50/20 dark:bg-zinc-950/20">
      {/* Collapsible Sidebar */}
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

      {/* Scrollable Main Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-[calc(100vh-64px)] bg-zinc-50/10 dark:bg-zinc-950">
        <main className="flex-1 px-4 md:px-8 py-6 md:py-8 overflow-x-hidden">
          {children}
        </main>
        
        {/* Footer inside the main scrollable section */}
        <footer className="bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 py-5 mt-auto no-print">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-zinc-500 dark:text-zinc-400 text-xs gap-3">
            <div className="flex items-center space-x-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-green" />
              <span className="font-semibold text-zinc-600 dark:text-zinc-300">Ethio Telecom IT Operations</span>
            </div>
            <div>© 2026 Ethio Telecom. All rights reserved.</div>
            <div className="flex space-x-3">
              <a href="https://www.ethiotelecom.et" target="_blank" rel="noreferrer"
                className="hover:text-brand-green hover:underline">Official Website</a>
              <span>•</span>
              <span className="text-zinc-400 dark:text-zinc-600">Internal Use Only</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
