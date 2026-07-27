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
    return <div className="min-h-[calc(100vh-64px)] flex flex-col bg-zinc-50/50 dark:bg-zinc-950">{children}</div>
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
      </div>
    </div>
  )
}
