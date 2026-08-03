'use client'

import { useState, useMemo, useEffect, Suspense } from 'react'
import Image from 'next/image'
import { useSearchParams, useRouter } from 'next/navigation'
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
import {
  FaInbox,
  FaSpinner,
  FaCheckCircle,
  FaUserShield,
  FaExclamationTriangle,
  FaBan,
  FaCheck,
  FaTasks,
  FaUserCheck,
  FaUserTimes,
  FaPause,
  FaChartBar,
  FaTimes,
  FaPhoneAlt,
  FaMapMarkerAlt,
  FaEye,
  FaSearch,
  FaChevronLeft,
  FaChevronRight,
  FaSort,
  FaTrash
} from 'react-icons/fa'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import toast from 'react-hot-toast'
import { stripHtml } from '@/app/lib/stripHtml'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import dynamic from 'next/dynamic'

const RichTextEditor = dynamic(() => import('@/app/components/RichTextEditor'), { ssr: false })

interface Issue {
  id: number
  title: string
  description: string
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  imageUrl?: string | null
  phone?: string | null
  address?: string | null
  createdAt: string
  reportedBy: {
    name: string
    email: string
  }
  assignedToId?: number | null
  assignedTo?: { name: string; role?: string } | null
  projectDivisionId?: number | null
  projectDivision?: { name: string; key: string } | null
}

interface User {
  id: number
  name: string
  email: string
  role: 'USER' | 'AGENT' | 'ADMIN'
  status: 'PENDING' | 'ACTIVE' | 'WARNED' | 'BANNED' | 'ON_LEAVE'
  warningCount: number
}

interface AnalyticsItem {
  date: string
  open: number
  inProgress: number
  resolved: number
  label: string
}

