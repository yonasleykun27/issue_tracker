'use client'

import { usePathname } from 'next/navigation'
import NavBar from './NavBar'
import SidebarLayout from './SidebarLayout'

export default function ConditionalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Auth pages get a clean full-screen layout — no NavBar, no sidebar, no footer
  const isAuthPage = pathname.startsWith('/auth/')

  if (isAuthPage) {
    return <>{children}</>
  }

  return (
    <>
      <NavBar />
      <SidebarLayout>
        {children}
      </SidebarLayout>
    </>
  )
}
