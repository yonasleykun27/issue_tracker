'use client'

import { useState, useEffect, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { FaTrash, FaSave, FaArrowLeft, FaUpload, FaTimes, FaHistory, FaCheck, FaTimesCircle, FaEye } from 'react-icons/fa'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import dynamic from 'next/dynamic'

const RichTextEditor = dynamic(() => import('@/app/components/RichTextEditor'), { ssr: false })

interface ExtendedUser {
  id?: string
  role?: string
  name?: string | null
  email?: string | null
}

interface IssueLog {
  id: number
  action: string
  createdAt: string
  actor: {
    name: string
    role: string
  }
}

interface Issue {
  id: number
  title: string
  description: string
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  imageUrl?: string | null
  phone?: string | null
  address?: string | null
  reportedById: number
  assignedToId?: number | null
  assignedTo?: {
    id: number
    name: string
    role: string
  } | null
  reportedBy?: {
    name: string
    email: string
  } | null
  rejectionReason?: string | null
}

export default function IssueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const mode = searchParams.get('mode')
  const { id } = use(params)
  const { data: session } = useSession()
  const queryClient = useQueryClient()

  const userRole = (session?.user as ExtendedUser)?.role || 'USER'
  const currentUserId = parseInt((session?.user as ExtendedUser)?.id || '0')
  const userStatus = (session?.user as any)?.status

  // Redirect if pending approval
  useEffect(() => {
    if (session && userStatus === 'PENDING') {
      router.replace('/')
    }
  }, [session, userStatus, router])

  // Form states
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('OPEN')
  const [priority, setPriority] = useState('MEDIUM')
  const [assignedToId, setAssignedToId] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)

  // Image Upload State
  const [uploading, setUploading] = useState(false)

  // 1. Query for Issue Details
  const { data: issue, isLoading: loading } = useQuery<Issue>({
    queryKey: ['issue-detail', id],
    queryFn: () =>
      fetch(`/api/issues/${id}`).then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      })
  })

  const isAssignedToAgent = !!(issue?.assignedTo && issue.assignedTo.role === 'AGENT')

  // 2. Query for Activity Logs
  const { data: logs = [], isLoading: logsLoading } = useQuery<IssueLog[]>({
    queryKey: ['issue-logs', id],
    queryFn: () => fetch(`/api/issues/${id}/logs`).then((res) => (res.ok ? res.json() : []))
  })

  // 3. Query for Users (Admins only)
  const { data: users = [] } = useQuery<{ id: number; name: string; role: string }[]>({
    queryKey: ['users-list'],
    queryFn: () => fetch('/api/users').then((res) => (res.ok ? res.json() : [])),
    enabled: userRole === 'ADMIN'
  })

  // Populate form states when issue data is fetched
  useEffect(() => {
    if (issue) {
      setTitle(issue.title)
      setDescription(issue.description)
      setStatus(issue.status)
      setPriority(issue.priority)
      setAssignedToId(issue.assignedToId ? issue.assignedToId.toString() : '')
      setImageUrl(issue.imageUrl || null)
      setRejectionReason(issue.rejectionReason || '')
    }
  }, [issue])

  // Mutations
  const updateMutation = useMutation({
    mutationFn: (body: any) =>
      fetch(`/api/issues/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }).then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      }),
    onSuccess: () => {
      toast.success('Incident updated successfully!')
      queryClient.invalidateQueries({ queryKey: ['issue-detail', id] })
      queryClient.invalidateQueries({ queryKey: ['issue-logs', id] })
      queryClient.invalidateQueries({ queryKey: ['issues-all'] })
      queryClient.invalidateQueries({ queryKey: ['admin-issues'] })
      queryClient.invalidateQueries({ queryKey: ['agent-issues'] })
      queryClient.invalidateQueries({ queryKey: ['user-issues'] })
      router.push(userRole === 'ADMIN' ? '/issues' : '/')
    },
    onError: () => toast.error('Failed to update incident')
  })
  const approveMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/issues/${id}/approve`, {
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
      queryClient.invalidateQueries({ queryKey: ['issue-detail', id] })
      queryClient.invalidateQueries({ queryKey: ['issue-logs', id] })
      queryClient.invalidateQueries({ queryKey: ['admin-issues'] })
      queryClient.invalidateQueries({ queryKey: ['issues-all'] })
      router.push('/')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to approve incident')
    }
  })

  const handleRejectConfirm = () => {
    if (!rejectionReason.trim()) {
      toast.error('Rejection reason is required.')
      return
    }
    updateMutation.mutate({
      status: 'REJECTED',
      rejectionReason: rejectionReason
    })
    setShowRejectModal(false)
  }
  const deleteMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/issues/${id}`, { method: 'DELETE' }).then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      }),
    onSuccess: () => {
      toast.success('Incident deleted successfully!')
      queryClient.invalidateQueries({ queryKey: ['issues-all'] })
      queryClient.invalidateQueries({ queryKey: ['admin-issues'] })
      queryClient.invalidateQueries({ queryKey: ['agent-issues'] })
      queryClient.invalidateQueries({ queryKey: ['user-issues'] })
      router.push(userRole === 'ADMIN' ? '/issues' : '/')
    },
    onError: () => toast.error('Failed to delete incident')
  })

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', selectedFile)

    try {
      const response = await fetch('/api/issues/upload', {
        method: 'POST',
        body: formData
      })
      if (!response.ok) throw new Error()
      const data = await response.json()
      setImageUrl(data.url)
      toast.success('Screenshot updated!')
    } catch (err) {
      toast.error('Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const isAssigned = !!(issue?.assignedToId && issue?.assignedTo?.role === 'AGENT')

    const body: any = {}
    if (userRole === 'ADMIN') {
      body.title = title
      body.description = description
      body.status = status
      body.priority = priority
      body.assignedToId = assignedToId ? parseInt(assignedToId) : null
      body.imageUrl = imageUrl
      body.rejectionReason = status === 'REJECTED' ? rejectionReason : null
    } else if (userRole === 'AGENT') {
      body.status = status
    } else {
      body.priority = priority
      if (!isAssigned) {
        body.title = title
        body.description = description
        body.imageUrl = imageUrl
      }
    }

    updateMutation.mutate(body)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh] text-zinc-500 text-sm">
        Loading incident details...
      </div>
    )
  }

  if (!issue) {
    return (
      <div className="flex justify-center items-center min-h-[50vh] text-zinc-500 text-sm">
        Incident not found.
      </div>
    )
  }

  const isReporter = issue.reportedById === currentUserId
  const isAssignedAgent = issue.assignedToId === currentUserId
  const isAssigned = !!(issue.assignedToId && issue.assignedTo?.role === 'AGENT')

  const canEditTitleDescImage = (userRole === 'ADMIN' && issue.status !== 'RESOLVED') || (userRole === 'USER' && isReporter && !isAssigned && issue.status !== 'RESOLVED')
  const canEditStatus = userRole === 'AGENT' && isAssignedAgent && issue.status !== 'RESOLVED' && issue.status !== 'REJECTED'
  const canEditPriority = (userRole === 'ADMIN' && issue.status !== 'RESOLVED') || (userRole === 'USER' && isReporter && issue.status !== 'RESOLVED')
  const canAssign = userRole === 'ADMIN' && issue.status !== 'RESOLVED'
  const canDelete = userRole === 'ADMIN'

  const getStatusOptions = () => {
    const options = []
    
    // Always include current status in options so it can show correctly
    if (issue.status === 'OPEN') options.push({ value: 'OPEN', label: 'Open' })
    if (issue.status === 'IN_PROGRESS') options.push({ value: 'IN_PROGRESS', label: 'In Progress' })
    if (issue.status === 'RESOLVED') options.push({ value: 'RESOLVED', label: 'Resolved' })
    if (issue.status === 'REJECTED') options.push({ value: 'REJECTED', label: 'Rejected' })

    // Agent can only transition forward:
    // OPEN -> IN_PROGRESS
    // IN_PROGRESS -> RESOLVED
    if (userRole === 'AGENT' && isAssignedAgent) {
      if (issue.status === 'OPEN' && !options.some(o => o.value === 'IN_PROGRESS')) {
        options.push({ value: 'IN_PROGRESS', label: 'In Progress' })
      }
      if (issue.status === 'IN_PROGRESS' && !options.some(o => o.value === 'RESOLVED')) {
        options.push({ value: 'RESOLVED', label: 'Resolved' })
      }
    }

    return options
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card className="border border-zinc-100 shadow-sm rounded-2xl bg-white overflow-hidden p-2">
        <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-50 pb-4 mb-4">
          <div className="space-y-1">
            <Link
              href={userRole === 'ADMIN' && mode === 'edit' ? "/issues" : "/"}
              className="flex items-center space-x-1.5 text-zinc-500 hover:text-brand-green text-xs transition-colors mb-2"
            >
              <FaArrowLeft size={10} />
              <span>{userRole === 'ADMIN' && mode === 'edit' ? "Back to All Incidents" : "Back to Dashboard"}</span>
            </Link>
            <CardTitle className="text-2xl font-extrabold text-zinc-950">
              TKT-{String(issue.id).padStart(4, '0')}
            </CardTitle>
          </div>

          {canDelete && (
            <Button
              onClick={() => setShowDeleteModal(true)}
              variant="destructive"
              className="flex items-center space-x-1.5 bg-rose-600 hover:bg-rose-700 text-white font-medium cursor-pointer"
            >
              <FaTrash size={12} />
              <span>Delete</span>
            </Button>
          )}
        </CardHeader>

        <CardContent>
          {issue.status === 'RESOLVED' || issue.status === 'REJECTED' || (userRole === 'ADMIN' && mode !== 'edit') ? (
            <div className="space-y-6">
              {/* Detailed presentation before approval */}
              <div className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-550 uppercase tracking-widest block mb-1">Issue Title</span>
                <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 leading-snug">{issue.title}</h1>
              </div>

              <div className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-550 uppercase tracking-widest block mb-1">Description</span>
                <div
                  className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-sans font-medium tiptap"
                  dangerouslySetInnerHTML={{ __html: issue.description }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                <div>
                  <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-550 uppercase tracking-widest block mb-1">Priority</span>
                  <Badge variant="outline" className={`font-semibold rounded-full border-none px-2.5 py-0.5 mt-0.5 text-xs ${
                    priority === 'HIGH' ? 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400' :
                    priority === 'MEDIUM' ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400' :
                    'bg-zinc-100 dark:bg-zinc-850 text-zinc-700 dark:text-zinc-300'
                  }`}>
                    {priority}
                  </Badge>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-550 uppercase tracking-widest block mb-1">Reporter</span>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">{issue.reportedBy?.name || 'Unknown'}</p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-550 font-medium truncate">{issue.reportedBy?.email || ''}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-550 uppercase tracking-widest block mb-1">Assigned Agent</span>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">{issue.assignedTo?.name || 'Unassigned'}</p>
                  {issue.assignedTo && (
                    <p className="text-xs text-zinc-450 dark:text-zinc-500 font-medium truncate">{issue.assignedTo.role}</p>
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-550 uppercase tracking-widest block mb-1">Status</span>
                  <Badge variant="outline" className={`font-semibold rounded-full border-none px-2.5 py-0.5 mt-0.5 text-xs ${
                    issue.status === 'OPEN' ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400' :
                    issue.status === 'IN_PROGRESS' ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400' :
                    issue.status === 'RESOLVED' ? 'bg-green-555/10 dark:bg-green-950/20 text-green-700 dark:text-green-400' :
                    'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-350'
                  }`}>
                    {issue.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>

              {issue.status === 'REJECTED' && issue.rejectionReason && (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-150 dark:border-red-900 rounded-xl p-4 text-sm text-red-700 dark:text-red-400">
                  <span className="font-bold block mb-1">🚫 Rejection Reason:</span>
                  <p>{issue.rejectionReason}</p>
                </div>
              )}

              {(issue.phone || issue.address) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-zinc-50/50 dark:bg-zinc-950/30 border border-zinc-100 dark:border-zinc-800 rounded-xl p-4">
                  <p className="text-xs font-bold text-zinc-400 dark:text-zinc-550 uppercase tracking-wider col-span-full mb-1">Reporter Contact Info</p>
                  {issue.phone && (
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-450 mb-0.5">📞 Phone Number</label>
                      <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{issue.phone}</p>
                    </div>
                  )}
                  {issue.address && (
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-450 mb-0.5">📍 Problem Location</label>
                      <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{issue.address}</p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-550 uppercase tracking-widest block mb-1.5">Attached Image</span>
                {imageUrl ? (
                  <div className="relative w-full max-w-md h-64 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-zinc-50 dark:bg-zinc-950/50">
                    <Image src={imageUrl} alt="Incident Screenshot" fill className="object-contain" />
                  </div>
                ) : (
                  <div className="text-sm text-zinc-400 dark:text-zinc-650 italic">No screenshot attached.</div>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleUpdateSubmit} className="space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-semibold text-zinc-700 mb-1.5">
                  Issue Title
                </label>
                <Input
                  id="title"
                  type="text"
                  required
                  disabled={!canEditTitleDescImage}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="disabled:opacity-75 disabled:bg-zinc-50 focus-visible:ring-brand-green"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="status" className="block text-sm font-semibold text-zinc-700 mb-1.5">
                    Status
                  </label>
                  <select
                    id="status"
                    value={status}
                    disabled={!canEditStatus}
                    onChange={(e) => {
                      const nextStatus = e.target.value
                      setStatus(nextStatus)
                      if (nextStatus === 'REJECTED') {
                        setShowRejectModal(true)
                      }
                    }}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm text-zinc-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-green disabled:opacity-75 disabled:bg-zinc-50 cursor-pointer"
                  >
                    {getStatusOptions().map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="priority" className="block text-sm font-semibold text-zinc-700 mb-1.5">
                    Priority
                  </label>
                  <select
                    id="priority"
                    value={priority}
                    disabled={!canEditPriority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm text-zinc-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-green disabled:opacity-75 disabled:bg-zinc-50 cursor-pointer"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="assignedTo" className="block text-sm font-semibold text-zinc-700 mb-1.5">
                    Assign To
                  </label>
                  {canAssign ? (
                    <select
                      id="assignedTo"
                      value={assignedToId}
                      onChange={(e) => setAssignedToId(e.target.value)}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm text-zinc-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-green cursor-pointer"
                    >
                      <option value="">Unassigned</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm text-zinc-500 bg-zinc-50">
                      {issue.assignedTo ? `Assigned to: ${issue.assignedTo.name}` : 'Unassigned'}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-semibold text-zinc-700 mb-1.5">
                  Description
                </label>
                <RichTextEditor
                  value={description}
                  onChange={setDescription}
                  disabled={!canEditTitleDescImage}
                />
              </div>

              {(issue.phone || issue.address) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-zinc-50/60 border border-zinc-100 rounded-xl p-4">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider col-span-full mb-1">
                    Reporter Contact Info
                  </p>
                  {issue.phone && (
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 mb-0.5">📞 Phone Number</label>
                      <p className="text-sm font-semibold text-zinc-800">{issue.phone}</p>
                    </div>
                  )}
                  {issue.address && (
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 mb-0.5">📍 Problem Location</label>
                      <p className="text-sm font-semibold text-zinc-800">{issue.address}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Display Image Attachment or Uploader depending on edit rights */}
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1.5">
                  Image Attachment
                </label>
                {canEditTitleDescImage ? (
                  imageUrl ? (
                    <div className="relative border border-zinc-200 rounded-lg p-2 max-w-xs bg-zinc-50 flex items-center gap-4">
                      <div className="relative w-16 h-16 rounded overflow-hidden">
                        <Image src={imageUrl} alt="Attachment Preview" fill className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-zinc-700 truncate">Image uploaded</p>
                        <button
                          type="button"
                          onClick={() => setImageUrl(null)}
                          className="text-[10px] font-bold text-red-600 hover:underline flex items-center gap-1 mt-1 cursor-pointer border-none bg-transparent"
                        >
                          <FaTimes /> Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center border border-dashed border-zinc-200 hover:border-brand-green rounded-xl p-6 cursor-pointer bg-zinc-50/50 hover:bg-green-50/10 transition-all text-zinc-500">
                      <FaUpload className="text-zinc-400 mb-2" size={18} />
                      <span className="text-xs font-semibold">
                        {uploading ? 'Uploading image...' : 'Click to upload screenshot'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploading}
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )
                ) : imageUrl ? (
                  <div className="relative w-full max-w-md h-64 border border-zinc-200 rounded-xl overflow-hidden bg-zinc-50">
                    <Image src={imageUrl} alt="Incident Screenshot" fill className="object-contain" />
                  </div>
                ) : (
                  <div className="text-sm text-zinc-400 italic">No screenshot attached to this incident.</div>
                )}
              </div>

              {(canEditTitleDescImage || canEditStatus || canEditPriority) && (
                <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <Link href={userRole === 'ADMIN' && mode === 'edit' ? "/issues" : "/"}>
                    <Button type="button" variant="outline" className="border-zinc-200 hover:bg-zinc-50 h-9 px-3 text-xs">
                      Cancel
                    </Button>
                  </Link>
                  <Button
                    type="submit"
                    disabled={updateMutation.isPending || uploading}
                    className="bg-brand-green hover:bg-brand-dark-green text-white font-semibold transition-colors flex items-center space-x-1.5 shadow-sm cursor-pointer border-none h-9 px-3 text-xs"
                  >
                    <FaSave size={13} />
                    <span>{updateMutation.isPending ? 'Saving...' : 'Save Changes'}</span>
                  </Button>
                </div>
              )}
            </form>
          )}
        </CardContent>
      </Card>

      {/* Activity Timeline */}
      <Card className="border border-zinc-100 shadow-sm rounded-2xl bg-white overflow-hidden p-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold text-zinc-950 flex items-center gap-2">
            <FaHistory className="text-zinc-400" size={16} />
            Activity Timeline
          </CardTitle>
          <CardDescription className="text-zinc-500">A record of all changes made to this ticket.</CardDescription>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="text-sm text-zinc-400 py-4">Loading activity...</div>
          ) : logs.length === 0 ? (
            <div className="text-sm text-zinc-400 italic py-4 border-dashed border-2 border-zinc-100 rounded-xl text-center">
              No activity recorded yet. Changes will appear here.
            </div>
          ) : (
            <ol className="relative border-l border-zinc-200 ml-3 space-y-0">
              {logs.map((log) => (
                <li key={log.id} className="mb-6 ml-6">
                  <span className="absolute flex items-center justify-center w-6 h-6 bg-white border-2 border-zinc-200 rounded-full -left-3">
                    <span className="w-2 h-2 rounded-full bg-brand-green block" />
                  </span>
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-zinc-900">{log.actor.name}</span>
                    <Badge
                      variant="outline"
                      className={`text-[9px] font-bold rounded-full border-none px-1.5 py-0 ${
                        log.actor.role === 'ADMIN' ? 'bg-rose-50 text-rose-700' :
                        log.actor.role === 'AGENT' ? 'bg-amber-50 text-amber-700' :
                        'bg-green-50 text-green-700'
                      }`}
                    >
                      {log.actor.role}
                    </Badge>
                    <span className="text-xs text-zinc-400 font-medium ml-auto">
                      {new Date(log.createdAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-600">{log.action}</p>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <Card className="max-w-md w-full border border-zinc-100 shadow-xl rounded-2xl bg-white overflow-hidden p-6 mx-4">
            <h3 className="text-lg font-bold text-zinc-950">Delete Incident</h3>
            <p className="text-zinc-500 text-sm mt-2">
              Are you sure you want to delete this incident ticket? This cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button variant="outline" size="sm" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="bg-rose-600 text-white cursor-pointer"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  deleteMutation.mutate()
                  setShowDeleteModal(false)
                }}
              >
                Delete
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <Card className="max-w-md w-full border border-zinc-100 shadow-xl rounded-2xl bg-white overflow-hidden p-6 mx-4 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-zinc-950">Rejection Reason</h3>
            <p className="text-xs text-zinc-400">Please provide a brief description of why this ticket is being rejected.</p>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Invalid reports, duplicates, or not an IT issue..."
              rows={4}
              required
              className="w-full focus-visible:ring-brand-green"
            />
            <div className="flex items-center justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => {
                setShowRejectModal(false)
                setStatus(issue.status) // Revert state select
              }}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                disabled={updateMutation.isPending}
                onClick={handleRejectConfirm}
              >
                {updateMutation.isPending ? 'Rejecting...' : 'Reject Incident'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
