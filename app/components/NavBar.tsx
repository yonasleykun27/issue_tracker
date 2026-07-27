'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  FaExclamationTriangle,
  FaSun,
  FaMoon,
  FaBell,
  FaCheck
} from 'react-icons/fa'
import { useState, useEffect } from 'react'
import { useTheme } from './ThemeProvider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export default function NavBar() {
  const currentPath = usePathname()
  const { theme, toggleTheme } = useTheme()
  const { data: session, status } = useSession()
  const queryClient = useQueryClient()

  const [warnings, setWarnings] = useState<{ warningCount: number; statusReason: string | null; warningLogs: any[] } | null>(null)
  const [showWarningDropdown, setShowWarningDropdown] = useState(false)
  const [showNotifDropdown, setShowNotifDropdown] = useState(false)

  // Fetch Warnings (legacy effect)
  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/users/warnings')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => setWarnings(data))
        .catch((err) => console.error('Failed to load warnings:', err))
    } else {
      setWarnings(null)
    }
  }, [status])

  // Fetch Notifications via React Query
  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ['user-notifications'],
    queryFn: () =>
      fetch('/api/notifications').then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      }),
    enabled: status === 'authenticated',
    refetchInterval: 10000 // Poll every 10s for alerts
  })

  // Mark Read Mutation
  const markReadMutation = useMutation({
    mutationFn: (notifId?: number) =>
      fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notifId ? { id: notifId } : {})
      }).then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-notifications'] })
    }
  })

  const unreadCount = notifications.filter((n) => !n.isRead).length

  return (
    <nav className="sticky top-0 z-40 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 h-16 flex items-center justify-between shadow-sm transition-colors duration-300">
      {/* Ethio Telecom brand gradient top line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-brand-green to-brand-blue" />
      
      <div className="flex items-center space-x-8">
        <Link href="/" className="flex items-center space-x-2">
          <Image
            src="/Et-logo.png"
            alt="Ethio Telecom Logo"
            width={120}
            height={36}
            style={{ width: 'auto', height: 'auto' }}
            className="object-contain"
            priority
          />
          <span className="text-zinc-400 dark:text-zinc-650 font-light border-l pl-3 border-zinc-200 dark:border-zinc-800 text-sm hidden md:inline">
            Issue Tracker
          </span>
        </Link>
      </div>

      <div className="flex items-center space-x-4">
        {/* Light/Dark Theme Switcher */}
        <button
          onClick={toggleTheme}
          className="p-2 text-zinc-500 hover:text-brand-green dark:text-zinc-400 dark:hover:text-brand-green rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer flex items-center justify-center"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <FaSun size={16} /> : <FaMoon size={16} />}
        </button>

        {status === 'unauthenticated' && (
          <>
            <Link
              href="/auth/signin"
              className="text-sm font-semibold text-zinc-600 dark:text-zinc-300 hover:text-brand-green dark:hover:text-brand-green transition-colors px-3 py-1.5"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="bg-brand-green hover:bg-brand-dark-green text-white px-4 py-2 rounded-xl transition-colors shadow-xs text-xs font-bold cursor-pointer"
            >
              Register Account
            </Link>
          </>
        )}

        {status === 'authenticated' && (
          <>

            {/* Notifications Bell Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifDropdown(!showNotifDropdown)
                  setShowWarningDropdown(false)
                }}
                className="relative p-2 text-zinc-500 hover:text-brand-green dark:text-zinc-400 dark:hover:text-brand-green hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center"
                title="View Alerts & Notifications"
              >
                <FaBell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-brand-green text-white text-[9px] font-bold rounded-full h-4.5 w-4.5 flex items-center justify-center shadow-xs">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifDropdown && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-xl shadow-lg py-3 px-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800 mb-2">
                    <div className="flex items-center space-x-1.5">
                      <FaBell className="text-brand-green" size={13} />
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-100">Notifications & Alerts</span>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => markReadMutation.mutate(undefined)}
                        className="text-[10px] font-bold text-brand-green hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <FaCheck size={8} />
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                    {notifications.length > 0 ? (
                      notifications.map((notif: any) => (
                        <div
                          key={notif.id}
                          onClick={() => {
                            if (!notif.isRead) markReadMutation.mutate(notif.id)
                          }}
                          className={`border rounded-lg p-2.5 text-left transition-colors cursor-pointer ${
                            notif.isRead
                              ? 'bg-transparent border-zinc-100 dark:border-zinc-800/80 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                              : 'bg-green-50/50 dark:bg-brand-green/5 border-brand-green/20 hover:bg-green-50 dark:hover:bg-brand-green/10'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-1 gap-2">
                            <span className={`text-[11px] font-bold ${notif.isRead ? 'text-zinc-600 dark:text-zinc-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
                              {notif.title}
                            </span>
                            <span className="text-[9px] text-zinc-400 whitespace-nowrap">
                              {new Date(notif.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-450 leading-relaxed font-medium">
                            {notif.message}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-zinc-400 dark:text-zinc-650 text-xs italic">
                        No notifications to display.
                      </div>
                    )}
                  </div>
                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 mt-2 text-center">
                    <p className="text-[9px] text-zinc-400 dark:text-zinc-650 font-medium">
                      Operational notifications clear automatically.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Account Warnings Dropdown */}
            {warnings && warnings.warningCount > 0 && (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowWarningDropdown(!showWarningDropdown)
                    setShowNotifDropdown(false)
                  }}
                  className="relative p-2 text-amber-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer flex items-center justify-center mr-2"
                  title="View Account Warnings"
                >
                  <FaExclamationTriangle size={18} />
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full h-4.5 w-4.5 flex items-center justify-center shadow-xs">
                    {warnings.warningCount}
                  </span>
                </button>

                {showWarningDropdown && (
                  <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-xl shadow-lg py-3 px-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center space-x-1.5 pb-2 border-b border-zinc-100 dark:border-zinc-800 mb-2">
                      <FaExclamationTriangle className="text-amber-500" size={14} />
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-100">Account Warnings Summary</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-450 mb-2 font-medium">
                      You have received a total of <span className="font-bold text-red-600">{warnings.warningCount}</span> warning(s). Please review the details below:
                    </p>
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                      {warnings.warningLogs && warnings.warningLogs.length > 0 ? (
                        warnings.warningLogs.map((log: any, idx: number) => (
                          <div key={log.id} className="bg-amber-50/70 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-900/30 rounded-lg p-2 text-left">
                            <div className="flex items-center justify-between text-[9px] text-zinc-400 dark:text-zinc-650 font-semibold mb-1">
                              <span>WARNING #{warnings.warningLogs.length - idx}</span>
                              <span>{new Date(log.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-[11px] text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">
                              {log.reason}
                            </p>
                          </div>
                        ))
                      ) : (
                        warnings.statusReason && (
                          <div className="bg-amber-50/70 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-900/30 rounded-lg p-2 text-left">
                            <p className="text-[11px] text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">
                              {warnings.statusReason}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 mt-2 text-center">
                      <p className="text-[9px] text-zinc-400 dark:text-zinc-650 font-medium">
                        For questions, contact IT Administration.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </nav>
  )
}
