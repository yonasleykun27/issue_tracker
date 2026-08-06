'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { truncateHtml, stripHtml } from '@/app/lib/stripHtml'
import { useRouter } from 'next/navigation'
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
  SortingState,
} from '@tanstack/react-table'
import { FaPlus, FaSearch, FaDownload, FaEdit, FaChevronLeft, FaChevronRight, FaSort, FaEye, FaTrash, FaCheck, FaTimes } from 'react-icons/fa'
import toast from 'react-hot-toast'
import { useSession } from 'next-auth/react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
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
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  createdAt: string
  assignedTo?: {
    id: number
    name: string
    role?: string
  } | null
  assignedToId?: number | null
  projectDivisionId?: number | null
  projectDivision?: {
    id: number
    name: string
    key: string
  } | null
}

export default function IssuesPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const userRole = (session?.user as any)?.role || 'USER'
  const userStatus = (session?.user as any)?.status
  
  const [deleteId, setDeleteId] = useState<number | null>(null)

  // Redirect if pending approval
  useEffect(() => {
    if (session && userStatus === 'PENDING') {
      router.replace('/')
    }
  }, [session, userStatus, router])
  
  // Table state managers
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [priorityFilter, setPriorityFilter] = useState('ALL')
  const [assignmentFilter, setAssignmentFilter] = useState('ALL')
  const [divisionFilter, setDivisionFilter] = useState('ALL')
  const [divisions, setDivisions] = useState<any[]>([])
  const [rejectId, setRejectId] = useState<number | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  useEffect(() => {
    fetch('/api/admin/divisions')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setDivisions(data))
      .catch(console.error)
  }, [])

  // Fetch all issues via React Query
  const { data: issues = [], isLoading } = useQuery<Issue[]>({
    queryKey: ['issues-all'],
    queryFn: () =>
      fetch('/api/issues').then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      })
  })

  // Inline delete mutation
  const deleteMutation = useMutation({
    mutationFn: (issueId: number) =>
      fetch(`/api/issues/${issueId}`, { method: 'DELETE' }).then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      }),
    onSuccess: () => {
      toast.success('Incident deleted successfully!')
      queryClient.invalidateQueries({ queryKey: ['issues-all'] })
    },
    onError: () => toast.error('Failed to delete incident')
  })

  const approveMutation = useMutation({
    mutationFn: (issueId: number) =>
      fetch(`/api/issues/${issueId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }).then(async (res) => {
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || 'Failed to approve incident')
        }
        return data
      }),
    onSuccess: () => {
      toast.success('Incident approved and assigned to agent successfully!')
      queryClient.invalidateQueries({ queryKey: ['issues-all'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to approve incident')
    }
  })

  const rejectMutation = useMutation({
    mutationFn: ({ issueId, reason }: { issueId: number; reason: string }) =>
      fetch(`/api/issues/${issueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'REJECTED',
          rejectionReason: reason
        })
      }).then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      }),
    onSuccess: () => {
      toast.success('Incident rejected successfully!')
      queryClient.invalidateQueries({ queryKey: ['issues-all'] })
      setRejectId(null)
      setRejectionReason('')
    },
    onError: () => toast.error('Failed to reject incident')
  })

  // Filter issues based on select drop-downs first, then feed to TanStack Table global filtering
  const filteredData = useMemo(() => {
    return issues.filter((issue) => {
      const matchesStatus = statusFilter === 'ALL' || issue.status === statusFilter
      const matchesPriority = priorityFilter === 'ALL' || issue.priority === priorityFilter
      const isAssigned = !!(issue.assignedTo && issue.assignedTo.role === 'AGENT')
      const matchesAssignment =
        assignmentFilter === 'ALL' ? true :
        assignmentFilter === 'ASSIGNED' ? isAssigned :
        assignmentFilter === 'UNASSIGNED' ? (!isAssigned && issue.status !== 'REJECTED') :
        assignmentFilter === 'REJECTED' ? issue.status === 'REJECTED' :
        true
      const matchesDivision = divisionFilter === 'ALL' || String(issue.projectDivisionId) === divisionFilter
      return matchesStatus && matchesPriority && matchesAssignment && matchesDivision
    })
  }, [issues, statusFilter, priorityFilter, assignmentFilter, divisionFilter])

  // Columns definition for TanStack Table
  const columns = useMemo<ColumnDef<Issue>[]>(
    () => [
      {
        accessorKey: 'id',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="hover:bg-zinc-50 font-bold p-0 text-zinc-500 cursor-pointer"
          >
            Ticket No.
            <FaSort className="ml-2 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => {
          const issue = row.original
          const projKey = issue.projectDivision?.key || 'GEN'
          return (
            <span className="font-mono font-bold text-zinc-500">
              {projKey}-{issue.id}
            </span>
          )
        }
      },
      {
        accessorKey: 'title',
        header: 'Issue Title',
        cell: ({ row }) => (
          <div>
            <Link
              href={`/issues/${row.original.id}`}
              className="font-semibold text-zinc-900 hover:text-brand-green transition-colors block"
            >
              {row.getValue('title')}
            </Link>
            <span className="text-xs text-zinc-400 block mt-0.5 max-w-md truncate">
              {truncateHtml(row.original.description, 90)}
            </span>
          </div>
        )
      },
      {
        accessorKey: 'projectDivision.name',
        header: 'Project',
        cell: ({ row }) => {
          const divName = row.original.projectDivision?.name
          return (
            <Badge variant="outline" className="font-semibold text-zinc-650 bg-zinc-50 border border-zinc-150 rounded-full px-2 py-0.5 text-xs">
              {divName || 'None'}
            </Badge>
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
        id: 'assignedTo',
        header: 'Assigned Agent',
        cell: ({ row }) => {
          const agent = row.original.assignedTo
          return agent ? (
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-[10px] font-extrabold text-brand-green">
                {agent.name.slice(0, 2).toUpperCase()}
              </div>
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                {agent.name}
              </span>
            </div>
          ) : (
            <span className="text-xs italic text-zinc-400 dark:text-zinc-500">Unassigned</span>
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
        header: () => <div className="text-right no-print font-bold text-zinc-500 dark:text-zinc-400">Actions</div>,
        cell: ({ row }) => {
          const issue = row.original
          const isAssignedToAgent = !!(issue.assignedTo && issue.assignedTo.role === 'AGENT')
          const canDelete = userRole === 'ADMIN' || (userRole === 'USER' && !isAssignedToAgent)
          
          if (userRole === 'ADMIN') {
            const isUnassignedOpen = issue.status === 'OPEN' && !isAssignedToAgent
            return (
              <div className="flex items-center justify-end gap-1.5 no-print">
                {/* 1. Approve */}
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => approveMutation.mutate(issue.id)}
                  disabled={!isUnassignedOpen || approveMutation.isPending}
                  className="h-7 px-2 text-xs font-semibold border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-450 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 disabled:opacity-50 disabled:bg-zinc-50 dark:disabled:bg-zinc-900 disabled:text-zinc-400 dark:disabled:text-zinc-650 disabled:border-zinc-200 dark:disabled:border-zinc-800 cursor-pointer flex items-center gap-1"
                >
                  <FaCheck size={11} />
                  <span>Approve</span>
                </Button>

                {/* 2. Reject */}
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => {
                    setRejectId(issue.id)
                    setRejectionReason('')
                  }}
                  disabled={!isUnassignedOpen || rejectMutation.isPending}
                  className="h-7 px-2 text-xs font-semibold border-rose-250 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-450 hover:bg-rose-100 dark:hover:bg-rose-950/40 disabled:opacity-50 disabled:bg-zinc-50 dark:disabled:bg-zinc-900 disabled:text-zinc-400 dark:disabled:text-zinc-650 disabled:border-zinc-200 dark:disabled:border-zinc-800 cursor-pointer flex items-center gap-1"
                >
                  <FaTimes size={11} />
                  <span>Reject</span>
                </Button>

                {/* 3. View (Edit) */}
                <Link href={issue.status === 'REJECTED' || issue.status === 'RESOLVED' ? `/issues/${issue.id}` : `/issues/${issue.id}?mode=edit`}>
                  <Button
                    variant="outline"
                    size="xs"
                    className="h-7 px-2 text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-850 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-350 cursor-pointer flex items-center gap-1"
                  >
                    <FaEye size={11} />
                    <span>View</span>
                  </Button>
                </Link>

                {/* 4. Delete */}
                <Button
                  variant="destructive"
                  size="xs"
                  onClick={() => setDeleteId(issue.id)}
                  disabled={deleteMutation.isPending}
                  className="h-7 px-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer flex items-center gap-1"
                >
                  <FaTrash size={10} />
                  <span>Delete</span>
                </Button>
              </div>
            )
          }

          const isReadOnlyStatus = issue.status === 'REJECTED' || issue.status === 'RESOLVED'

          return (
            <div className="flex items-center justify-end gap-1.5 no-print">
              {isReadOnlyStatus ? (
                <Link href={`/issues/${issue.id}`}>
                  <Button
                    variant="outline"
                    size="xs"
                    className="h-7 px-2 text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-850 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer flex items-center gap-1"
                  >
                    <FaEye size={11} />
                    <span>View</span>
                  </Button>
                </Link>
              ) : (
                <Link href={`/issues/${issue.id}?mode=edit`}>
                  <Button
                    variant="outline"
                    size="xs"
                    className="h-7 px-2 text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-850 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer flex items-center gap-1"
                  >
                    <FaEdit size={11} />
                    <span>Edit</span>
                  </Button>
                </Link>
              )}
              {canDelete && (
                <Button
                  variant="destructive"
                  size="xs"
                  className="h-7 px-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer flex items-center gap-1"
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
    data: filteredData,
    columns,
    state: {
      sorting,
      globalFilter
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel()
  })

  const exportToCSV = () => {
    if (filteredData.length === 0) {
      toast.error('No data to export')
      return
    }

    const headers = ['Ticket Number', 'Title', 'Description', 'Status', 'Priority', 'Created At']
    const rows = filteredData.map((issue) => [
      issue.id,
      `"${issue.title.replace(/"/g, '""')}"`,
      `"${stripHtml(issue.description).replace(/"/g, '""')}"`,

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
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-950 dark:text-zinc-50 tracking-tight">All Incidents</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">View, query, and export logged telecommunication incidents.</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={exportToCSV}
            variant="outline"
            className="flex items-center space-x-1.5 border-zinc-200 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-zinc-700 dark:text-zinc-200 font-medium h-9 cursor-pointer"
          >
            <FaDownload size={13} />
            <span>Export CSV</span>
          </Button>
          <Button
            onClick={() => window.print()}
            variant="outline"
            className="flex items-center space-x-1.5 border-zinc-200 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-zinc-700 dark:text-zinc-200 font-medium no-print h-9 cursor-pointer"
          >
            <span>📄 Download PDF</span>
          </Button>
          {(userRole === 'USER' || userRole === 'ADMIN') && (
            <Link href="/issues/new">
              <Button
                className="bg-brand-green hover:bg-brand-dark-green text-white font-medium flex items-center space-x-1.5 shadow-sm h-9 cursor-pointer border-none"
              >
                <FaPlus size={12} />
                <span>{userRole === 'ADMIN' ? 'New Task' : 'New Issue'}</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Filters & Search */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${userRole === 'ADMIN' ? 'md:grid-cols-6' : 'md:grid-cols-5'} gap-4 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-sm no-print`}>
        <div className="relative md:col-span-2">
          <FaSearch className="absolute left-3 top-3 text-zinc-400" size={14} />
          <Input
            type="text"
            placeholder="Search issues by title or description..."
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm text-zinc-955 dark:text-zinc-100 focus-visible:ring-brand-green dark:bg-zinc-850 dark:border-zinc-800"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-850 focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-brand-green cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        <div>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-850 focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-brand-green cursor-pointer"
          >
            <option value="ALL">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>

        <div>
          <select
            value={divisionFilter}
            onChange={(e) => setDivisionFilter(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-850 focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-brand-green cursor-pointer"
          >
            <option value="ALL">All Projects</option>
            {divisions.map((div) => (
              <option key={div.id} value={String(div.id)}>
                {div.name}
              </option>
            ))}
          </select>
        </div>

        {userRole === 'ADMIN' && (
          <div>
            <select
              value={assignmentFilter}
              onChange={(e) => setAssignmentFilter(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-850 focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-brand-green cursor-pointer"
            >
              <option value="ALL">All Assignments</option>
              <option value="ASSIGNED">Assigned Reports</option>
              <option value="UNASSIGNED">Unassigned Reports</option>
              <option value="REJECTED">Rejected Reports</option>
            </select>
          </div>
        )}
      </div>

      {/* Improved Table using TanStack Table */}
      <div className="rounded-xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="text-center py-20 text-zinc-500 dark:text-zinc-400 text-sm">Loading issues...</div>
        ) : table.getRowModel().rows.length === 0 ? (
          <div className="text-center py-20 text-zinc-400 dark:text-zinc-500 text-sm border-dashed border-2 border-zinc-100 dark:border-zinc-800 m-6 rounded-xl">
            No issues found matching your filters.
          </div>
        ) : (
          <div className="space-y-4">
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
                    <TableRow key={row.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/40 transition-colors border-b border-zinc-100 dark:border-zinc-800/80 group">
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="text-zinc-850 dark:text-zinc-200">{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 p-4 no-print">
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                Showing Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
              </span>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  variant="outline"
                  size="xs"
                  className="border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-zinc-700 dark:text-zinc-350 font-semibold cursor-pointer"
                >
                  <FaChevronLeft className="mr-1" />
                  Previous
                </Button>
                <Button
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  variant="outline"
                  size="xs"
                  className="border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-zinc-700 dark:text-zinc-350 font-semibold cursor-pointer"
                >
                  Next
                  <FaChevronRight className="ml-1" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* ── DELETE MODAL ── */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <Card className="max-w-md w-full border border-zinc-100 dark:border-zinc-800 shadow-xl rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden p-6 mx-4 animate-in fade-in zoom-in-95 duration-150 no-print">
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

      {/* ── REJECT MODAL ── */}
      {rejectId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <Card className="max-w-md w-full border border-zinc-100 dark:border-zinc-800 shadow-xl rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden p-6 mx-4 animate-in fade-in zoom-in-95 duration-150 no-print">
            <h3 className="text-lg font-bold text-zinc-950 dark:text-zinc-50">Reject Incident Report</h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-2">
              Please enter the reason for rejecting this report. This reason will be communicated to the reporter.
            </p>
            <div className="mt-4">
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Type rejection reason here..."
                rows={4}
                className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-800 rounded-lg dark:bg-zinc-850 bg-white dark:bg-zinc-900 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-brand-green"
              />
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button
                variant="outline"
                size="sm"
                className="border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-zinc-700 dark:text-zinc-350 cursor-pointer"
                onClick={() => {
                  setRejectId(null)
                  setRejectionReason('')
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-rose-600 hover:bg-rose-700 text-white cursor-pointer border-none"
                onClick={() => {
                  if (!rejectionReason.trim()) {
                    toast.error('Rejection reason is required.')
                    return
                  }
                  rejectMutation.mutate({ issueId: rejectId, reason: rejectionReason })
                }}
                disabled={rejectMutation.isPending}
              >
                {rejectMutation.isPending ? 'Rejecting...' : 'Reject Report'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
