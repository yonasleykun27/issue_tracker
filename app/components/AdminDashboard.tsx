'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { FaInbox, FaSpinner, FaCheckCircle, FaUserShield, FaExclamationTriangle, FaBan, FaCheck, FaTasks, FaUserCheck, FaUserTimes, FaPause, FaChartBar, FaTimes, FaPhoneAlt, FaMapMarkerAlt, FaEye, FaTrash } from 'react-icons/fa'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import toast from 'react-hot-toast'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

interface Issue {
  id: number
  title: string
  description: string
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  imageUrl?: string | null
  rejectionReason?: string | null
  phone?: string | null
  address?: string | null
  createdAt: string
  reportedBy: {
    name: string
    email: string
  }
  assignedToId?: number | null
  assignedTo?: { name: string; role: string } | null
}

interface User {
  id: number
  name: string
  email: string
  role: 'USER' | 'AGENT' | 'ADMIN'
  status: 'PENDING' | 'ACTIVE' | 'WARNED' | 'BANNED' | 'ON_LEAVE'
  warningCount: number
  warningLogs?: { id: number; reason: string; createdAt: string }[]
}

interface AnalyticsItem {
  date: string
  open: number
  inProgress: number
  resolved: number
  label: string
}

export default function AdminDashboard() {
  const { data: session } = useSession()
  const currentUserId = session?.user ? parseInt((session.user as any).id) : null
  const [activeTab, setActiveTab] = useState<'issues' | 'users' | 'approvals'>('issues')
  const [issues, setIssues] = useState<Issue[]>([])
  const [allIssues, setAllIssues] = useState<Issue[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [analyticsData, setAnalyticsData] = useState<AnalyticsItem[]>([])
  const [loadingIssues, setLoadingIssues] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [loadingAnalytics, setLoadingAnalytics] = useState(true)
  const [viewingIssue, setViewingIssue] = useState<Issue | null>(null)
  const [rejectIssueId, setRejectIssueId] = useState<number | null>(null)
  const [rejectReasonText, setRejectReasonText] = useState('')
  const [rejectUserId, setRejectUserId] = useState<number | null>(null)
  const [warnUserId, setWarnUserId] = useState<number | null>(null)
  const [warnUserWarnings, setWarnUserWarnings] = useState(0)
  const [warnReasonText, setWarnReasonText] = useState('')
  const [banUserId, setBanUserId] = useState<number | null>(null)
  const [banUserCurrentStatus, setBanUserCurrentStatus] = useState<string | null>(null)
  const [banReasonText, setBanReasonText] = useState('')
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null)

  function fetchIssues() {
    // Fetch admin's own assigned issues for the dashboard view
    fetch('/api/issues')
      .then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then((data) => setIssues(data))
      .catch(() => toast.error('Failed to load tickets'))
      .finally(() => setLoadingIssues(false))

    // Fetch ALL issues for round-robin calculation
    fetch('/api/issues?scope=all')
      .then((res) => res.ok ? res.json() : [])
      .then((data) => setAllIssues(data))
      .catch(() => setAllIssues([]))
  }

  function fetchUsers() {
    fetch('/api/admin/users')
      .then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then((data) => setUsers(data))
      .catch(() => toast.error('Failed to load staff accounts'))
      .finally(() => setLoadingUsers(false))
  }

  function fetchAnalytics() {
    fetch('/api/admin/analytics')
      .then(res => res.ok ? res.json() : [])
      .then(data => setAnalyticsData(data))
      .catch(() => setAnalyticsData([]))
      .finally(() => setLoadingAnalytics(false))
  }

  useEffect(() => {
    fetchIssues()
    fetchUsers()
    fetchAnalytics()
  }, [])

  // Handle manually assigning an issue to an Agent/Admin
  const handleAssign = async (issueId: number, agentId: string) => {
    if (!agentId) {
      toast.error('Please select a staff member to assign this ticket to.')
      return
    }
    try {
      const response = await fetch(`/api/issues/${issueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedToId: parseInt(agentId) })
      })
      if (!response.ok) throw new Error()
      toast.success('Ticket assigned to support staff!')
      fetchIssues()
    } catch (e) {
      toast.error('Failed to assign ticket')
    }
  }

  // Handle rejecting/deleting an issue report with a reason
  const handleRejectIssue = (issueId: number) => {
    setRejectIssueId(issueId)
    setRejectReasonText('')
  }

  const confirmRejectIssue = async (issueId: number) => {
    if (!rejectReasonText.trim()) {
      toast.error('Please enter a rejection reason.')
      return
    }
    try {
      const response = await fetch(`/api/issues/${issueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REJECTED', rejectionReason: rejectReasonText })
      })
      if (!response.ok) throw new Error()
      toast.success('Report rejected and status updated.')
      setViewingIssue(null)
      fetchIssues()
    } catch (e) {
      toast.error('Failed to reject report')
    } finally {
      setRejectIssueId(null)
      setRejectReasonText('')
    }
  }

  // Handle user warnings
  const handleWarnUserClick = (userId: number, currentWarnings: number) => {
    setWarnUserId(userId)
    setWarnUserWarnings(currentWarnings)
    setWarnReasonText('')
  }

  const confirmWarnUser = async () => {
    if (!warnReasonText.trim()) {
      toast.error('Please enter a reason for the warning.')
      return
    }
    try {
      const response = await fetch(`/api/admin/users/${warnUserId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'WARNED', warningCount: warnUserWarnings + 1, statusReason: warnReasonText })
      })
      if (!response.ok) throw new Error()
      toast.success('Warning issued to user!')
      fetchUsers()
    } catch (e) {
      toast.error('Failed to warn user')
    } finally {
      setWarnUserId(null)
      setWarnReasonText('')
    }
  }

  // Handle user ban/unban
  const handleToggleBanClick = async (userId: number, currentStatus: string) => {
    const isBanning = currentStatus !== 'BANNED'
    if (!isBanning) {
      // Unban directly without prompt
      try {
        const response = await fetch(`/api/admin/users/${userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'ACTIVE', warningCount: 0, statusReason: null })
        })
        if (!response.ok) throw new Error()
        toast.success('User account restored!')
        fetchUsers()
      } catch (e) {
        toast.error('Failed to restore user')
      }
    } else {
      setBanUserId(userId)
      setBanUserCurrentStatus(currentStatus)
      setBanReasonText('')
    }
  }

  const confirmToggleBan = async () => {
    if (!banReasonText.trim()) {
      toast.error('Please enter a reason for the ban.')
      return
    }
    try {
      const response = await fetch(`/api/admin/users/${banUserId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'BANNED', statusReason: banReasonText })
      })
      if (!response.ok) throw new Error()
      toast.success('User account has been banned!')
      fetchUsers()
    } catch (e) {
      toast.error('Failed to ban user')
    } finally {
      setBanUserId(null)
      setBanReasonText('')
    }
  }

  // Handle deleting a user
  const handleDeleteUserClick = (userId: number) => {
    setDeleteUserId(userId)
  }

  const confirmDeleteUser = async (userId: number) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
      if (!response.ok) throw new Error()
      toast.success('User deleted successfully!')
      fetchUsers()
      fetchIssues()
    } catch (e) {
      toast.error('Failed to delete user')
    } finally {
      setDeleteUserId(null)
    }
  }

  // Handle toggle leave status
  const handleToggleLeave = async (userId: number, currentStatus: string) => {
    const isGoingOnLeave = currentStatus !== 'ON_LEAVE'
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: isGoingOnLeave ? 'ON_LEAVE' : 'ACTIVE' })
      })
      if (!response.ok) throw new Error()
      toast.success(isGoingOnLeave ? 'User marked as on leave' : 'User marked as active')
      fetchUsers()
    } catch (e) {
      toast.error('Failed to update leave status')
    }
  }

  const handleApprove = async (userId: number) => {
    console.log('handleApprove initiated for userId:', userId)
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACTIVE' })
      })
      console.log('handleApprove response status:', response.status)
      if (!response.ok) {
        const errText = await response.text()
        console.error('handleApprove error response:', errText)
        throw new Error(errText)
      }
      toast.success('Registration approved successfully!')
      fetchUsers()
    } catch (e) {
      console.error('handleApprove caught error:', e)
      toast.error('Failed to approve registration')
    }
  }

  // Handle registration rejection (delete account)
  const handleReject = (userId: number) => {
    setRejectUserId(userId)
  }

  const confirmRejectUser = async (userId: number) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
      if (!response.ok) throw new Error()
      toast.success('Registration request rejected!')
      fetchUsers()
    } catch (e) {
      toast.error('Failed to reject registration')
    } finally {
      setRejectUserId(null)
    }
  }

  const openIssues = issues.filter(i => i.status === 'OPEN').length
  const inProgressIssues = issues.filter(i => i.status === 'IN_PROGRESS').length
  const resolvedIssues = issues.filter(i => i.status === 'RESOLVED').length
  const rejectedIssues = issues.filter(i => i.status === 'REJECTED').length
  const unassignedIssues = issues.filter(i => !i.assignedToId || i.assignedTo?.role !== 'AGENT').length

  // Only ACTIVE agents for the manual assignment dropdown
  const agentsList = users.filter(u => u.role === 'AGENT' && u.status === 'ACTIVE')
  const staffAccounts = users.filter(u => u.status !== 'PENDING')
  const pendingRegistrations = users.filter(u => u.status === 'PENDING')

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-zinc-950 tracking-tight">IT Management Console</h1>
          <p className="text-zinc-500 mt-1">System operational metrics, incident queues, and account controls.</p>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-zinc-200">
        <button
          onClick={() => setActiveTab('issues')}
          className={`flex items-center space-x-2 px-6 py-3 text-sm font-semibold transition-all border-b-2 outline-none cursor-pointer ${activeTab === 'issues' ? 'border-brand-green text-brand-dark-green' : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
        >
          <FaTasks size={14} />
          <span>Incident Queue ({issues.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center space-x-2 px-6 py-3 text-sm font-semibold transition-all border-b-2 outline-none cursor-pointer ${activeTab === 'users' ? 'border-brand-green text-brand-dark-green' : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
        >
          <FaUserShield size={14} />
          <span>Staff Accounts ({staffAccounts.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('approvals')}
          className={`flex items-center space-x-2 px-6 py-3 text-sm font-semibold transition-all border-b-2 outline-none cursor-pointer ${activeTab === 'approvals' ? 'border-brand-green text-brand-dark-green' : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
        >
          <FaUserCheck size={14} />
          <span>Pending Approvals ({pendingRegistrations.length})</span>
        </button>
      </div>

      {/* ── ISSUES TAB ── */}
      {activeTab === 'issues' && (
        <div className="space-y-8">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Unassigned', count: unassignedIssues, color: 'text-amber-600', bg: 'bg-amber-50', icon: FaInbox },
              { label: 'Total Open', count: openIssues, color: 'text-rose-600', bg: 'bg-rose-50', icon: FaInbox },
              { label: 'Active Solving', count: inProgressIssues, color: 'text-blue-600', bg: 'bg-blue-50', icon: FaSpinner },
              { label: 'SLA Resolved', count: resolvedIssues, color: 'text-brand-green', bg: 'bg-green-50', icon: FaCheckCircle },
            ].map(s => {
              const Icon = s.icon
              return (
                <Card key={s.label} className="border-zinc-200 shadow-sm overflow-hidden bg-white">
                  <CardContent className="p-6 flex items-center justify-between">
                    <div>
                      <span className="text-zinc-500 text-sm font-medium block">{s.label}</span>
                      <span className={`text-4xl font-extrabold mt-2 block ${s.color}`}>{s.count}</span>
                    </div>
                    <div className={`p-4 rounded-xl ${s.bg} ${s.color}`}>
                      <Icon size={24} />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Analytics Chart */}
          <Card className="border-zinc-100 shadow-sm rounded-2xl overflow-hidden bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-bold text-zinc-950 flex items-center gap-2">
                <FaChartBar className="text-brand-green" />
                Tickets Logged — Last 14 Days
              </CardTitle>
              <CardDescription className="text-zinc-500">Daily breakdown of open, in-progress, and resolved tickets.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingAnalytics ? (
                <div className="text-sm text-zinc-400 py-8 text-center">Loading chart data...</div>
              ) : analyticsData.every(d => d.open + d.inProgress + d.resolved === 0) ? (
                <div className="text-sm text-zinc-400 py-8 text-center italic">No ticket data for the last 14 days.</div>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }} barSize={8} barCategoryGap="35%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#a1a1aa', fontWeight: 500 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid #e4e4e7', fontSize: 12 }} cursor={{ fill: '#f9fafb' }} />
                      <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                      <Bar dataKey="open" name="Open" fill="#f87171" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="inProgress" name="In Progress" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="resolved" name="Resolved" fill="#4ade80" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Incidents Table */}
          <Card className="border-zinc-100 shadow-sm rounded-2xl overflow-hidden bg-white">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-zinc-950">Incident Management Queue</CardTitle>
              <CardDescription className="text-zinc-500">
                Review submitted reports. Click <strong>View Details</strong> to inspect, then assign to support staff or reject the report.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingIssues ? (
                <div className="text-center py-12 text-zinc-500 text-sm">Loading tickets...</div>
              ) : issues.length === 0 ? (
                <div className="text-center py-12 text-zinc-400 text-sm">No incidents logged.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-zinc-100 hover:bg-transparent">
                        <TableHead className="w-32">Ticket No.</TableHead>
                        <TableHead>Issue Title</TableHead>
                        <TableHead className="w-28">Status</TableHead>
                        <TableHead className="w-28">Priority</TableHead>
                        <TableHead className="w-32">Reported By</TableHead>
                        <TableHead className="w-32">Assigned To</TableHead>
                        <TableHead className="w-48 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {issues.map((issue) => (
                        <TableRow key={issue.id} className="hover:bg-zinc-50/50 transition-colors">
                          <TableCell className="font-mono font-bold text-zinc-500">TKT-{String(issue.id).padStart(4, '0')}</TableCell>
                          <TableCell>
                            <div className="font-semibold text-zinc-900">{issue.title}</div>
                            {issue.imageUrl && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-100 text-zinc-600 mt-0.5">
                                📎 Attachment
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`font-semibold rounded-full border-none px-2 py-0.5 text-xs ${issue.status === 'OPEN' ? 'bg-rose-50 text-rose-700' :
                              issue.status === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-700' :
                              issue.status === 'REJECTED' ? 'bg-red-50 text-red-700' :
                                'bg-green-50 text-green-700'
                              }`}>
                              {issue.status.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`font-semibold rounded-full border-none px-2 py-0.5 text-xs ${issue.priority === 'HIGH' ? 'bg-red-50 text-red-700' :
                              issue.priority === 'MEDIUM' ? 'bg-blue-50 text-blue-700' :
                                'bg-zinc-100 text-zinc-700'
                              }`}>
                              {issue.priority}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-zinc-600 text-xs font-semibold">{issue.reportedBy?.name}</TableCell>
                          <TableCell className="text-zinc-500 text-xs">
                            {issue.assignedTo && issue.assignedTo.role === 'AGENT' ? (
                              <span className="font-semibold text-green-700">{issue.assignedTo.name}</span>
                            ) : (
                              <span className="text-amber-600 font-semibold">Unassigned</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => setViewingIssue(issue)}
                              className="text-xs font-semibold border-zinc-200 text-zinc-700 hover:bg-zinc-50 cursor-pointer mr-1"
                            >
                              <FaEye className="mr-1" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── USERS TAB ── */}
      {activeTab === 'users' && (
        <Card className="border-zinc-100 shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-zinc-950">Staff Directory & Moderation Controls</CardTitle>
            <CardDescription className="text-zinc-500">Monitor employee registration, issue warnings, manage leave breaks, and restrict access.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <div className="text-center py-12 text-zinc-500 text-sm">Loading staff records...</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-zinc-100 hover:bg-transparent">
                      <TableHead>Full Name</TableHead>
                      <TableHead>Email Address</TableHead>
                      <TableHead className="w-24">Role</TableHead>
                      <TableHead className="w-28">Status</TableHead>
                      <TableHead className="w-24 text-center">Warnings</TableHead>
                      <TableHead className="w-64 text-right">Moderation Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id} className="hover:bg-zinc-50/50 transition-colors">
                        <TableCell className="font-semibold text-zinc-900">{user.name}</TableCell>
                        <TableCell className="text-zinc-500">{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`font-semibold text-[10px] rounded-full border-none px-2 py-0.5 ${user.role === 'ADMIN' ? 'bg-rose-50 text-rose-700' :
                            user.role === 'AGENT' ? 'bg-amber-50 text-amber-700' :
                              'bg-green-50 text-green-700'
                            }`}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`font-semibold text-[10px] rounded-full border-none px-2 py-0.5 ${user.status === 'ACTIVE' ? 'bg-green-50 text-green-700' :
                            user.status === 'WARNED' ? 'bg-amber-50 text-amber-700' :
                              user.status === 'ON_LEAVE' ? 'bg-zinc-100 text-zinc-700' :
                                'bg-red-50 text-red-700'
                            }`}>
                            {user.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center">
                            <span className="font-bold text-sm text-zinc-700">{user.warningCount}</span>
                            {(() => {
                              const logs = user.warningLogs || []
                              if (logs.length === 0) return null
                              return (
                                <div className="mt-1.5 space-y-1 w-48 text-left text-[10px]">
                                  {logs.map((log: any, index: number) => (
                                    <div key={log.id} className="bg-amber-50/60 border border-amber-100/70 rounded-md p-1.5 leading-tight">
                                      <div className="flex justify-between font-bold text-amber-800 text-[9px] mb-0.5">
                                        <span>WARN #{logs.length - index}</span>
                                        <span className="text-zinc-400">{new Date(log.createdAt).toLocaleDateString()}</span>
                                      </div>
                                      <p className="font-medium text-zinc-600">{log.reason}</p>
                                    </div>
                                  ))}
                                </div>
                              )
                            })()}
                          </div>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          {user.role !== 'ADMIN' ? (
                            <>
                              <Button size="xs" variant="outline" onClick={() => handleToggleLeave(user.id, user.status)} className="text-zinc-600 border-zinc-200 hover:bg-zinc-50 text-xs font-semibold cursor-pointer">
                                <FaPause className="mr-1" />
                                {user.status === 'ON_LEAVE' ? 'Resume' : 'Leave'}
                              </Button>
                              <Button size="xs" variant="outline" onClick={() => handleWarnUserClick(user.id, user.warningCount)} className="text-amber-600 border-amber-200 hover:bg-amber-50 text-xs font-semibold cursor-pointer">
                                <FaExclamationTriangle className="mr-1" />
                                Warn
                              </Button>
                              <Button size="xs" onClick={() => handleToggleBanClick(user.id, user.status)} className={`text-xs font-semibold cursor-pointer ${user.status === 'BANNED' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}>
                                {user.status === 'BANNED' ? <><FaCheck className="mr-1" />Unban</> : <><FaBan className="mr-1" />Ban</>}
                              </Button>
                              {user.id !== currentUserId && (
                                <Button size="xs" variant="destructive" onClick={() => handleDeleteUserClick(user.id)} className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer">
                                  <FaTrash className="mr-1" />
                                  Delete
                                </Button>
                              )}
                            </>
                          ) : (
                            <div className="inline-flex items-center gap-2">
                              {user.id === currentUserId ? (
                                <>
                                  <span className="text-xs text-zinc-400 font-medium italic">Administrator (You)</span>
                                  <Button size="xs" variant="outline" onClick={() => handleToggleLeave(user.id, user.status)} className="text-zinc-600 border-zinc-200 hover:bg-zinc-50 text-xs font-semibold cursor-pointer">
                                    <FaPause className="mr-1" />
                                    {user.status === 'ON_LEAVE' ? 'Resume' : 'Leave'}
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <span className="text-xs text-zinc-400 font-medium italic mr-1">Administrator</span>
                                  <Button size="xs" variant="outline" onClick={() => handleToggleLeave(user.id, user.status)} className="text-zinc-600 border-zinc-200 hover:bg-zinc-50 text-xs font-semibold cursor-pointer">
                                    <FaPause className="mr-1" />
                                    {user.status === 'ON_LEAVE' ? 'Resume' : 'Leave'}
                                  </Button>
                                  <Button size="xs" variant="destructive" onClick={() => handleDeleteUserClick(user.id)} className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer">
                                    <FaTrash className="mr-1" />
                                    Delete
                                  </Button>
                                </>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── APPROVALS TAB ── */}
      {activeTab === 'approvals' && (
        <Card className="border-zinc-100 shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-zinc-950">Pending Member Registrations</CardTitle>
            <CardDescription className="text-zinc-500">Approve or reject new user portal accounts before they can report or resolve issues.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <div className="text-center py-12 text-zinc-500 text-sm">Loading request queue...</div>
            ) : pendingRegistrations.length === 0 ? (
              <div className="text-center py-12 text-zinc-400 text-sm border-dashed border border-zinc-100 rounded-xl bg-zinc-50/20">
                No pending registrations at the moment.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-zinc-100 hover:bg-transparent">
                      <TableHead>Full Name</TableHead>
                      <TableHead>Email Address</TableHead>
                      <TableHead className="w-32">Requested Role</TableHead>
                      <TableHead className="w-48 text-right">Approval Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingRegistrations.map((user) => (
                      <TableRow key={user.id} className="hover:bg-zinc-50/50 transition-colors">
                        <TableCell className="font-semibold text-zinc-900">{user.name}</TableCell>
                        <TableCell className="text-zinc-500">{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`font-semibold text-[10px] rounded-full border-none px-2 py-0.5 ${user.role === 'ADMIN' ? 'bg-rose-50 text-rose-700' :
                            user.role === 'AGENT' ? 'bg-amber-50 text-amber-700' :
                              'bg-green-50 text-green-700'
                            }`}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button size="xs" onClick={() => handleApprove(user.id)} className="bg-brand-green hover:bg-brand-dark-green text-white text-xs font-semibold cursor-pointer">
                            <FaCheck className="mr-1" />Approve
                          </Button>
                          <Button size="xs" variant="outline" onClick={() => handleReject(user.id)} className="text-red-600 border-red-200 hover:bg-red-50 text-xs font-semibold cursor-pointer">
                            <FaUserTimes className="mr-1" />Reject
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── ISSUE DETAIL MODAL ── */}
      {viewingIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 relative">
            {/* Close */}
            <button onClick={() => setViewingIssue(null)} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer">
              <FaTimes size={18} />
            </button>

            {/* Ticket number */}
            <div>
              <p className="text-xs font-bold text-zinc-400 tracking-widest uppercase mb-1">Ticket Reference</p>
              <h2 className="text-2xl font-extrabold text-zinc-950">TKT-{String(viewingIssue.id).padStart(4, '0')}</h2>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className={`font-bold rounded-full border-none px-3 py-1 text-xs ${viewingIssue.status === 'OPEN' ? 'bg-rose-50 text-rose-700' :
                viewingIssue.status === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-700' :
                viewingIssue.status === 'REJECTED' ? 'bg-red-50 text-red-700' :
                  'bg-green-50 text-green-700'
                }`}>
                {viewingIssue.status.replace('_', ' ')}
              </Badge>
              <Badge variant="outline" className={`font-bold rounded-full border-none px-3 py-1 text-xs ${viewingIssue.priority === 'HIGH' ? 'bg-red-50 text-red-700' :
                viewingIssue.priority === 'MEDIUM' ? 'bg-blue-50 text-blue-700' :
                  'bg-zinc-100 text-zinc-700'
                }`}>
                {viewingIssue.priority} Priority
              </Badge>
              {!viewingIssue.assignedToId && (
                <Badge variant="outline" className="font-bold rounded-full border-none px-3 py-1 text-xs bg-amber-50 text-amber-700">
                  ⚠ Unassigned
                </Badge>
              )}
            </div>

            {/* Title */}
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Issue Title</p>
              <p className="text-base font-bold text-zinc-900">{viewingIssue.title}</p>
            </div>

            {/* Description */}
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Description</p>
              <p className="text-sm text-zinc-700 leading-relaxed">{viewingIssue.description}</p>
            </div>

            {/* Rejection Reason */}
            {viewingIssue.status === 'REJECTED' && viewingIssue.rejectionReason && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-1">Rejection Reason</p>
                <p className="text-sm text-red-800 font-medium">{viewingIssue.rejectionReason}</p>
              </div>
            )}

            {/* Reporter Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Reported By</p>
                <p className="text-sm font-semibold text-zinc-800">{viewingIssue.reportedBy?.name}</p>
                <p className="text-xs text-zinc-500">{viewingIssue.reportedBy?.email}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Logged</p>
                <p className="text-sm text-zinc-700">{new Date(viewingIssue.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>

            {/* Contact Fields */}
            {(viewingIssue.phone || viewingIssue.address) && (
              <div className="grid grid-cols-1 gap-3 bg-zinc-50 rounded-xl p-4 border border-zinc-100">
                {viewingIssue.phone && (
                  <div className="flex items-center gap-2">
                    <FaPhoneAlt size={12} className="text-zinc-400 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Contact Phone</p>
                      <p className="text-sm font-semibold text-zinc-800">{viewingIssue.phone}</p>
                    </div>
                  </div>
                )}
                {viewingIssue.address && (
                  <div className="flex items-center gap-2">
                    <FaMapMarkerAlt size={12} className="text-zinc-400 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Problem Location</p>
                      <p className="text-sm font-semibold text-zinc-800">{viewingIssue.address}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Screenshot */}
            {viewingIssue.imageUrl && (
              <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Attached Screenshot</p>
                <div className="relative w-full h-48 rounded-xl overflow-hidden border border-zinc-200">
                  <Image src={viewingIssue.imageUrl} alt="Incident Screenshot" fill className="object-contain bg-zinc-50" />
                </div>
              </div>
            )}

            {/* Assign Action */}
            {(!viewingIssue.assignedToId || viewingIssue.assignedTo?.role !== 'AGENT') && (
              <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Assign to Support Staff</p>
                {(() => {
                  // Find next agent in rotation among active agents
                  if (agentsList.length === 0) {
                    return <p className="text-xs text-zinc-500 italic">No active support agents available for assignment.</p>
                  }
                  // Find the last issue created that was assigned to one of active agents (using ALL issues for round-robin)
                  const assignedToAgentIssues = [...allIssues]
                    .filter(i => i.assignedToId && agentsList.some(a => a.id === i.assignedToId))
                    .sort((a, b) => b.id - a.id)
                  const lastAssignedIssue = assignedToAgentIssues[0]
                  let nextAgent = agentsList[0]
                  if (lastAssignedIssue && lastAssignedIssue.assignedToId) {
                    const lastIndex = agentsList.findIndex(a => a.id === lastAssignedIssue.assignedToId)
                    if (lastIndex !== -1) {
                      nextAgent = agentsList[(lastIndex + 1) % agentsList.length]
                    }
                  }

                  return (
                    <div className="flex items-center justify-between bg-zinc-50 border border-zinc-200 rounded-xl p-3.5">
                      <div>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Next in Rotation</p>
                        <p className="text-sm font-bold text-zinc-800">{nextAgent.name} ({nextAgent.role})</p>
                      </div>
                      <Button
                        size="sm"
                        className="bg-brand-green hover:bg-brand-dark-green text-white font-semibold cursor-pointer shrink-0"
                        onClick={() => {
                          handleAssign(viewingIssue.id, nextAgent.id.toString())
                          setViewingIssue(null)
                        }}
                      >
                        <FaCheck className="mr-1.5" />
                        Assign
                      </Button>
                    </div>
                  )
                })()}
              </div>
            )}

            {viewingIssue.assignedToId && viewingIssue.assignedTo?.role === 'AGENT' && (
              <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-sm font-semibold text-green-700 flex items-center gap-2">
                <FaCheck />
                Assigned to: {viewingIssue.assignedTo?.name || 'Support Staff'}
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
              <Button variant="outline" size="sm" onClick={() => setViewingIssue(null)} className="border-zinc-200 cursor-pointer">
                Close
              </Button>
              {viewingIssue.status !== 'REJECTED' && (!viewingIssue.assignedToId || viewingIssue.assignedTo?.role !== 'AGENT') && (
                <Button
                  size="sm"
                  onClick={() => handleRejectIssue(viewingIssue.id)}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold cursor-pointer"
                >
                  <FaTimes className="mr-1.5" />
                  Reject Report
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── CUSTOM REJECT ISSUE CONFIRMATION MODAL ── */}
      {rejectIssueId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <Card className="max-w-md w-full border border-zinc-100 shadow-xl rounded-2xl bg-white overflow-hidden p-6 mx-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-zinc-950">Reject Issue Report</h3>
            <p className="text-zinc-500 text-sm mt-2">
              Please enter the reason for rejecting this operational incident report. The reporter will be notified of this reason.
            </p>
            <div className="mt-4">
              <textarea
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-brand-green"
                rows={3}
                placeholder="Reason for rejection (e.g., Duplicate ticket, invalid report details...)"
                value={rejectReasonText}
                onChange={(e) => setRejectReasonText(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button
                variant="outline"
                size="sm"
                className="border-zinc-200 hover:bg-zinc-50 cursor-pointer"
                onClick={() => setRejectIssueId(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                onClick={() => confirmRejectIssue(rejectIssueId)}
              >
                Confirm Rejection
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── CUSTOM REJECT USER REGISTRATION CONFIRMATION MODAL ── */}
      {rejectUserId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <Card className="max-w-md w-full border border-zinc-100 shadow-xl rounded-2xl bg-white overflow-hidden p-6 mx-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-zinc-950">Reject Registration Request</h3>
            <p className="text-zinc-500 text-sm mt-2">
              Are you sure you want to reject and delete this registration request?
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button
                variant="outline"
                size="sm"
                className="border-zinc-200 hover:bg-zinc-50 cursor-pointer"
                onClick={() => setRejectUserId(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                onClick={() => confirmRejectUser(rejectUserId)}
              >
                Reject Request
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── CUSTOM WARN USER CONFIRMATION MODAL ── */}
      {warnUserId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <Card className="max-w-md w-full border border-zinc-100 shadow-xl rounded-2xl bg-white overflow-hidden p-6 mx-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-zinc-950">Issue Warning to User</h3>
            <p className="text-zinc-500 text-sm mt-2">
              Please enter the reason for issuing a warning to this user. This will increase their warning count and notify them.
            </p>
            <div className="mt-4">
              <textarea
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-brand-green"
                rows={3}
                placeholder="Reason for warning (e.g. Spam reporting, inappropriate ticket language...)"
                value={warnReasonText}
                onChange={(e) => setWarnReasonText(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button
                variant="outline"
                size="sm"
                className="border-zinc-200 hover:bg-zinc-50 cursor-pointer"
                onClick={() => setWarnUserId(null)}
              >
                Cancel
              </Button>
              <Button
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold cursor-pointer text-sm"
                onClick={confirmWarnUser}
              >
                Issue Warning
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── CUSTOM BAN USER CONFIRMATION MODAL ── */}
      {banUserId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <Card className="max-w-md w-full border border-zinc-100 shadow-xl rounded-2xl bg-white overflow-hidden p-6 mx-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-zinc-950">Ban User Account</h3>
            <p className="text-zinc-500 text-sm mt-2">
              Please enter the reason for banning this account. The user will see this reason when they try to sign in.
            </p>
            <div className="mt-4">
              <textarea
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-brand-green"
                rows={3}
                placeholder="Reason for ban (e.g. Repeated violation of IT ticket guidelines...)"
                value={banReasonText}
                onChange={(e) => setBanReasonText(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button
                variant="outline"
                size="sm"
                className="border-zinc-200 hover:bg-zinc-50 cursor-pointer"
                onClick={() => setBanUserId(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white cursor-pointer font-semibold"
                onClick={confirmToggleBan}
              >
                Confirm Ban
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── CUSTOM DELETE USER CONFIRMATION MODAL ── */}
      {deleteUserId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <Card className="max-w-md w-full border border-zinc-100 shadow-xl rounded-2xl bg-white overflow-hidden p-6 mx-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-zinc-950">Delete User Account</h3>
            <p className="text-zinc-500 text-sm mt-2">
              Are you sure you want to completely delete this user account? This will permanently remove all their reported incidents, history, logs, and information. This cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button
                variant="outline"
                size="sm"
                className="border-zinc-200 hover:bg-zinc-50 cursor-pointer"
                onClick={() => setDeleteUserId(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                onClick={() => confirmDeleteUser(deleteUserId)}
              >
                Delete Account Completely
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
