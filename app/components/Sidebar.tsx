'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  Inbox,
  Ticket,
  Users,
  CheckSquare,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight,
  User,
  Settings,
  Folder
} from 'lucide-react'
import Image from 'next/image'

interface SidebarProps {
  isCollapsed: boolean
  setIsCollapsed: (c: boolean) => void
}

function SidebarInner({ isCollapsed, setIsCollapsed }: SidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab')
  const { data: session } = useSession()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  if (!session) return null

  const userRole = (session.user as any)?.role || 'USER'
  const userName = session.user?.name || 'User'

  // Build dynamic navigation options
  const navItems: any[] = []

  if (userRole === 'ADMIN') {
    navItems.push(
      { label: 'Overview', href: '/', icon: LayoutDashboard },
      { label: 'All Incidents', href: '/issues', icon: Ticket },
      { label: 'Staff Accounts', href: '/?tab=staff', tab: 'staff', icon: Users },
      { label: 'Approvals', href: '/?tab=approvals', tab: 'approvals', icon: CheckSquare },
      { label: 'Projects', href: '/?tab=divisions', tab: 'divisions', icon: Folder }
    )
  } else if (userRole === 'AGENT') {
    navItems.push(
      { label: 'My Queue', href: '/', icon: Inbox },
      { label: 'All Incidents', href: '/issues', icon: Ticket }
    )
  } else {
    navItems.push(
      { label: 'My Incidents', href: '/', icon: Inbox },
      { label: 'Report Issue', href: '/issues/new', icon: Ticket }
    )
  }
  // Profile & Settings for all roles
  navItems.push({ label: 'Profile & Settings', href: '/profile', icon: Settings })

  // Active status checker - ensures we don't highlight multiple items at the same time
  const isActive = (item: typeof navItems[0]) => {
    if (item.tab) {
      return pathname === '/' && tab === item.tab
    }
    // Items without tab query (like Overview/Dashboard) should only be active when tab query is absent
    if (item.href === '/') {
      return pathname === '/' && !tab
    }
    return pathname === item.href
  }

  const handleNavClick = () => {
    setMobileOpen(false)
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 border-r border-zinc-100 dark:border-zinc-800 shadow-xs relative transition-colors duration-300">
      {/* Floating edge collapse toggle button centered vertically on the sidebar right boundary line */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute top-1/2 -translate-y-1/2 -right-3 z-50 hidden md:flex items-center justify-center w-6 h-6 rounded-full border border-zinc-150 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-400 dark:text-zinc-500 hover:text-brand-green dark:hover:text-brand-green shadow-xs hover:scale-110 transition-all cursor-pointer"
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {isCollapsed ? <ChevronRight size={10} /> : <ChevronLeft size={10} />}
      </button>

      {/* Nav List - starts right at the top */}
      <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item, idx) => {
          const Icon = item.icon
          const active = isActive(item)
          return (
            <Link
              key={idx}
              href={item.href}
              onClick={handleNavClick}
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group cursor-pointer ${
                active
                  ? 'bg-brand-green text-white shadow-sm shadow-green-200 dark:shadow-none'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-850/60 hover:text-brand-dark-green dark:hover:text-brand-green'
              }`}
            >
              <Icon size={18} className="flex-shrink-0" />
              {(!isCollapsed || mobileOpen) && <span className="truncate">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* User Actions Footer */}
      <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-950/40">
        <div className="flex items-center space-x-3 p-2 rounded-xl">
          <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-750 flex items-center justify-center text-zinc-500 dark:text-zinc-450 font-bold">
            <User size={16} />
          </div>
          {(!isCollapsed || mobileOpen) && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate leading-snug">{userName}</p>
              <span className={`inline-flex items-center text-[10px] font-extrabold uppercase rounded px-1.5 py-0.5 mt-0.5 ${
                userRole === 'ADMIN' ? 'bg-rose-550/10 text-rose-700 dark:text-rose-400' :
                userRole === 'AGENT' ? 'bg-amber-550/10 text-amber-700 dark:text-amber-400' :
                'bg-green-550/10 text-green-700 dark:text-green-400'
              }`}>
                {userRole}
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => setShowLogoutConfirm(true)}
          className={`w-full flex items-center space-x-3 px-3 py-2.5 mt-3 rounded-xl text-xs font-bold text-zinc-500 dark:text-zinc-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer ${
            isCollapsed && !mobileOpen ? 'justify-center' : ''
          }`}
        >
          <LogOut size={16} className="flex-shrink-0" />
          {(!isCollapsed || mobileOpen) && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar container */}
      <aside
        className={`hidden md:block fixed top-16 left-0 bottom-0 transition-all duration-300 z-30 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Spacer to preserve space for the fixed sidebar */}
      <div
        className={`hidden md:block shrink-0 transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      />

      {/* Mobile Header and Drawer menu */}
      <div className="md:hidden flex items-center justify-between px-6 h-16 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 shadow-xs sticky top-0 z-40 transition-colors">
        <Link href="/" className="flex items-center space-x-2.5">
          {/* Light mode logo */}
          <Image
            src="/Et-logo.png"
            alt="Ethio Telecom Logo"
            width={32}
            height={32}
            className="object-contain block dark:hidden"
          />
          {/* Dark mode logo — transparent bg, white text, same icon colours */}
          <Image
            src="/Et-logo-dark-v2.png"
            alt="Ethio Telecom Logo"
            width={32}
            height={32}
            className="object-contain hidden dark:block"
          />
          <span className="font-extrabold text-zinc-800 dark:text-zinc-100 text-sm">IT Portal</span>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-205 transition-all cursor-pointer"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Mobile sliding drawer overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Overlay backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer content */}
          <div className="relative flex flex-col w-64 h-full bg-white dark:bg-zinc-900 animate-slide-in">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Accidental Sign Out Warning Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-center border border-zinc-100 dark:border-zinc-800">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400">
              <LogOut size={22} />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-zinc-950 dark:text-zinc-50">Confirm Sign Out</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Are you sure you want to log out of the IT Support Portal? This will end your current session.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 px-4 py-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850 rounded-xl text-sm font-semibold text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default function Sidebar(props: SidebarProps) {
  return (
    <Suspense fallback={
      <>
        <aside className={`hidden md:block fixed top-16 left-0 bottom-0 bg-white dark:bg-zinc-900 border-r border-zinc-100 dark:border-zinc-800 ${props.isCollapsed ? 'w-20' : 'w-64'}`} />
        <div className={`hidden md:block shrink-0 ${props.isCollapsed ? 'w-20' : 'w-64'}`} />
      </>
    }>
      <SidebarInner {...props} />
    </Suspense>
  )
}
