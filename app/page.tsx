import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import AdminDashboard from './components/AdminDashboard'
import AgentDashboard from './components/AgentDashboard'
import UserDashboard from './components/UserDashboard'
import { redirect } from 'next/navigation'

interface AuthUser {
  id: string
  role: string
  status: string
  name?: string | null
  email?: string | null
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session || !session.user) {
    redirect('/auth/signin')
  }

  const user = session.user as AuthUser
  const userId = parseInt(user.id)
  const role = user.role
  const status = user.status

  if (status === 'PENDING') {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 px-4">
        <div className="border border-zinc-100 shadow-md rounded-2xl bg-white overflow-hidden p-8 flex flex-col items-center">
          <div className="p-4 bg-amber-50 rounded-full text-amber-600 mb-6">
            <svg className="w-10 h-10 animate-spin" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Account Pending Approval</h2>
          <p className="text-zinc-500 mt-3 max-w-md leading-relaxed">
            Welcome to Ethio Telecom Issue Tracker! Your registration has been received and is currently **pending approval** by an administrator.
          </p>
          <p className="text-zinc-400 mt-2 text-sm font-medium">
            Once approved, you will be granted access to log incidents and resolve tickets.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {role === 'ADMIN' && <AdminDashboard />}
      {role === 'AGENT' && <AgentDashboard userId={userId} />}
      {role === 'USER' && <UserDashboard userId={userId} />}
    </div>
  )
}