function AdminDashboardInner() {
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const router = useRouter()
  const tab = searchParams.get('tab')
  const activeTab = tab === 'staff' ? 'users' : tab === 'approvals' ? 'approvals' : tab === 'divisions' ? 'divisions' : 'issues'

  const [viewingIssue, setViewingIssue] = useState<Issue | null>(null)
  
  // Dialog & Modal input states
  const [rejectIssueId, setRejectIssueId] = useState<number | null>(null)
  const [rejectReasonText, setRejectReasonText] = useState('')
  const [warnUserId, setWarnUserId] = useState<number | null>(null)
  const [warnUserWarnings, setWarnUserWarnings] = useState(0)
  const [warnReasonText, setWarnReasonText] = useState('')
  const [banUserId, setBanUserId] = useState<number | null>(null)
  const [banUserCurrentStatus, setBanUserCurrentStatus] = useState('')
  const [banReasonText, setBanReasonText] = useState('')
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null)
  const [rejectUserId, setRejectUserId] = useState<number | null>(null)

  // User approval states
  const [approvingUserObj, setApprovingUserObj] = useState<User | null>(null)
  const [selectedRole, setSelectedRole] = useState<'USER' | 'AGENT' | 'ADMIN'>('USER')

  // Division management states
  const [newDivisionName, setNewDivisionName] = useState('')
  const [newDivisionKey, setNewDivisionKey] = useState('')
  const [newDivisionDesc, setNewDivisionDesc] = useState('')
  const [newDivisionDeadline, setNewDivisionDeadline] = useState('')
  const [editingDivisionId, setEditingDivisionId] = useState<number | null>(null)
  const [editingDivisionName, setEditingDivisionName] = useState('')
  const [editingDivisionKey, setEditingDivisionKey] = useState('')
  const [editingDivisionDesc, setEditingDivisionDesc] = useState('')
  const [editingDivisionDeadline, setEditingDivisionDeadline] = useState('')
  const [deleteDivisionId, setDeleteDivisionId] = useState<number | null>(null)

  // TanStack Table states for Incidents Queue
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  // TanStack Table states for Staff Queue
  const [sortingStaff, setSortingStaff] = useState<SortingState>([])
  const [globalFilterStaff, setGlobalFilterStaff] = useState('')

  // TanStack Table states for Approvals Queue
  const [sortingApprovals, setSortingApprovals] = useState<SortingState>([])
  const [globalFilterApprovals, setGlobalFilterApprovals] = useState('')

  // 1. Fetch Issues
  const { data: issues = [], isLoading: loadingIssues } = useQuery<Issue[]>({
    queryKey: ['admin-issues'],
    queryFn: () =>
      fetch('/api/issues').then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      })
  })

  // 2. Fetch Users
  const { data: users = [], isLoading: loadingUsers } = useQuery<User[]>({
    queryKey: ['admin-users'],
    queryFn: () =>
      fetch('/api/admin/users').then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      })
  })

  // 3. Fetch Analytics
  const { data: analyticsData = [], isLoading: loadingAnalytics } = useQuery<AnalyticsItem[]>({
    queryKey: ['admin-analytics'],
    queryFn: () => fetch('/api/admin/analytics').then((res) => (res.ok ? res.json() : []))
  })

  // 4. Fetch Divisions
  const { data: divisions = [], isLoading: loadingDivisions } = useQuery<any[]>({
    queryKey: ['admin-divisions'],
    queryFn: () =>
      fetch('/api/admin/divisions').then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      })
  })

  const createDivisionMutation = useMutation({
    mutationFn: ({ name, key, description, deadline }: { name: string; key: string; description: string; deadline: string }) =>
      fetch('/api/admin/divisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, key, description, deadline })
      }).then((res) => {
        if (!res.ok) return res.json().then((d) => { throw new Error(d.error || 'Failed') })
        return res.json()
      }),
    onSuccess: () => {
      toast.success('Project created successfully!')
      setNewDivisionName('')
      setNewDivisionKey('')
      setNewDivisionDesc('')
      setNewDivisionDeadline('')
      queryClient.invalidateQueries({ queryKey: ['admin-divisions'] })
    },
    onError: (err: any) => toast.error(err.message || 'Failed to create project')
  })

  const updateDivisionMutation = useMutation({
    mutationFn: ({ id, name, key, description, deadline }: { id: number; name: string; key: string; description: string; deadline: string }) =>
      fetch(`/api/admin/divisions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, key, description, deadline })
      }).then((res) => {
        if (!res.ok) return res.json().then((d) => { throw new Error(d.error || 'Failed') })
        return res.json()
      }),
    onSuccess: () => {
      toast.success('Project updated successfully!')
      setEditingDivisionId(null)
      setEditingDivisionName('')
      setEditingDivisionKey('')
      setEditingDivisionDesc('')
      setEditingDivisionDeadline('')
      queryClient.invalidateQueries({ queryKey: ['admin-divisions'] })
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update project')
  })

  const deleteDivisionMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/admin/divisions/${id}`, { method: 'DELETE' }).then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      }),
    onSuccess: () => {
      toast.success('Project deleted successfully!')
      queryClient.invalidateQueries({ queryKey: ['admin-divisions'] })
    },
    onError: () => toast.error('Failed to delete project')
  })

  // Mutations
  const assignMutation = useMutation({
    mutationFn: ({ issueId, agentId }: { issueId: number; agentId: string }) =>
      fetch(`/api/issues/${issueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedToId: parseInt(agentId) })
      }).then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      }),
    onSuccess: () => {
      toast.success('Ticket assigned successfully!')
      queryClient.invalidateQueries({ queryKey: ['admin-issues'] })
    },
    onError: () => toast.error('Failed to assign ticket')
  })

  const rejectIssueMutation = useMutation({
    mutationFn: ({ issueId, reason }: { issueId: number; reason: string }) =>
      fetch(`/api/issues/${issueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REJECTED', rejectionReason: reason })
      }).then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      }),
    onSuccess: () => {
      toast.success('Report rejected and status updated.')
      setViewingIssue(null)
      queryClient.invalidateQueries({ queryKey: ['admin-issues'] })
    },
    onError: () => toast.error('Failed to reject report')
  })

  const warnUserMutation = useMutation({
    mutationFn: ({ userId, currentWarnings, reason }: { userId: number; currentWarnings: number; reason: string }) =>
      fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'WARNED', warningCount: currentWarnings + 1, statusReason: reason })
      }).then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      }),
    onSuccess: () => {
      toast.success('Warning issued to user!')
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: () => toast.error('Failed to warn user')
  })

  const banUserMutation = useMutation({
    mutationFn: ({ userId, ban }: { userId: number; ban: boolean }) =>
      fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          ban
            ? { status: 'BANNED', statusReason: banReasonText }
            : { status: 'ACTIVE', warningCount: 0, statusReason: null }
        )
      }).then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      }),
    onSuccess: (_, variables) => {
      toast.success(variables.ban ? 'User account has been banned!' : 'User account restored!')
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: () => toast.error('Failed to update user status')
  })

  const toggleLeaveMutation = useMutation({
    mutationFn: ({ userId, leave }: { userId: number; leave: boolean }) =>
      fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: leave ? 'ON_LEAVE' : 'ACTIVE' })
      }).then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      }),
    onSuccess: (_, variables) => {
      toast.success(variables.leave ? 'User marked as on leave' : 'User marked as active')
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: () => toast.error('Failed to update leave status')
  })

  const deleteUserMutation = useMutation({
    mutationFn: (userId: number) =>
      fetch(`/api/admin/users/${userId}`, { method: 'DELETE' }).then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      }),
    onSuccess: () => {
      toast.success('User deleted successfully!')
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-issues'] })
    },
    onError: () => toast.error('Failed to delete user')
  })

  const approveRegistrationMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: 'USER' | 'AGENT' | 'ADMIN' }) =>
      fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACTIVE', role })
      }).then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      }),
    onSuccess: () => {
      toast.success('Registration approved and role assigned successfully!')
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: () => toast.error('Failed to approve registration')
  })

  const rejectRegistrationMutation = useMutation({
    mutationFn: (userId: number) =>
      fetch(`/api/admin/users/${userId}`, { method: 'DELETE' }).then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      }),
    onSuccess: () => {
      toast.success('Registration request rejected!')
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: () => toast.error('Failed to reject registration')
  })

  // 1. INCIDENTS TABLE COLUMNS
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
            <div className="font-semibold text-zinc-900">{row.getValue('title')}</div>
            {row.original.imageUrl && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-100 text-zinc-600 mt-0.5">
                📎 Attachment
              </span>
            )}
          </div>
        )
      },
      {
        accessorKey: 'projectDivision.name',
        header: 'Project',
        cell: ({ row }) => {
          const divName = (row.original as any).projectDivision?.name
          return (
            <Badge variant="outline" className="font-semibold rounded-full border-none px-2 py-0.5 text-xs bg-zinc-50 text-zinc-650">
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
              className={`font-semibold rounded-full border-none px-2.5 py-0.5 text-[11px] ${
                status === 'OPEN' ? 'bg-rose-50 text-rose-700' :
                status === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-700' :
                status === 'RESOLVED' ? 'bg-green-50 text-green-700' :
                'bg-zinc-100 text-zinc-700'
              }`}
            >
              {status.replace('_', ' ')}
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
        id: 'reportedBy',
        header: 'Reported By',
        accessorFn: (row) => row.reportedBy?.name || '',
        cell: ({ row }) => (
          <span className="text-zinc-600 dark:text-zinc-450 text-xs font-semibold">{row.original.reportedBy?.name || 'Unknown'}</span>
        )
      },
      {
        id: 'assignedTo',
        header: 'Assigned To',
        accessorFn: (row) => row.assignedTo?.name || '',
        cell: ({ row }) => (
          <span className="text-zinc-500 dark:text-zinc-400 text-xs">
            {row.original.assignedTo ? (
              <span className="font-semibold text-green-700 dark:text-green-400">{row.original.assignedTo.name}</span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400 font-semibold">Unassigned</span>
            )}
          </span>
        )
      },
      {
        id: 'actions',
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => (
          <div className="text-right">
            <Link href={`/issues/${row.original.id}`}>
              <Button
                size="xs"
                variant="outline"
                className="text-xs font-semibold border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:border-zinc-850 dark:hover:bg-zinc-800 cursor-pointer inline-flex items-center gap-1"
              >
                <FaEye className="mr-1" />
                See Detail
              </Button>
            </Link>
          </div>
        )
      }
    ],
    []
  )

  // 2. STAFF DIRECTORY TABLE COLUMNS
  const staffColumns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="hover:bg-zinc-50 font-bold p-0 text-zinc-500 cursor-pointer"
          >
            Full Name
            <FaSort className="ml-2 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => <span className="font-semibold text-zinc-900">{row.getValue('name')}</span>
      },
      {
        accessorKey: 'email',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="hover:bg-zinc-50 font-bold p-0 text-zinc-500 cursor-pointer"
          >
            Email Address
            <FaSort className="ml-2 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => <span className="text-zinc-500">{row.getValue('email')}</span>
      },
      {
        accessorKey: 'role',
        header: 'Role',
        cell: ({ row }) => {
          const role = row.getValue('role') as string
          return (
            <Badge variant="outline" className={`font-semibold text-[10px] rounded-full border-none px-2 py-0.5 ${
              role === 'ADMIN' ? 'bg-rose-50 text-rose-700' :
              role === 'AGENT' ? 'bg-amber-50 text-amber-700' :
              'bg-green-50 text-green-700'
            }`}>
              {role}
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
            <Badge variant="outline" className={`font-semibold text-[10px] rounded-full border-none px-2 py-0.5 ${
              status === 'ACTIVE' ? 'bg-green-50 text-green-700' :
              status === 'WARNED' ? 'bg-amber-50 text-amber-700' :
              status === 'ON_LEAVE' ? 'bg-zinc-100 text-zinc-700' :
              'bg-red-50 text-red-700'
            }`}>
              {status.replace('_', ' ')}
            </Badge>
          )
        }
      },
      {
        accessorKey: 'warningCount',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="hover:bg-zinc-50 font-bold p-0 text-zinc-500 cursor-pointer mx-auto"
          >
            Warnings
            <FaSort className="ml-2 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => <div className="text-center font-bold text-sm text-zinc-700">{row.getValue('warningCount')}</div>
      },
      {
        id: 'moderation',
        header: () => <div className="text-right">Moderation Actions</div>,
        cell: ({ row }) => {
          const user = row.original
          return (
            <div className="text-right space-x-2">
              {(user.role === 'AGENT' || user.role === 'ADMIN') && (
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => toggleLeaveMutation.mutate({ userId: user.id, leave: user.status !== 'ON_LEAVE' })}
                  className="text-zinc-600 border-zinc-200 hover:bg-zinc-50 text-xs font-semibold cursor-pointer"
                >
                  <FaPause className="mr-1" />
                  {user.status === 'ON_LEAVE' ? 'Resume' : 'Leave'}
                </Button>
              )}
              <Button
                size="xs"
                variant="outline"
                onClick={() => {
                  setWarnUserId(user.id)
                  setWarnUserWarnings(user.warningCount)
                  setWarnReasonText('')
                }}
                className="text-amber-600 border-amber-200 hover:bg-amber-50 text-xs font-semibold cursor-pointer"
              >
                <FaExclamationTriangle className="mr-1" />
                Warn
              </Button>
              <Button
                size="xs"
                onClick={() => {
                  if (user.status === 'BANNED') {
                    banUserMutation.mutate({ userId: user.id, ban: false })
                  } else {
                    setBanUserId(user.id)
                    setBanUserCurrentStatus(user.status)
                    setBanReasonText('')
                  }
                }}
                className={`text-xs font-semibold cursor-pointer ${
                  user.status === 'BANNED' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {user.status === 'BANNED' ? <><FaCheck className="mr-1" />Unban</> : <><FaBan className="mr-1" />Ban</>}
              </Button>
              <Button
                size="xs"
                variant="destructive"
                onClick={() => setDeleteUserId(user.id)}
                className="text-xs font-semibold cursor-pointer bg-rose-600 hover:bg-rose-700 text-white"
              >
                <FaTrash className="mr-1" />
                Delete
              </Button>
            </div>
          )
        }
      }
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  // 3. PENDING APPROVALS TABLE COLUMNS
  const approvalsColumns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="hover:bg-zinc-50 font-bold p-0 text-zinc-500 cursor-pointer"
          >
            Full Name
            <FaSort className="ml-2 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => <span className="font-semibold text-zinc-900">{row.getValue('name')}</span>
      },
      {
        accessorKey: 'email',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="hover:bg-zinc-50 font-bold p-0 text-zinc-500 cursor-pointer"
          >
            Email Address
            <FaSort className="ml-2 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => <span className="text-zinc-500">{row.getValue('email')}</span>
      },
      {
        accessorKey: 'role',
        header: 'Requested Role',
        cell: ({ row }) => {
          const role = row.getValue('role') as string
          return (
            <Badge variant="outline" className={`font-semibold text-[10px] rounded-full border-none px-2 py-0.5 ${
              role === 'ADMIN' ? 'bg-rose-50 text-rose-700' :
              role === 'AGENT' ? 'bg-amber-50 text-amber-700' :
              'bg-green-50 text-green-700'
            }`}>
              {role}
            </Badge>
          )
        }
      },
      {
        id: 'actions',
        header: () => <div className="text-right">Approval Actions</div>,
        cell: ({ row }) => {
          const user = row.original
          return (
            <div className="text-right space-x-2">
              <Button
                size="xs"
                onClick={() => {
                  setApprovingUserObj(user)
                  setSelectedRole('USER')
                }}
                className="bg-brand-green hover:bg-brand-dark-green text-white text-xs font-semibold cursor-pointer"
              >
                <FaCheck className="mr-1" />Approve
              </Button>
              <Button
                size="xs"
                variant="outline"
                onClick={() => setRejectUserId(user.id)}
                className="text-red-600 border-red-200 hover:bg-red-50 text-xs font-semibold cursor-pointer"
              >
                <FaUserTimes className="mr-1" />Reject
              </Button>
            </div>
          )
        }
      }
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const staffAccounts = useMemo(() => users.filter((u) => u.status !== 'PENDING'), [users])
  const pendingRegistrations = useMemo(() => users.filter((u) => u.status === 'PENDING'), [users])

  // Initialize TanStack Tables
  const table = useReactTable({
    data: issues,
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

  const staffTable = useReactTable({
    data: staffAccounts,
    columns: staffColumns,
    state: {
      sorting: sortingStaff,
      globalFilter: globalFilterStaff
    },
    onSortingChange: setSortingStaff,
    onGlobalFilterChange: setGlobalFilterStaff,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel()
  })

  const approvalsTable = useReactTable({
    data: pendingRegistrations,
    columns: approvalsColumns,
    state: {
      sorting: sortingApprovals,
      globalFilter: globalFilterApprovals
    },
    onSortingChange: setSortingApprovals,
    onGlobalFilterChange: setGlobalFilterApprovals,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel()
  })

  const openIssues = issues.filter((i) => i.status === 'OPEN').length
  const inProgressIssues = issues.filter((i) => i.status === 'IN_PROGRESS').length
  const resolvedIssues = issues.filter((i) => i.status === 'RESOLVED').length
  const unassignedIssues = issues.filter((i) => !i.assignedToId).length

  const agentsList = users.filter((u) => (u.role === 'AGENT' || u.role === 'ADMIN') && u.status === 'ACTIVE')

  return (
    <div className="space-y-8">
      {/* Welcome Header - Only shown on main Overview (issues) tab */}
      {activeTab === 'issues' && (
        <div>
          <h1 className="text-3xl font-extrabold text-zinc-950 tracking-tight">IT Management Console</h1>
          <p className="text-zinc-500 mt-1">System operational metrics, incident queues, and account controls.</p>
        </div>
      )}

      {/* ── ISSUES TAB ── */}
      {activeTab === 'issues' && (
        <div className="space-y-8">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Unassigned', count: unassignedIssues, color: 'text-amber-600', bg: 'bg-amber-50', icon: FaInbox },
              { label: 'Total Open', count: openIssues, color: 'text-rose-600', bg: 'bg-rose-50', icon: FaInbox },
              { label: 'Active Solving', count: inProgressIssues, color: 'text-blue-600', bg: 'bg-blue-50', icon: FaSpinner },
              { label: 'SLA Resolved', count: resolvedIssues, color: 'text-brand-green', bg: 'bg-green-50', icon: FaCheckCircle }
            ].map((s) => {
              const Icon = s.icon
              return (
                <Card key={s.label} className="border-zinc-200 shadow-xs overflow-hidden bg-white">
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
          <Card className="border-zinc-100 shadow-xs rounded-2xl overflow-hidden bg-white">
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
              ) : analyticsData.every((d) => d.open + d.inProgress + d.resolved === 0) ? (
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

          {/* Incidents Table using TanStack Table */}
          <Card className="border-zinc-100 shadow-xs rounded-2xl overflow-hidden bg-white">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 pb-4">
              <div>
                <CardTitle className="text-xl font-bold text-zinc-950">Incident Management Queue</CardTitle>
                <CardDescription className="text-zinc-500">
                  Review submitted reports. Click <strong>See Detail</strong> to inspect the incident report.
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-72">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={13} />
                <Input
                  placeholder="Search issues..."
                  value={globalFilter ?? ''}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-9 text-xs focus-visible:ring-brand-green focus-visible:border-brand-green"
                />
              </div>
            </CardHeader>
            <CardContent>
              {loadingIssues ? (
                <div className="text-center py-12 text-zinc-500 text-sm">Loading tickets...</div>
              ) : issues.length === 0 ? (
                <div className="text-center py-12 text-zinc-400 text-sm">No incidents logged.</div>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                          <TableRow key={headerGroup.id} className="border-b border-zinc-100 hover:bg-transparent">
                            {headerGroup.headers.map((header) => (
                              <TableHead key={header.id}>
                                {header.isPlaceholder
                                  ? null
                                  : flexRender(header.column.columnDef.header, header.getContext())}
                              </TableHead>
                            ))}
                          </TableRow>
                        ))}
                      </TableHeader>
                      <TableBody>
                        {table.getRowModel().rows.map((row) => (
                          <TableRow key={row.id} className="hover:bg-zinc-50/50 transition-colors">
                            {row.getVisibleCells().map((cell) => (
                              <TableCell key={cell.id}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* TanStack Table Pagination Controls */}
                  <div className="flex items-center justify-between border-t border-zinc-100 pt-4">
                    <div className="text-xs text-zinc-500 font-semibold">
                      Showing Page {table.getState().pagination.pageIndex + 1} of{' '}
                      {table.getPageCount()}
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
      )}

      {/* ── STAFF USERS TAB ── */}
      {activeTab === 'users' && (
        <Card className="border-zinc-100 shadow-xs rounded-2xl overflow-hidden bg-white">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 pb-4">
            <div>
              <CardTitle className="text-xl font-bold text-zinc-950">Staff Directory & Moderation Controls</CardTitle>
              <CardDescription className="text-zinc-500">Monitor employee registration, issue warnings, manage leave breaks, and restrict access.</CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={13} />
              <Input
                placeholder="Search staff accounts..."
                value={globalFilterStaff ?? ''}
                onChange={(e) => setGlobalFilterStaff(e.target.value)}
                className="pl-9 text-xs focus-visible:ring-brand-green"
              />
            </div>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <div className="text-center py-12 text-zinc-500 text-sm">Loading staff records...</div>
            ) : staffAccounts.length === 0 ? (
              <div className="text-center py-12 text-zinc-400 text-sm">No active staff accounts.</div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      {staffTable.getHeaderGroups().map((headerGroup) => (
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
                      {staffTable.getRowModel().rows.map((row) => (
                        <TableRow key={row.id} className="hover:bg-zinc-50/50 transition-colors">
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Staff Table Pagination Controls */}
                <div className="flex items-center justify-between border-t border-zinc-100 pt-4">
                  <div className="text-xs text-zinc-500 font-semibold">
                    Showing Page {staffTable.getState().pagination.pageIndex + 1} of {staffTable.getPageCount()}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => staffTable.previousPage()}
                      disabled={!staffTable.getCanPreviousPage()}
                      className="text-xs border-zinc-200 cursor-pointer"
                    >
                      <FaChevronLeft className="mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => staffTable.nextPage()}
                      disabled={!staffTable.getCanNextPage()}
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
      )}

      {/* ── APPROVALS TAB ── */}
      {activeTab === 'approvals' && (
        <Card className="border-zinc-100 shadow-xs rounded-2xl overflow-hidden bg-white">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 pb-4">
            <div>
              <CardTitle className="text-xl font-bold text-zinc-950">Pending Member Registrations</CardTitle>
              <CardDescription className="text-zinc-500">Approve or reject new user portal accounts before they can report or resolve issues.</CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={13} />
              <Input
                placeholder="Search requests..."
                value={globalFilterApprovals ?? ''}
                onChange={(e) => setGlobalFilterApprovals(e.target.value)}
                className="pl-9 text-xs focus-visible:ring-brand-green"
              />
            </div>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <div className="text-center py-12 text-zinc-500 text-sm">Loading request queue...</div>
            ) : pendingRegistrations.length === 0 ? (
              <div className="text-center py-12 text-zinc-400 text-sm border-dashed border border-zinc-100 rounded-xl bg-zinc-50/20">
                No pending registrations at the moment.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      {approvalsTable.getHeaderGroups().map((headerGroup) => (
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
                      {approvalsTable.getRowModel().rows.map((row) => (
                        <TableRow key={row.id} className="hover:bg-zinc-50/50 transition-colors">
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Approvals Table Pagination Controls */}
                <div className="flex items-center justify-between border-t border-zinc-100 pt-4">
                  <div className="text-xs text-zinc-500 font-semibold">
                    Showing Page {approvalsTable.getState().pagination.pageIndex + 1} of {approvalsTable.getPageCount()}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => approvalsTable.previousPage()}
                      disabled={!approvalsTable.getCanPreviousPage()}
                      className="text-xs border-zinc-200 cursor-pointer"
                    >
                      <FaChevronLeft className="mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => approvalsTable.nextPage()}
                      disabled={!approvalsTable.getCanNextPage()}
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
      )}

      {/* ── PROJECT DIVISIONS TAB ── */}
      {activeTab === 'divisions' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Create / Edit Form */}
          <div className="lg:col-span-4">
            <Card className="border-zinc-105 shadow-xs rounded-2xl bg-white sticky top-20">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-zinc-950">
                  {editingDivisionId ? 'Edit Project' : 'New Project'}
                </CardTitle>
                <CardDescription className="text-zinc-500">
                  {editingDivisionId 
                    ? 'Update the project details.' 
                    : 'Add a new project to categorize operational issues.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (editingDivisionId) {
                      updateDivisionMutation.mutate({
                        id: editingDivisionId,
                        name: editingDivisionName,
                        key: editingDivisionKey,
                        description: editingDivisionDesc,
                        deadline: editingDivisionDeadline
                      })
                    } else {
                      createDivisionMutation.mutate({
                        name: newDivisionName,
                        key: newDivisionKey,
                        description: newDivisionDesc,
                        deadline: newDivisionDeadline
                      })
                    }
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <label htmlFor="div-name-input" className="text-xs font-semibold text-zinc-650 dark:text-zinc-400">Project Name</label>
                    <Input
                      id="div-name-input"
                      required
                      placeholder="e.g., Network Operations"
                      value={editingDivisionId ? editingDivisionName : newDivisionName}
                      onChange={(e) => {
                        if (editingDivisionId) setEditingDivisionName(e.target.value)
                        else setNewDivisionName(e.target.value)
                      }}
                      className="focus-visible:ring-brand-green"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="div-key-input" className="text-xs font-semibold text-zinc-650 dark:text-zinc-400">Project Key</label>
                      <Input
                        id="div-key-input"
                        required
                        maxLength={6}
                        placeholder="e.g., HRM"
                        value={editingDivisionId ? editingDivisionKey : newDivisionKey}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
                          if (editingDivisionId) setEditingDivisionKey(val)
                          else setNewDivisionKey(val)
                        }}
                        className="focus-visible:ring-brand-green uppercase font-mono font-bold"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="div-deadline-input" className="text-xs font-semibold text-zinc-650 dark:text-zinc-400">Deadline</label>
                      <Input
                        id="div-deadline-input"
                        type="date"
                        value={editingDivisionId ? (editingDivisionDeadline ? editingDivisionDeadline.split('T')[0] : '') : (newDivisionDeadline ? newDivisionDeadline.split('T')[0] : '')}
                        onChange={(e) => {
                          if (editingDivisionId) setEditingDivisionDeadline(e.target.value)
                          else setNewDivisionDeadline(e.target.value)
                        }}
                        className="focus-visible:ring-brand-green font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-650 dark:text-zinc-400">Description</label>
                    <RichTextEditor
                      value={editingDivisionId ? editingDivisionDesc : newDivisionDesc}
                      onChange={(val) => {
                        if (editingDivisionId) setEditingDivisionDesc(val)
                        else setNewDivisionDesc(val)
                      }}
                      placeholder="Specify what this project handles..."
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={createDivisionMutation.isPending || updateDivisionMutation.isPending}
                      className="bg-brand-green hover:bg-brand-dark-green text-white font-semibold flex-1"
                    >
                      {editingDivisionId ? 'Save Changes' : 'Create Project'}
                    </Button>
                    {editingDivisionId && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setEditingDivisionId(null)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* List of current divisions */}
          <div className="lg:col-span-8">
            <Card className="border-zinc-105 shadow-xs rounded-2xl bg-white">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-zinc-950">Active Projects</CardTitle>
                <CardDescription className="text-zinc-500">
                  A list of all projects configured in the system.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingDivisions ? (
                  <div className="text-center py-12 text-zinc-500 text-sm">Loading projects...</div>
                ) : divisions.length === 0 ? (
                  <div className="text-center py-12 text-zinc-400 text-sm">No projects configured.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-zinc-100 hover:bg-transparent">
                          <TableHead className="font-bold text-zinc-500">Project Name</TableHead>
                          <TableHead className="font-bold text-zinc-500">Key</TableHead>
                          <TableHead className="font-bold text-zinc-500">Deadline</TableHead>
                          <TableHead className="font-bold text-zinc-500">Description</TableHead>
                          <TableHead className="font-bold text-zinc-500 text-center">Linked Issues</TableHead>
                          <TableHead className="font-bold text-zinc-500 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {divisions.map((div) => (
                          <TableRow key={div.id} className="hover:bg-zinc-50/50 transition-colors">
                            <TableCell className="font-semibold text-zinc-900">{div.name}</TableCell>
                            <TableCell>
                              <span className="font-mono font-bold text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-750 dark:text-zinc-350 px-2 py-0.5 rounded border border-zinc-200/50 dark:border-zinc-750">
                                {div.key}
                              </span>
                            </TableCell>
                            <TableCell className="text-zinc-650 dark:text-zinc-400 font-medium text-xs">
                              {div.deadline ? new Date(div.deadline).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'No Deadline'}
                            </TableCell>
                            <TableCell className="text-zinc-500 max-w-xs truncate">{div.description ? stripHtml(div.description) : '—'}</TableCell>
                            <TableCell className="text-center font-bold text-zinc-700">{div._count?.issues || 0}</TableCell>
                            <TableCell className="text-right space-x-2">
                              <Button
                                size="xs"
                                variant="outline"
                                onClick={() => {
                                  setEditingDivisionId(div.id)
                                  setEditingDivisionName(div.name)
                                  setEditingDivisionKey(div.key)
                                  setEditingDivisionDesc(div.description || '')
                                  setEditingDivisionDeadline(div.deadline || '')
                                }}
                                className="text-xs font-semibold cursor-pointer"
                              >
                                Edit
                              </Button>
                              <Button
                                size="xs"
                                variant="destructive"
                                onClick={() => {
                                  setDeleteDivisionId(div.id)
                                }}
                                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer"
                              >
                                Delete
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
        </div>
      )}

      {/* Modals and Overlays are handled on the Issue Details page directly */}

      {warnUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-zinc-950">Issue Warning</h3>
            <textarea
              value={warnReasonText}
              onChange={(e) => setWarnReasonText(e.target.value)}
              placeholder="Reason for warning..."
              className="w-full h-24 p-2.5 border border-zinc-200 rounded-lg text-sm"
            />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setWarnUserId(null)}>Cancel</Button>
              <Button
                onClick={() => {
                  warnUserMutation.mutate({ userId: warnUserId, currentWarnings: warnUserWarnings, reason: warnReasonText })
                  setWarnUserId(null)
                }}
                className="bg-amber-600 text-white hover:bg-amber-700"
              >
                Issue Warning
              </Button>
            </div>
          </div>
        </div>
      )}

      {banUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-zinc-950">Ban User Account</h3>
            <textarea
              value={banReasonText}
              onChange={(e) => setBanReasonText(e.target.value)}
              placeholder="Reason for ban..."
              className="w-full h-24 p-2.5 border border-zinc-200 rounded-lg text-sm"
            />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setBanUserId(null)}>Cancel</Button>
              <Button
                onClick={() => {
                  banUserMutation.mutate({ userId: banUserId, ban: true })
                  setBanUserId(null)
                }}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                Ban Account
              </Button>
            </div>
          </div>
        </div>
      )}

      {deleteUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-zinc-950">Delete User</h3>
            <p className="text-sm text-zinc-500">This will permanently delete this user account. This cannot be undone.</p>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setDeleteUserId(null)}>Cancel</Button>
              <Button
                onClick={() => {
                  deleteUserMutation.mutate(deleteUserId)
                  setDeleteUserId(null)
                }}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                Delete Account
              </Button>
            </div>
          </div>
        </div>
      )}

      {rejectUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-zinc-950">Reject Registration</h3>
            <p className="text-sm text-zinc-500">Are you sure you want to reject and delete this registration request?</p>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setRejectUserId(null)}>Cancel</Button>
              <Button
                onClick={() => {
                  rejectRegistrationMutation.mutate(rejectUserId)
                  setRejectUserId(null)
                }}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                Reject Request
              </Button>
            </div>
          </div>
        </div>
      )}

      {approvingUserObj && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl max-w-sm w-full p-6 space-y-4 border border-zinc-150 dark:border-zinc-800">
            <h3 className="text-lg font-bold text-zinc-950 dark:text-white">Approve User & Assign Role</h3>
            <p className="text-sm text-zinc-500">
              Assign a role for <strong className="text-zinc-900 dark:text-white">{approvingUserObj.name}</strong> ({approvingUserObj.email}):
            </p>
            <div className="space-y-1.5">
              <label htmlFor="assign-role-select" className="text-xs font-semibold text-zinc-500">System Role</label>
              <select
                id="assign-role-select"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as any)}
                className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
              >
                <option value="USER">Normal User (Employee)</option>
                <option value="AGENT">Support Agent</option>
                <option value="ADMIN">Administrator</option>
              </select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setApprovingUserObj(null)}>Cancel</Button>
              <Button
                onClick={() => {
                  approveRegistrationMutation.mutate({ userId: approvingUserObj.id, role: selectedRole })
                  setApprovingUserObj(null)
                }}
                className="bg-brand-green hover:bg-brand-dark-green text-white font-semibold cursor-pointer"
              >
                Confirm & Approve
              </Button>
            </div>
          </div>
        </div>
      )}

      {deleteDivisionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl max-w-sm w-full p-6 space-y-4 border border-zinc-150 dark:border-zinc-800">
            <h3 className="text-lg font-bold text-zinc-950 dark:text-white">Delete Project</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Are you sure you want to delete this project? Related issues will have their project set to <strong>None</strong>. This cannot be undone.
            </p>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setDeleteDivisionId(null)}>Cancel</Button>
              <Button
                onClick={() => {
                  deleteDivisionMutation.mutate(deleteDivisionId)
                  setDeleteDivisionId(null)
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold cursor-pointer border-none"
              >
                Delete Project
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={<div className="text-zinc-500 font-semibold text-sm">Loading admin dashboard...</div>}>
      <AdminDashboardInner />
    </Suspense>
  )
}
