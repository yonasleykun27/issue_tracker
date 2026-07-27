'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  ColumnDef,
  flexRender,
} from '@tanstack/react-table'
import { FaInbox, FaSpinner, FaCheckCircle, FaClock, FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import toast from 'react-hot-toast'

interface Issue {
  id: number
  title: string
  description: string
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  createdAt: string
  reportedBy: {
    name: string
  }
  assignedToId?: number | null
}

type FilterStatus = 'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'

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
  const queryClient = useQueryClient()
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL')

  // Fetch Agent Issues via React Query
  const { data: issues = [], isLoading } = useQuery<Issue[]>({
    queryKey: ['agent-issues', userId],
    queryFn: () =>
      fetch('/api/issues').then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      }),
    select: (data) => data.filter((i) => i.assignedToId === userId)
  })

  // Mutation for updating status
  const updateStatusMutation = useMutation({
    mutationFn: ({ issueId, status }: { issueId: number; status: string }) =>
      fetch(`/api/issues/${issueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      }).then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      }),
    onSuccess: () => {
      toast.success('Status updated! Reporter will be notified by email.')
      queryClient.invalidateQueries({ queryKey: ['agent-issues', userId] })
    },
    onError: () => toast.error('Failed to update status')
  })

  // Filter issues based on active status tab
  const filteredIssues = useMemo(() => {
    if (filterStatus === 'ALL') return issues
    return issues.filter((i) => i.status === filterStatus)
  }, [issues, filterStatus])

  // Columns definition for TanStack Table
  const columns = useMemo<ColumnDef<Issue>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'Ticket No.',
        cell: ({ row }) => (
          <span className="font-mono font-bold text-zinc-500">
            TKT-{String(row.getValue('id')).padStart(4, '0')}
          </span>
        )
      },
      {
        accessorKey: 'title',
        header: 'Issue Title',
        cell: ({ row }) => (
          <Link
            href={`/issues/${row.original.id}`}
            className="font-semibold text-zinc-900 hover:text-brand-green transition-colors"
          >
            {row.getValue('title')}
          </Link>
        )
      },
      {
        accessorKey: 'status',
        header: 'Change Status',
        cell: ({ row }) => (
          <select
            value={row.original.status}
            onChange={(e) => updateStatusMutation.mutate({ issueId: row.original.id, status: e.target.value })}
            className={`px-2 py-1 rounded-md text-xs font-semibold border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-green cursor-pointer ${
              row.original.status === 'OPEN' ? 'bg-rose-50 text-rose-700' :
              row.original.status === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-700' :
              'bg-green-50 text-green-700'
            }`}
          >
            <option value="OPEN" className="bg-white text-zinc-900">Open</option>
            <option value="IN_PROGRESS" className="bg-white text-zinc-900">In Progress</option>
            <option value="RESOLVED" className="bg-white text-zinc-900">Resolved</option>
          </select>
        )
      },
      {
        accessorKey: 'priority',
        header: 'Priority',
        cell: ({ row }) => {
          const priority = row.getValue('priority') as string
          return (
            <Badge
              variant="outline"
              className={`font-semibold rounded-full border-none px-2 py-0.5 text-xs ${
                priority === 'HIGH' ? 'bg-red-50 text-red-700' :
                priority === 'MEDIUM' ? 'bg-blue-50 text-blue-700' :
                'bg-zinc-100 text-zinc-700'
              }`}
            >
              {priority}
            </Badge>
          )
        }
      },
      {
        accessorKey: 'reportedBy.name',
        header: 'Reported By',
        cell: ({ row }) => (
          <span className="text-zinc-600 font-medium text-xs">
            {row.original.reportedBy?.name}
          </span>
        )
      },
      {
        accessorKey: 'createdAt',
        header: 'Time Open',
        cell: ({ row }) => (
          <span className="flex items-center gap-1 text-xs text-zinc-500 font-medium">
            <FaClock size={10} className="text-zinc-400" />
            {timeOpen(row.getValue('createdAt'))}
          </span>
        )
      }
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [issues]
  )

  // TanStack Table Instance
  const table = useReactTable({
    data: filteredIssues,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel()
  })

  const openCount = issues.filter((i) => i.status === 'OPEN').length
  const inProgressCount = issues.filter((i) => i.status === 'IN_PROGRESS').length
  const resolvedCount = issues.filter((i) => i.status === 'RESOLVED').length

  const filterTabs: { key: FilterStatus; label: string; count: number; activeColor: string }[] = [
    { key: 'ALL', label: 'All Tickets', count: issues.length, activeColor: 'border-zinc-800 text-zinc-900' },
    { key: 'OPEN', label: 'Open', count: openCount, activeColor: 'border-rose-500 text-rose-700' },
    { key: 'IN_PROGRESS', label: 'In Progress', count: inProgressCount, activeColor: 'border-amber-500 text-amber-700' },
    { key: 'RESOLVED', label: 'Resolved', count: resolvedCount, activeColor: 'border-green-600 text-green-700' }
  ]

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
            <Card key={s.label} className={`border ${s.border} shadow-xs overflow-hidden`}>
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
      <Card className="border-zinc-100 shadow-xs rounded-2xl overflow-hidden bg-white">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-xl font-bold text-zinc-950">My Work Queue</CardTitle>
              <CardDescription className="text-zinc-500">Update status to notify the reporter by email.</CardDescription>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-1 mt-4 border-b border-zinc-100">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilterStatus(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all outline-none cursor-pointer ${
                  filterStatus === tab.key ? `${tab.activeColor} bg-transparent` : 'border-transparent text-zinc-400 hover:text-zinc-600'
                }`}
              >
                {tab.label}
                <span
                  className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                    filterStatus === tab.key ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-zinc-500 text-sm">Loading your queue...</div>
          ) : filteredIssues.length === 0 ? (
            <div className="text-center py-12 text-zinc-400 text-sm border-dashed border-2 border-zinc-100 rounded-xl">
              {filterStatus === 'ALL'
                ? 'Great job! Your queue is empty. No issues currently assigned to you.'
                : `No ${filterStatus.replace('_', ' ').toLowerCase()} tickets in your queue.`}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id} className="border-b border-zinc-100 hover:bg-transparent">
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id}>
                            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id} className="hover:bg-zinc-50/50 transition-colors">
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* TanStack Table Pagination */}
              <div className="flex items-center justify-between border-t border-zinc-100 pt-4">
                <div className="text-xs text-zinc-500">
                  Showing Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                    className="text-xs border-zinc-200 cursor-pointer"
                  >
                    <FaChevronLeft className="mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                    className="text-xs border-zinc-200 cursor-pointer"
                  >
                    Next
                    <FaChevronRight className="ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
