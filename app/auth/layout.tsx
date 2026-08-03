// Standalone layout for all /auth/* pages.
// No NavBar, no SidebarLayout, no global footer — just a clean full-screen shell.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      {children}
    </div>
  )
}
