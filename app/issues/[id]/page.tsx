'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { FaTrash, FaSave, FaArrowLeft, FaUpload, FaTimes, FaHistory, FaCheck } from 'react-icons/fa'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'

interface ExtendedUser {
  id?: string
  role?: string
  name?: string | null
  email?: string | null
}

interface IssueUpdateBody {
  title?: string
  description?: string
  status?: string
  priority?: string
  assignedToId?: string | null
  imageUrl?: string | null
  rejectionReason?: string | null
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

export default function IssueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)
  const { data: session } = useSession()
  const userRole = (session?.user as ExtendedUser)?.role || 'USER'
  const currentUserId = parseInt((session?.user as ExtendedUser)?.id || '0')
  
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('OPEN')
  const [priority, setPriority] = useState('MEDIUM')
  const [assignedToId, setAssignedToId] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [reportedById, setReportedById] = useState<number | null>(null)
  const [phone, setPhone] = useState<string | null>(null)
  const [address, setAddress] = useState<string | null>(null)
  
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [logs, setLogs] = useState<IssueLog[]>([])
  const [logsLoading, setLogsLoading] = useState(true)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [assignedToRole, setAssignedToRole] = useState<string | null>(null)
  const [assignedToName, setAssignedToName] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState<string | null>(null)
  const [allIssues, setAllIssues] = useState<any[]>([])

  useEffect(() => {
    // Fetch users and issue data
    const fetchPromises: Promise<any>[] = [
      fetch(`/api/issues/${id}`).then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      })
    ]

    // Only load users and all issues if user is admin
    if (userRole === 'ADMIN') {
      fetchPromises.push(fetch('/api/admin/users').then((res) => res.json()))
      fetchPromises.push(fetch('/api/issues?scope=all').then((res) => res.json()))
    }

    Promise.all(fetchPromises)
      .then(([issueData, usersData, issuesData]) => {
        if (usersData) setUsers(usersData)
        if (issuesData) setAllIssues(issuesData)
        setTitle(issueData.title)
        setDescription(issueData.description)
        setStatus(issueData.status)
        setPriority(issueData.priority)
        setAssignedToId(issueData.assignedToId ? issueData.assignedToId.toString() : '')
        setImageUrl(issueData.imageUrl)
        setReportedById(issueData.reportedById)
        setPhone(issueData.phone || null)
        setAddress(issueData.address || null)
        setAssignedToRole(issueData.assignedTo ? issueData.assignedTo.role : null)
        setAssignedToName(issueData.assignedTo ? issueData.assignedTo.name : null)
        setRejectionReason(issueData.rejectionReason || null)
      })
      .catch(() => {
        toast.error('Failed to load issue details')
        router.push(userRole === 'ADMIN' ? '/issues' : '/')
      })
      .finally(() => {
        setLoading(false)
      })

    // Fetch activity logs
    fetch(`/api/issues/${id}/logs`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setLogs(data))
      .catch(() => setLogs([]))
      .finally(() => setLogsLoading(false))
  }, [id, router, userRole])

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

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const isAssigned = !!(assignedToId && assignedToRole === 'AGENT')

    // Construct body depending on role to match API expectations
    const body: IssueUpdateBody = {}
    if (userRole === 'ADMIN') {
      body.title = title
      body.description = description
      body.status = status
      body.priority = priority
      body.assignedToId = assignedToId || null
      body.imageUrl = imageUrl || null
      body.rejectionReason = status === 'REJECTED' ? rejectionReason : null
    } else if (userRole === 'AGENT') {
      body.status = status
      body.priority = priority
    } else {
      // USER Role
      body.priority = priority
      if (!isAssigned) {
        body.title = title
        body.description = description
        body.imageUrl = imageUrl || null
      }
    }

    try {
      const response = await fetch(`/api/issues/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!response.ok) throw new Error()

       toast.success('Issue updated successfully!')
      router.push(userRole === 'ADMIN' ? '/issues' : '/')
      router.refresh()
    } catch (error) {
      toast.error('Failed to update issue')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = () => {
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    setDeleting(true)
    setShowDeleteModal(false)

    try {
      const response = await fetch(`/api/issues/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error()

      toast.success('Issue deleted successfully!')
      router.push(userRole === 'ADMIN' ? '/issues' : '/')
      router.refresh()
    } catch (error) {
      toast.error('Failed to delete issue')
      setDeleting(false)
    }
  }

  if (loading) {
    return <div className="text-center py-20 text-zinc-500 text-sm">Loading issue details...</div>
  }

  // Permission Checks:
  const isReporter = reportedById === currentUserId
  const isAssignedAgent = assignedToId === currentUserId.toString()
  const isAssigned = !!(assignedToId && assignedToRole === 'AGENT')
  
  // USER can edit title, description, and image ONLY if the ticket is unassigned
  const canEditTitleDescImage = userRole === 'ADMIN' || (userRole === 'USER' && isReporter && !isAssigned && status !== 'RESOLVED')
  
  // Status editing permissions
  const canEditStatus = userRole === 'ADMIN' || (userRole === 'AGENT' && isAssignedAgent)
  
  // Priority editing permissions (User reporter can always update priority to flag changes)
  const canEditPriority = userRole === 'ADMIN' || (userRole === 'USER' && isReporter && status !== 'RESOLVED') || (userRole === 'AGENT' && isAssignedAgent)
  
  const canAssign = userRole === 'ADMIN'
  const canDelete = userRole === 'ADMIN' || (userRole === 'USER' && isReporter)

  return (
    <div className="max-w-3xl mx-auto p-4 mt-8">
      <Card className="border border-zinc-100 shadow-sm rounded-2xl bg-white overflow-hidden p-2">
        <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-50 pb-4 mb-4">
          <div className="space-y-1">
            <Link href="/" className="flex items-center space-x-1.5 text-zinc-500 hover:text-brand-green text-xs transition-colors mb-2">
              <FaArrowLeft size={10} />
              <span>Back to Dashboard</span>
            </Link>
            <CardTitle className="text-2xl font-extrabold text-zinc-950">
              TKT-{String(parseInt(id)).padStart(4, '0')}
            </CardTitle>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={() => window.print()}
              variant="outline"
              className="flex items-center space-x-1.5 border-zinc-200 hover:bg-zinc-50 font-semibold cursor-pointer text-zinc-700 text-xs no-print h-9"
            >
              <span>📄 Download PDF</span>
            </Button>
            {/* Hide delete button if user doesn't have delete rights */}
            {canDelete && (
              <Button
                onClick={handleDelete}
                disabled={deleting}
                variant="destructive"
                className="flex items-center space-x-1.5 bg-rose-600 hover:bg-rose-700 text-white font-medium cursor-pointer text-xs no-print h-9"
              >
                <FaTrash size={12} />
                <span>{deleting ? 'Deleting...' : 'Delete'}</span>
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {status === 'REJECTED' && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-5 flex gap-3 text-red-800 animate-in fade-in duration-200">
              <span className="text-xl shrink-0">❌</span>
              <div>
                <h4 className="font-bold text-red-900">Incident Report Rejected</h4>
                <p className="text-sm mt-0.5 font-medium">
                  This incident report has been rejected by the administrator.
                </p>
                <p className="text-xs bg-red-100/50 border border-red-200 rounded-lg p-2.5 mt-2 font-mono text-red-950 max-w-2xl">
                  {rejectionReason || 'No specific rejection reason was provided by the administrator.'}
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleUpdate} className="space-y-6">
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
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm text-zinc-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-brand-green disabled:opacity-75 disabled:bg-zinc-50"
                >
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                  {(status === 'REJECTED' || userRole === 'ADMIN') && (
                    <option value="REJECTED">Rejected</option>
                  )}
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
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm text-zinc-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-brand-green disabled:opacity-75 disabled:bg-zinc-50"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-1.5">
                  Assign To
                </label>
                {canAssign ? (
                  assignedToRole === 'AGENT' ? (
                    <div className="bg-green-50 border border-green-100 rounded-xl p-3.5 text-sm font-semibold text-green-700 flex items-center gap-2">
                      <FaCheck />
                      Forwarded to agent: {assignedToName || 'Support Staff'}
                    </div>
                  ) : (
                    (() => {
                      const agentsList = users.filter(u => u.role === 'AGENT' && u.status === 'ACTIVE')
                      if (agentsList.length === 0) {
                        return <div className="text-sm text-zinc-500 italic p-3 bg-zinc-50 border border-zinc-200 rounded-xl">No active support agents available for assignment.</div>
                      }
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
                        <div className="flex flex-col gap-2 p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Next Agent in Rotation</p>
                              <p className="text-sm font-bold text-zinc-800">{nextAgent.name} <span className="text-xs font-normal text-zinc-400">({nextAgent.role})</span></p>
                            </div>
                            <Button
                              type="button"
                              size="xs"
                              className="bg-brand-green hover:bg-brand-dark-green text-white font-semibold cursor-pointer shrink-0"
                              onClick={() => {
                                setAssignedToId(nextAgent.id.toString())
                                setAssignedToRole('AGENT')
                                setAssignedToName(nextAgent.name)
                              }}
                            >
                              Assign
                            </Button>
                          </div>
                        </div>
                      )
                    })()
                  )
                ) : (
                  <div className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm text-zinc-500 bg-zinc-50">
                    {(assignedToId && assignedToRole === 'AGENT') ? `Forwarded to ${assignedToName || 'support staff'}` : 'Unassigned'}
                  </div>
                )}
              </div>
            </div>

            {status === 'REJECTED' && userRole === 'ADMIN' && (
              <div>
                <label htmlFor="rejectionReason" className="block text-sm font-semibold text-zinc-700 mb-1.5">
                  Rejection Reason
                </label>
                <Textarea
                  id="rejectionReason"
                  required
                  value={rejectionReason || ''}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please enter the rejection reason..."
                  rows={3}
                  className="focus-visible:ring-brand-green"
                />
              </div>
            )}

            <div>
              <label htmlFor="description" className="block text-sm font-semibold text-zinc-700 mb-1.5">
                Description
              </label>
              <Textarea
                id="description"
                rows={6}
                required
                disabled={!canEditTitleDescImage}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="disabled:opacity-75 disabled:bg-zinc-50 focus-visible:ring-brand-green"
              />
            </div>

            {/* Read-only contact info from the original report */}
            {(phone || address) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-zinc-50/60 border border-zinc-100 rounded-xl p-4">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider col-span-full mb-1">Reporter Contact Info</p>
                {phone && (
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-0.5">📞 Phone Number</label>
                    <p className="text-sm font-semibold text-zinc-800">{phone}</p>
                  </div>
                )}
                {address && (
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-0.5">📍 Problem Location</label>
                    <p className="text-sm font-semibold text-zinc-800">{address}</p>
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
                      <Image
                        src={imageUrl}
                        alt="Attachment Preview"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-zinc-700 truncate">Screenshot attached</p>
                      <button 
                        type="button" 
                        onClick={() => setImageUrl(null)}
                        className="text-[10px] font-bold text-red-600 hover:underline flex items-center gap-1 mt-1 cursor-pointer"
                      >
                        <FaTimes className="inline mr-1" /> Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 hover:border-brand-green rounded-xl p-6 cursor-pointer bg-zinc-50/50 hover:bg-green-50/20 transition-all text-zinc-500 max-w-md">
                    <FaUpload className="text-zinc-400 mb-2" size={20} />
                    <span className="text-xs font-semibold">
                      {uploading ? 'Uploading image...' : 'Click to change or add screenshot'}
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
              ) : (
                imageUrl ? (
                  <div className="relative w-full max-w-md h-64 border border-zinc-200 rounded-xl overflow-hidden bg-zinc-50">
                    <Image
                      src={imageUrl}
                      alt="Incident Screenshot"
                      fill
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <div className="text-sm text-zinc-400 italic">No screenshot attached to this incident.</div>
                )
              )}
            </div>

            {/* Hide Submit button if user has absolutely no edit permissions */}
            {(canEditTitleDescImage || canEditStatus || canEditPriority) && (
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-zinc-100">
                <Link href="/">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-zinc-200 hover:bg-zinc-50"
                  >
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={saving || uploading}
                  className="bg-brand-green hover:bg-brand-dark-green text-white font-semibold transition-colors flex items-center space-x-1.5 shadow-sm cursor-pointer"
                >
                  <FaSave size={13} />
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </Button>
              </div>
            )}
          </form>
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
              {logs.map((log, idx) => (
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
                        month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit'
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

      {/* ── CUSTOM DELETE CONFIRMATION MODAL ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <Card className="max-w-md w-full border border-zinc-100 shadow-xl rounded-2xl bg-white overflow-hidden p-6 mx-4 animate-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-zinc-950">Delete Incident Report</h3>
            <p className="text-zinc-500 text-sm mt-2">
              Are you sure you want to delete this incident report? This cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button
                variant="outline"
                size="sm"
                className="border-zinc-200 hover:bg-zinc-50 cursor-pointer"
                disabled={deleting}
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
                disabled={deleting}
                onClick={confirmDelete}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
