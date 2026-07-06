'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { FaUserCircle, FaSignOutAlt, FaPlus, FaExclamationTriangle } from 'react-icons/fa'
import { useState, useEffect } from 'react'

interface ExtendedUser {
  id?: string
  role?: string
  name?: string | null
  email?: string | null
  image?: string | null
}

export default function NavBar() {
  const currentPath = usePathname()
  const { data: session, status } = useSession()
  const [warnings, setWarnings] = useState<{ warningCount: number; statusReason: string | null; warningLogs: any[] } | null>(null)
  const [showWarningDropdown, setShowWarningDropdown] = useState(false)

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

  const user = session?.user as ExtendedUser | undefined
  const userRole = user?.role || 'USER'

  let links = [{ label: 'Dashboard', href: '/' }]
  if (userRole === 'ADMIN') {
    links = [
      { label: 'Overview', href: '/' },
      { label: 'All Incidents', href: '/issues' }
    ]
  } else if (userRole === 'AGENT') {
    links = [
      { label: 'My Queue', href: '/' }
    ]
  } else {
    links = [
      { label: 'My Incidents', href: '/' }
    ]
  }

  return (
    <nav className="relative border-b border-zinc-100 bg-white px-6 h-16 flex items-center justify-between shadow-sm">
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
          <span className="text-zinc-400 font-light border-l pl-3 border-zinc-200 text-sm hidden md:inline">
            Issue Tracker
          </span>
        </Link>

        {status === 'authenticated' && (
          <ul className="flex space-x-6 text-sm font-medium">
            {links.map((link) => {
              const isActive = currentPath === link.href
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`${
                      isActive
                        ? 'text-brand-dark-green border-b-2 border-brand-green pb-5 font-semibold'
                        : 'text-zinc-500 hover:text-brand-green transition-colors pb-5'
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="flex items-center space-x-4">
        {status === 'authenticated' && (
          <>
            {/* Warnings Icon Trigger */}
            {warnings && warnings.warningCount > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowWarningDropdown(!showWarningDropdown)}
                  className="relative p-2 text-amber-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer flex items-center justify-center mr-2"
                  title="View Account Warnings"
                >
                  <FaExclamationTriangle size={18} />
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full h-4.5 w-4.5 flex items-center justify-center shadow-xs">
                    {warnings.warningCount}
                  </span>
                </button>

                {showWarningDropdown && (
                  <div className="absolute right-0 mt-2 w-72 bg-white border border-zinc-150 rounded-xl shadow-lg py-3 px-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center space-x-1.5 pb-2 border-b border-zinc-100 mb-2">
                      <FaExclamationTriangle className="text-amber-500" size={14} />
                      <span className="text-xs font-bold text-zinc-800">Account Warnings Summary</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 mb-2 font-medium">
                      You have received a total of <span className="font-bold text-red-600">{warnings.warningCount}</span> warning(s). Please review the details below:
                    </p>
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                      {warnings.warningLogs && warnings.warningLogs.length > 0 ? (
                        warnings.warningLogs.map((log: any, idx: number) => (
                          <div key={log.id} className="bg-amber-50/70 border border-amber-100 rounded-lg p-2 text-left">
                            <div className="flex items-center justify-between text-[9px] text-zinc-400 font-semibold mb-1">
                              <span>WARNING #{warnings.warningLogs.length - idx}</span>
                              <span>{new Date(log.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-[11px] text-zinc-700 leading-relaxed font-medium">
                              {log.reason}
                            </p>
                          </div>
                        ))
                      ) : (
                        warnings.statusReason && (
                          <div className="bg-amber-50/70 border border-amber-100 rounded-lg p-2 text-left">
                            <p className="text-[11px] text-zinc-700 leading-relaxed font-medium">
                              {warnings.statusReason}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                    <div className="pt-2 border-t border-zinc-100 mt-2 text-center">
                      <p className="text-[9px] text-zinc-400 font-medium">
                        For questions, contact IT Administration.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center space-x-2">
              <FaUserCircle className="text-zinc-400" size={20} />
              <div className="flex flex-col">
                <span className="text-sm text-zinc-700 font-medium max-w-[120px] truncate">
                  {session.user?.name}
                </span>
                <span className={`text-xs font-bold ${
                  user?.role === 'ADMIN' ? 'text-rose-600' :
                  user?.role === 'AGENT' ? 'text-amber-600' :
                  'text-brand-green'
                }`}>
                  {user?.role || 'USER'}
                </span>
              </div>
            </div>

            <button
              onClick={() => signOut({ callbackUrl: '/auth/signin' })}
              className="text-zinc-500 hover:text-rose-600 transition-colors p-1.5 rounded-lg hover:bg-rose-50"
              title="Sign Out"
            >
              <FaSignOutAlt size={16} />
            </button>
          </>
        )}

        {status === 'unauthenticated' && (
          <div className="flex items-center space-x-3 text-sm font-medium">
            <Link
              href="/auth/signin"
              className="text-zinc-600 hover:text-brand-blue transition-colors px-3 py-1.5"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="bg-brand-green hover:bg-brand-dark-green text-white px-4 py-2 rounded-lg transition-colors shadow-sm text-sm font-medium"
            >
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}
