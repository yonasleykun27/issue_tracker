'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { FaInbox, FaSpinner, FaCheckCircle, FaClock } from 'react-icons/fa'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import toast from 'react-hot-toast'

interface Issue {
  id: number
  title: string
  description: string
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  createdAt: string
  reportedBy: {
    name: string
  }
}

type FilterStatus = 'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'
type SortField = 'priority' | 'createdAt'

const PRIORITY_ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 }

function timeOpen(createdAt: string): string {
  const diffMs = Date.now() - new Date(createdAt).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function AgentDashboard({ userId }: { userId: number }) {
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL')
  const [sortField, setSortField] = useState<SortField>('priority')

  function fetchIssues() {
    fetch('/api/issues')
      .then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then((data) => {
        const assigned = data.filter((i: { assignedToId: number | null }) => i.assignedToId === userId)
        setIssues(assigned)
      })
      .catch(() => toast.error('Failed to load assigned issues'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchIssues()
  }, [])

  const handleStatusChange = async (issueId: number, newStatus: string) => {
    try {
      const response = await fetch(`/api/issues/${issueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) throw new Error()
      
      toast.success('Status updated! Reporter will be notified by email.')
      fetchIssues()
    } catch {
      toast.error('Failed to update status')
    }
  }

  const openCount = issues.filter(i => i.status === 'OPEN').length
  const inProgressCount = issues.filter(i => i.status === 'IN_PROGRESS').length
  const resolvedCount = issues.filter(i => i.status === 'RESOLVED').length

  const filterTabs: { key: FilterStatus; label: string; count: number; color: string; activeColor: string }[] = [
    { key: 'ALL', label: 'All Tickets', count: issues.length, color: 'text-zinc-500', activeColor: 'border-zinc-800 text-zinc-900' },
    { key: 'OPEN', label: 'Open', count: openCount, color: 'text-rose-500', activeColor: 'border-rose-500 text-rose-700' },
    { key: 'IN_PROGRESS', label: 'In Progress', count: inProgressCount, color: 'text-amber-500', activeColor: 'border-amber-500 text-amber-700' },
    { key: 'RESOLVED', label: 'Resolved', count: resolvedCount, color: 'text-green-600', activeColor: 'border-green-600 text-green-700' },
  ]

  const filteredAndSorted = useMemo(() => {
    let result = filterStatus === 'ALL' ? issues : issues.filter(i => i.status === filterStatus)
    result = [...result].sort((a, b) => {
      if (sortField === 'priority') {
        const diff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
        if (diff !== 0) return diff
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })
    return result
  }, [issues, filterStatus, sortField])

  const stats = [
    { label: 'Assigned (Open)', count: openCount, color: 'text-rose-600 bg-rose-50', border: 'border-rose-100', icon: FaInbox },
    { label: 'In Progress', count: inProgressCount, color: 'text-amber-600 bg-amber-50', border: 'border-amber-100', icon: FaSpinner },
    { label: 'Resolved', count: resolvedCount, color: 'text-brand-green bg-green-50', border: 'border-green-100', icon: FaCheckCircle }
  ]

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-zinc-950 tracking-tight">IT Support Portal</h1>
        <p className="text-zinc-500 mt-1">Manage and resolve incidents assigned to your queue.</p>
      </div>

      {/* Stats Cards */}
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

      {/* Table of Assigned Issues */}
      <Card className="border-zinc-100 shadow-sm rounded-2xl overflow-hidden bg-white">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-xl font-bold text-zinc-950">My Work Queue</CardTitle>
              <CardDescription className="text-zinc-500">Update status to notify the reporter by email.</CardDescription>
            </div>
            {/* Sort control */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 font-medium">Sort by:</span>
              <button
                onClick={() => setSortField('priority')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${sortField === 'priority' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
              >
                Priority
              </button>
              <button
                onClick={() => setSortField('createdAt')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${sortField === 'createdAt' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
              >
                Oldest First
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-1 mt-4 border-b border-zinc-100">
            {filterTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilterStatus(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all outline-none cursor-pointer ${
                  filterStatus === tab.key
                    ? `${tab.activeColor} bg-transparent`
                    : 'border-transparent text-zinc-400 hover:text-zinc-600'
                }`}
              >
                {tab.label}
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                  filterStatus === tab.key ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-zinc-500 text-sm">Loading your queue...</div>
          ) : filteredAndSorted.length === 0 ? (
            <div className="text-center py-12 text-zinc-400 text-sm border-dashed border-2 border-zinc-100 rounded-xl">
              {filterStatus === 'ALL'
                ? 'Great job! Your queue is empty. No issues currently assigned to you.'
                : `No ${filterStatus.replace('_', ' ').toLowerCase()} tickets in your queue.`}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-zinc-100 hover:bg-transparent">
                    <TableHead className="w-32">Ticket No.</TableHead>
                    <TableHead>Issue Title</TableHead>
                    <TableHead className="w-36">Change Status</TableHead>
                    <TableHead className="w-28">Priority</TableHead>
                    <TableHead className="w-32">Reported By</TableHead>
                    <TableHead className="w-28">Time Open</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSorted.map((issue) => (
                    <TableRow key={issue.id} className="hover:bg-zinc-50/50 transition-colors">
                      <TableCell className="font-mono font-bold text-zinc-500">TKT-{String(issue.id).padStart(4, '0')}</TableCell>
                      <TableCell>
                        <Link
                          href={`/issues/${issue.id}`}
                          className="font-semibold text-zinc-900 hover:text-brand-green transition-colors"
                        >
                          {issue.title}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <select
                          value={issue.status}
                          onChange={(e) => handleStatusChange(issue.id, e.target.value)}
                          className={`px-2 py-1 rounded-md text-xs font-semibold border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-green cursor-pointer ${
                            issue.status === 'OPEN' ? 'bg-rose-50 text-rose-700' :
                            issue.status === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-700' :
                            'bg-green-50 text-green-700'
                          }`}
                        >
                          <option value="OPEN" className="bg-white text-zinc-900">Open</option>
                          <option value="IN_PROGRESS" className="bg-white text-zinc-900">In Progress</option>
                          <option value="RESOLVED" className="bg-white text-zinc-900">Resolved</option>
                        </select>
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
                        {issue.reportedBy?.name}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-xs text-zinc-500 font-medium">
                          <FaClock size={10} className="text-zinc-400" />
                          {timeOpen(issue.createdAt)}
                        </span>
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
  )
}
