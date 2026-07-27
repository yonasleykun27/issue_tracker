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
import { FaInbox, FaSpinner, FaCheckCircle, FaPlus, FaSearch, FaEdit, FaEye, FaTrash, FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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
  } | null
  rejectionReason?: string | null
}

interface WarningData {
  warningCount: number
  statusReason: string | null
  warningLogs: any[]
}

export default function UserDashboard({ userId }: { userId: number }) {
  const queryClient = useQueryClient()
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [globalFilter, setGlobalFilter] = useState('')

  // 1. Fetch Reported Issues
  const { data: issues = [], isLoading } = useQuery<Issue[]>({
    queryKey: ['user-issues', userId],
    queryFn: () =>
      fetch('/api/issues').then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      })
  })

  // 2. Fetch Warnings
  const { data: warnings = null } = useQuery<WarningData | null>({
    queryKey: ['user-warnings', userId],
    queryFn: () => fetch('/api/users/warnings').then((res) => (res.ok ? res.json() : null))
  })

  // 3. Delete Issue Mutation
  const deleteMutation = useMutation({
    mutationFn: (issueId: number) =>
      fetch(`/api/issues/${issueId}`, { method: 'DELETE' }).then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      }),
    onSuccess: () => {
      toast.success('Incident report deleted successfully!')
      queryClient.invalidateQueries({ queryKey: ['user-issues', userId] })
    },
    onError: () => toast.error('Failed to delete incident report')
  })

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
        cell: ({ row }) => {
          const issue = row.original
          return (
            <div>
              <Link
                href={`/issues/${issue.id}`}
                className="font-semibold text-zinc-900 hover:text-brand-green transition-colors"
              >
                {row.getValue('title')}
              </Link>
              {issue.status === 'REJECTED' && issue.rejectionReason && (
                <div className="text-xs text-rose-600 font-medium mt-1">
                  Reason for rejection: {issue.rejectionReason}
                </div>
              )}
            </div>
          )
        }
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = row.getValue('status') as string
          return (
            <Badge
              variant="outline"
              className={`font-semibold rounded-full border-none px-2 py-0.5 text-xs ${
                status === 'OPEN' ? 'bg-rose-50 text-rose-700' :
                status === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-700' :
                status === 'REJECTED' ? 'bg-red-50 text-red-700' :
                'bg-green-50 text-green-700'
              }`}
            >
              {status}
            </Badge>
          )
        }
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
        accessorKey: 'assignedTo.name',
        header: 'Assigned To',
        cell: ({ row }) => {
          const assigned = row.original.assignedTo
          return (
            <span className="text-zinc-600 font-medium text-xs">
              {assigned && assigned.role === 'AGENT' ? assigned.name : 'Unassigned'}
            </span>
          )
        }
      },
      {
        accessorKey: 'createdAt',
        header: 'Logged At',
        cell: ({ row }) => (
          <span className="text-zinc-500 text-xs">
            {new Date(row.getValue('createdAt')).toLocaleDateString()}
          </span>
        )
      },
      {
        id: 'actions',
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => {
          const issue = row.original
          const isAssignedToAgent = !!(issue.assignedTo && issue.assignedTo.role === 'AGENT')
          const isReadOnlyStatus = issue.status === 'RESOLVED' || issue.status === 'REJECTED'
          return (
            <div className="flex items-center justify-end gap-2">
              {isReadOnlyStatus ? (
                <Link href={`/issues/${issue.id}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 text-xs font-semibold hover:bg-zinc-50 border-zinc-200 cursor-pointer flex items-center gap-1"
                  >
                    <FaEye size={11} />
                    <span>View</span>
                  </Button>
                </Link>
              ) : (
                <Link href={`/issues/${issue.id}?mode=edit`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 text-xs font-semibold hover:bg-zinc-50 border-zinc-200 cursor-pointer flex items-center gap-1"
                  >
                    <FaEdit size={11} />
                    <span>Edit</span>
                  </Button>
                </Link>
              )}
              {!isAssignedToAgent && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-8 px-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer flex items-center gap-1"
                  onClick={() => setDeleteId(issue.id)}
                >
                  <FaTrash size={10} />
                  <span>Delete</span>
                </Button>
              )}
            </div>
          )
        }
      }
    ],
    []
  )

  // TanStack Table Instance
  const table = useReactTable({
    data: issues,
    columns,
    state: {
      globalFilter
    },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel()
  })

  const openCount = issues.filter((i) => i.status === 'OPEN').length
  const inProgressCount = issues.filter((i) => i.status === 'IN_PROGRESS').length
  const resolvedCount = issues.filter((i) => i.status === 'RESOLVED').length

  const stats = [
    { label: 'My Open Issues', count: openCount, color: 'text-rose-600 bg-rose-50', border: 'border-rose-100', icon: FaInbox },
    { label: 'My In Progress', count: inProgressCount, color: 'text-amber-600 bg-amber-50', border: 'border-amber-100', icon: FaSpinner },
    { label: 'My Resolved', count: resolvedCount, color: 'text-brand-green bg-green-50', border: 'border-green-100', icon: FaCheckCircle }
  ]

  return (
    <>
      <div className="space-y-8">
        {/* Welcome header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-zinc-950 dark:text-zinc-50 tracking-tight">Employee Portal</h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1">Report and monitor your IT operational support requests.</p>
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
              <Card key={s.label} className={`border ${s.border} dark:border-zinc-800/80 shadow-sm overflow-hidden bg-white dark:bg-zinc-900`}>
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <span className="text-zinc-500 dark:text-zinc-400 text-sm font-medium block">{s.label}</span>
                    <span className="text-4xl font-extrabold text-zinc-950 dark:text-zinc-50 mt-2 block">{s.count}</span>
                  </div>
                  <div className={`p-4 rounded-xl ${s.color} dark:bg-zinc-800`}>
                    <Icon size={24} className={isSpinning ? 'animate-spin' : ''} />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Table of My Reported Issues */}
        <Card className="border-zinc-100 dark:border-zinc-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-zinc-900">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 pb-4">
            <div>
              <CardTitle className="text-xl font-bold text-zinc-950 dark:text-zinc-50">My Incident History</CardTitle>
            </div>
            <div className="relative w-full sm:w-72">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={13} />
              <Input
                placeholder="Search issues..."
                value={globalFilter ?? ''}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-9 text-xs focus-visible:ring-brand-green dark:bg-zinc-850 dark:border-zinc-800 dark:text-zinc-100"
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-zinc-500 dark:text-zinc-400 text-sm">Loading your issues...</div>
            ) : issues.length === 0 ? (
              <div className="text-center py-12 text-zinc-400 dark:text-zinc-500 text-sm border-dashed border border-zinc-100 dark:border-zinc-800 rounded-xl bg-zinc-50/30 dark:bg-zinc-950/20">
                Your incident report history is currently clear. No support tickets logged.
              </div>
            ) : (
              <div className="space-y-4">
                {table.getRowModel().rows.length === 0 ? (
                  <div className="text-center py-12 text-zinc-400 dark:text-zinc-500 text-sm border-dashed border border-zinc-100 dark:border-zinc-800 rounded-xl bg-zinc-50/30 dark:bg-zinc-950/20">
                    No incident reports match your search query.
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-transparent">
                              {headerGroup.headers.map((header) => (
                                <TableHead key={header.id} className="text-zinc-500 dark:text-zinc-400 font-bold">
                                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                </TableHead>
                              ))}
                            </TableRow>
                          ))}
                        </TableHeader>
                        <TableBody>
                          {table.getRowModel().rows.map((row) => (
                            <TableRow key={row.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors border-b border-zinc-100 dark:border-zinc-800/80">
                              {row.getVisibleCells().map((cell) => (
                                <TableCell key={cell.id} className="text-zinc-800 dark:text-zinc-200">
                                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 pt-4">
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        Showing Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => table.previousPage()}
                          disabled={!table.getCanPreviousPage()}
                          className="text-xs border-zinc-200 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-850 cursor-pointer"
                        >
                          <FaChevronLeft className="mr-1" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => table.nextPage()}
                          disabled={!table.getCanNextPage()}
                          className="text-xs border-zinc-200 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-850 cursor-pointer"
                        >
                          Next
                          <FaChevronRight className="ml-1" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── DELETE MODAL ── */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <Card className="max-w-md w-full border border-zinc-100 dark:border-zinc-800 shadow-xl rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden p-6 mx-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-zinc-950 dark:text-zinc-50">Delete Incident Report</h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-2">
              Are you sure you want to delete this incident report? This cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button
                variant="outline"
                size="sm"
                className="border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-zinc-700 dark:text-zinc-350 cursor-pointer"
                onClick={() => setDeleteId(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
                onClick={() => {
                  deleteMutation.mutate(deleteId)
                  setDeleteId(null)
                }}
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
