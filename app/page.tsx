'use client'

import { useSession } from 'next-auth/react'
import AdminDashboard from './components/AdminDashboard'
import AgentDashboard from './components/AgentDashboard'
import UserDashboard from './components/UserDashboard'
import LandingPage from './components/LandingPage'
import PendingSignOutButton from './components/PendingSignOutButton'

interface AuthUser {
  id: string
  role: string
  status: string
  name?: string | null
  email?: string | null
}

export default function DashboardPage() {
  const { data: session, status } = useSession()

  // Still loading session
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-brand-green border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // Not logged in — show landing / sign-in page
  if (!session || !session.user) {
    return <LandingPage />
  }

  const user = session.user as AuthUser
  const userId = parseInt(user.id)
  const role = user.role
  const userStatus = user.status

  // Account pending approval
  if (userStatus === 'PENDING') {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 px-4">
        <div className="border border-zinc-100 dark:border-zinc-800 shadow-md rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden p-8 flex flex-col items-center">
          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-full text-amber-600 dark:text-amber-400 mb-6">
            <svg className="w-10 h-10 animate-spin" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">Account Pending Approval</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-3 max-w-md leading-relaxed">
            Welcome to Ethio Telecom Issue Tracker! Your registration has been received and is currently pending approval by an administrator.
          </p>
          <p className="text-zinc-400 dark:text-zinc-500 mt-2 text-sm font-medium">
            Once approved, you will be granted access to log incidents and resolve tickets.
          </p>
          <PendingSignOutButton />
        </div>
      </div>
    )
  }

  // Role-based dashboard
  return (
    <div className="max-w-7xl mx-auto p-6">
      {role === 'ADMIN' && <AdminDashboard />}
      {role === 'AGENT' && <AgentDashboard userId={userId} />}
      {role === 'USER' && <UserDashboard userId={userId} />}
    </div>
  )
}
