'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FaInbox, FaSpinner, FaCheckCircle, FaPlus, FaSearch, FaEdit, FaTrash } from 'react-icons/fa'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'

interface Issue {
  id: number
  title: string
  description: string
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  createdAt: string
  assignedTo?: {
    name: string
    role: string
  }
  rejectionReason?: string | null
}

export default function UserDashboard({ userId }: { userId: number }) {
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [warnings, setWarnings] = useState<{ warningCount: number; statusReason: string | null; warningLogs: any[] } | null>(null)

  useEffect(() => {
    fetch('/api/issues')
      .then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then((data) => setIssues(data))
      .catch(() => toast.error('Failed to load your reported issues'))
      .finally(() => setLoading(false))

    fetch('/api/users/warnings')
      .then(res => res.ok ? res.json() : null)
      .then(data => setWarnings(data))
      .catch(console.error)
  }, [])

  const openCount = issues.filter(i => i.status === 'OPEN').length
  const inProgressCount = issues.filter(i => i.status === 'IN_PROGRESS').length
  const resolvedCount = issues.filter(i => i.status === 'RESOLVED').length

  const stats = [
    { label: 'My Open Issues', count: openCount, color: 'text-rose-600 bg-rose-50', border: 'border-rose-100', icon: FaInbox },
    { label: 'My In Progress', count: inProgressCount, color: 'text-amber-600 bg-amber-50', border: 'border-amber-100', icon: FaSpinner },
    { label: 'My Resolved', count: resolvedCount, color: 'text-brand-green bg-green-50', border: 'border-green-100', icon: FaCheckCircle }
  ]

  // Filter issues based on search query
  const filteredIssues = issues.filter((issue) => {
    return (
      issue.title.toLowerCase().includes(search.toLowerCase()) ||
      issue.description.toLowerCase().includes(search.toLowerCase()) ||
      `TKT-${String(issue.id).padStart(4, '0')}`.toLowerCase().includes(search.toLowerCase())
    )
  })

  const handleDelete = (id: number) => {
    setDeleteId(id)
  }

  const confirmDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/issues/${id}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error()
      toast.success('Incident report deleted successfully!')
      setIssues(issues.filter((issue) => issue.id !== id))
    } catch {
      toast.error('Failed to delete incident report')
    } finally {
      setDeleteId(null)
    }
  }

  const { data: session } = useSession()
  const loggedInUser = session?.user as { status?: string; statusReason?: string | null } | undefined

  return (
    <>
      <div className="space-y-8">
        {/* Welcome header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-zinc-950 tracking-tight">Employee Portal</h1>
            <p className="text-zinc-500 mt-1">Report and monitor your IT operational support requests.</p>
          </div>
          <Link href="/issues/new">
            <Button className="bg-brand-green hover:bg-brand-dark-green text-white font-semibold flex items-center space-x-2 transition-colors shadow-sm cursor-pointer">
              <FaPlus size={14} />
              <span>Report New Issue</span>
            </Button>
          </Link>
        </div>

        {/* Warning notification banner */}
        {warnings && warnings.warningCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 text-amber-800 animate-in fade-in duration-200">
            <span className="text-xl shrink-0">⚠️</span>
            <div>
              <h4 className="font-bold text-amber-900">Account Warning Issued (Total Warnings: {warnings.warningCount})</h4>
              <p className="text-sm mt-0.5 font-medium">
                You have received warning notification(s) from the administrator. Please review the warning history reasons below and adhere to system guidelines:
              </p>
              <div className="mt-3 space-y-2 max-w-2xl">
                {warnings.warningLogs && warnings.warningLogs.length > 0 ? (
                  warnings.warningLogs.map((log: any, idx: number) => (
                    <div key={log.id} className="text-xs bg-amber-100/40 border border-amber-200/60 rounded-xl p-3">
                      <div className="flex justify-between font-bold text-amber-955 mb-1.5 text-[10px]">
                        <span>WARNING #{warnings.warningLogs.length - idx}</span>
                        <span className="text-zinc-500 font-medium">{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="font-medium text-amber-900 font-sans">{log.reason}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-xs bg-amber-100/50 border border-amber-200 rounded-lg p-2.5 font-mono text-amber-955">
                    {warnings.statusReason || 'No specific warning reason was documented by the administrator.'}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((s) => {
            const Icon = s.icon
            const isSpinning = s.label.includes('In Progress') && s.count > 0
            return (
              <Card key={s.label} className={`border ${s.border} shadow-sm overflow-hidden`}>
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <span className="text-zinc-500 text-sm font-medium block">{s.label}</span>
                    <span className="text-4xl font-extrabold text-zinc-950 mt-2 block">{s.count}</span>
                  </div>
                  <div className={`p-4 rounded-xl ${s.color}`}>
                    <Icon size={24} className={isSpinning ? 'animate-spin' : ''} />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Table of My Reported Issues */}
        <Card className="border-zinc-100 shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-bold text-zinc-950">My Incident History</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-zinc-500 text-sm">Loading your issues...</div>
            ) : issues.length === 0 ? (
              <div className="text-center py-12 text-zinc-400 text-sm border-dashed border border-zinc-100 rounded-xl bg-zinc-50/30">
                Your incident report history is currently clear. No support tickets logged.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Search bar */}
                <div className="relative max-w-md">
                  <FaSearch className="absolute left-3 top-3 text-zinc-400" size={14} />
                  <Input
                    placeholder="Search by title, description or ticket number..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-10 focus-visible:ring-brand-green"
                  />
                </div>

                {filteredIssues.length === 0 ? (
                  <div className="text-center py-12 text-zinc-400 text-sm border-dashed border border-zinc-100 rounded-xl bg-zinc-50/30">
                    No incident reports match your search query.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-zinc-100 hover:bg-transparent">
                          <TableHead className="w-28">Ticket No.</TableHead>
                          <TableHead>Issue Title</TableHead>
                          <TableHead className="w-28">Status</TableHead>
                          <TableHead className="w-28">Priority</TableHead>
                          <TableHead className="w-32">Assigned To</TableHead>
                          <TableHead className="w-28">Logged At</TableHead>
                          <TableHead className="w-32 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredIssues.map((issue) => (
                          <TableRow key={issue.id} className="hover:bg-zinc-50/50 transition-colors">
                            <TableCell className="font-mono font-bold text-zinc-500">TKT-{String(issue.id).padStart(4, '0')}</TableCell>
                            <TableCell>
                              <Link
                                href={`/issues/${issue.id}`}
                                className="font-semibold text-zinc-900 hover:text-brand-green transition-colors"
                              >
                                {issue.title}
                              </Link>
                              {issue.status === 'REJECTED' && issue.rejectionReason && (
                                <div className="text-xs text-rose-600 font-medium mt-1">
                                  Reason for rejection: {issue.rejectionReason}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`font-semibold rounded-full border-none px-2 py-0.5 text-xs ${
                                  issue.status === 'OPEN' ? 'bg-rose-50 text-rose-700' :
                                  issue.status === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-700' :
                                  issue.status === 'REJECTED' ? 'bg-red-50 text-red-700' :
                                  'bg-green-50 text-green-700'
                                }`}
                              >
                                {issue.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`font-semibold rounded-full border-none px-2 py-0.5 text-xs ${
                                  issue.priority === 'HIGH' ? 'bg-red-50 text-red-700' :
                                  issue.priority === 'MEDIUM' ? 'bg-blue-50 text-blue-700' :
                                  'bg-zinc-100 text-zinc-700'
                                }`}
                              >
                                {issue.priority}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-zinc-600 font-medium">
                              {(issue.assignedTo && issue.assignedTo.role === 'AGENT') ? issue.assignedTo.name : 'Unassigned'}
                            </TableCell>
                            <TableCell className="text-zinc-500">
                              {new Date(issue.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              {(() => {
                                const isAssignedToAgent = !!(issue.assignedTo && issue.assignedTo.role === 'AGENT')
                                return (
                                  <div className="flex items-center justify-end gap-2">
                                    <Link href={`/issues/${issue.id}`}>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 px-2 text-xs font-semibold hover:bg-zinc-50 border-zinc-200 cursor-pointer flex items-center gap-1"
                                      >
                                        <FaEdit size={11} />
                                        <span>Edit</span>
                                      </Button>
                                    </Link>
                                    {!isAssignedToAgent && (
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        className="h-8 px-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer flex items-center gap-1"
                                        onClick={() => handleDelete(issue.id)}
                                      >
                                        <FaTrash size={10} />
                                        <span>Delete</span>
                                      </Button>
                                    )}
                                  </div>
                                )
                              })()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── CUSTOM DELETE CONFIRMATION MODAL ── */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <Card className="max-w-md w-full border border-zinc-100 shadow-xl rounded-2xl bg-white overflow-hidden p-6 mx-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-zinc-950">Delete Incident Report</h3>
            <p className="text-zinc-500 text-sm mt-2">
              Are you sure you want to delete this incident report? This cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button
                variant="outline"
                size="sm"
                className="border-zinc-200 hover:bg-zinc-50 cursor-pointer"
                onClick={() => setDeleteId(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
                onClick={() => confirmDelete(deleteId)}
              >
                Delete
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  )
}
