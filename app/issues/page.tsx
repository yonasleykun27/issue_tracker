'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FaPlus, FaSearch, FaDownload, FaSortAmountDown, FaSortAmountUp, FaEdit } from 'react-icons/fa'
import toast from 'react-hot-toast'
import { useSession } from 'next-auth/react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface Issue {
  id: number
  title: string
  description: string
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  createdAt: string
  assignedTo?: {
    name: string
  }
}

export default function IssuesPage() {
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role || 'USER'
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [priorityFilter, setPriorityFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState<keyof Issue>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  useEffect(() => {
    fetch('/api/issues')
      .then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then((data) => setIssues(data))
      .catch(() => toast.error('Failed to load issues from database'))
      .finally(() => setLoading(false))
  }, [])

  // Filter issues
  const filteredIssues = issues.filter((issue) => {
    const matchesSearch =
      issue.title.toLowerCase().includes(search.toLowerCase()) ||
      issue.description.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'ALL' || issue.status === statusFilter
    const matchesPriority = priorityFilter === 'ALL' || issue.priority === priorityFilter
    return matchesSearch && matchesStatus && matchesPriority
  })

  // Sort issues
  const sortedIssues = [...filteredIssues].sort((a, b) => {
    let valA = a[sortBy]
    let valB = b[sortBy]

    if (sortBy === 'createdAt') {
      valA = new Date(a.createdAt).getTime()
      valB = new Date(b.createdAt).getTime()
    }

    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
    }

    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortOrder === 'asc' ? valA - valB : valB - valA
    }

    return 0
  })

  // Pagination
  const totalPages = Math.ceil(sortedIssues.length / itemsPerPage)
  const paginatedIssues = sortedIssues.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const handleSort = (field: keyof Issue) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
    setCurrentPage(1)
  }

  const exportToCSV = () => {
    if (filteredIssues.length === 0) {
      toast.error('No data to export')
      return
    }

    const headers = ['Ticket Number', 'Title', 'Description', 'Status', 'Priority', 'Created At']
    const rows = filteredIssues.map((issue) => [
      issue.id,
      `"${issue.title.replace(/"/g, '""')}"`,
      `"${issue.description.replace(/"/g, '""')}"`,
      issue.status,
      issue.priority,
      new Date(issue.createdAt).toLocaleDateString()
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `ethio_telecom_issues_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('CSV exported successfully!')
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-950 tracking-tight">System Issues</h1>
          <p className="text-zinc-500 text-sm">View, query, and export logged telecommunication incidents.</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={exportToCSV}
            variant="outline"
            className="flex items-center space-x-1.5 border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-medium"
          >
            <FaDownload size={13} />
            <span>Export CSV</span>
          </Button>
          <Button
            onClick={() => window.print()}
            variant="outline"
            className="flex items-center space-x-1.5 border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-medium no-print h-9 cursor-pointer"
          >
            <span>📄 Download PDF</span>
          </Button>
          {userRole !== 'ADMIN' && (
            <Link href="/issues/new">
              <Button
                className="bg-brand-green hover:bg-brand-dark-green text-white font-medium flex items-center space-x-1.5 shadow-sm"
              >
                <FaPlus size={12} />
                <span>New Issue</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-xl border border-zinc-100 shadow-sm no-print">
        <div className="relative md:col-span-2">
          <FaSearch className="absolute left-3 top-3 text-zinc-400" size={14} />
          <Input
            type="text"
            placeholder="Search issues by title or description..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setCurrentPage(1)
            }}
            className="pl-9 pr-4 py-2 text-sm text-zinc-950 focus-visible:ring-brand-green"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm text-zinc-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-brand-green"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>

        <div>
          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm text-zinc-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-brand-green"
          >
            <option value="ALL">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
      </div>

      {/* Improved Table using Shadcn */}
      <div className="rounded-xl border border-zinc-100 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-20 text-zinc-500 text-sm">Loading issues...</div>
        ) : paginatedIssues.length === 0 ? (
          <div className="text-center py-20 text-zinc-400 text-sm border-dashed border-2 border-zinc-100 m-6 rounded-xl">
            No issues found matching your filters.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-b border-zinc-100 hover:bg-transparent">
                <TableHead
                  onClick={() => handleSort('id')}
                  className="cursor-pointer hover:text-brand-green transition-colors w-32"
                >
                  <div className="flex items-center space-x-1">
                    <span>Ticket No.</span>
                    {sortBy === 'id' && (sortOrder === 'asc' ? <FaSortAmountUp size={10} /> : <FaSortAmountDown size={10} />)}
                  </div>
                </TableHead>
                <TableHead
                  onClick={() => handleSort('title')}
                  className="cursor-pointer hover:text-brand-green transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Issue Title</span>
                    {sortBy === 'title' && (sortOrder === 'asc' ? <FaSortAmountUp size={10} /> : <FaSortAmountDown size={10} />)}
                  </div>
                </TableHead>
                <TableHead
                  onClick={() => handleSort('status')}
                  className="cursor-pointer hover:text-brand-green transition-colors w-28"
                >
                  <div className="flex items-center space-x-1">
                    <span>Status</span>
                    {sortBy === 'status' && (sortOrder === 'asc' ? <FaSortAmountUp size={10} /> : <FaSortAmountDown size={10} />)}
                  </div>
                </TableHead>
                <TableHead
                  onClick={() => handleSort('priority')}
                  className="cursor-pointer hover:text-brand-green transition-colors w-28"
                >
                  <div className="flex items-center space-x-1">
                    <span>Priority</span>
                    {sortBy === 'priority' && (sortOrder === 'asc' ? <FaSortAmountUp size={10} /> : <FaSortAmountDown size={10} />)}
                  </div>
                </TableHead>
                <TableHead
                  onClick={() => handleSort('createdAt')}
                  className="cursor-pointer hover:text-brand-green transition-colors w-32"
                >
                  <div className="flex items-center space-x-1">
                    <span>Logged At</span>
                    {sortBy === 'createdAt' && (sortOrder === 'asc' ? <FaSortAmountUp size={10} /> : <FaSortAmountDown size={10} />)}
                  </div>
                </TableHead>
                 <TableHead className="text-right w-16 no-print">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedIssues.map((issue) => (
                <TableRow key={issue.id} className="hover:bg-zinc-50/50 transition-colors group">
                  <TableCell className="font-mono font-bold text-zinc-500">TKT-{String(issue.id).padStart(4, '0')}</TableCell>
                  <TableCell>
                    <Link
                      href={`/issues/${issue.id}`}
                      className="font-semibold text-zinc-900 hover:text-brand-green transition-colors block"
                    >
                      {issue.title}
                    </Link>
                    <span className="text-xs text-zinc-400 block mt-0.5 max-w-md truncate">
                      {issue.description}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`font-semibold rounded-full border-none px-2 py-0.5 text-xs ${issue.status === 'OPEN' ? 'bg-rose-50 text-rose-700' :
                          issue.status === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-700' :
                            'bg-green-50 text-green-700'
                        }`}
                    >
                      {issue.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`font-semibold rounded-full border-none px-2 py-0.5 text-xs ${issue.priority === 'HIGH' ? 'bg-red-50 text-red-700' :
                          issue.priority === 'MEDIUM' ? 'bg-blue-50 text-blue-700' :
                            'bg-zinc-100 text-zinc-700'
                        }`}
                    >
                      {issue.priority}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-zinc-500">
                    {new Date(issue.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right opacity-0 group-hover:opacity-100 transition-opacity no-print">
                    <Link
                      href={`/issues/${issue.id}`}
                      className="text-zinc-400 hover:text-brand-green transition-colors inline-block"
                      title="Edit Issue"
                    >
                      <FaEdit size={14} />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-zinc-100 no-print">
          <span className="text-sm text-zinc-500">
            Showing Page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              variant="outline"
              size="sm"
              className="border-zinc-200 hover:bg-zinc-50 font-medium"
            >
              Previous
            </Button>
            <Button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              variant="outline"
              size="sm"
              className="border-zinc-200 hover:bg-zinc-50 font-medium"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
