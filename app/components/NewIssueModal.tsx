'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useSession } from 'next-auth/react'
import { FaUpload, FaTimes, FaPhoneAlt, FaMapMarkerAlt } from 'react-icons/fa'
import { X } from 'lucide-react'
import Image from 'next/image'
import dynamic from 'next/dynamic'

const RichTextEditor = dynamic(() => import('@/app/components/RichTextEditor'), { ssr: false })

interface ExtendedUser {
  id?: string
  role?: string
  status?: string
}

interface NewIssueModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function NewIssueModal({ open, onClose, onSuccess }: NewIssueModalProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const userRole = (session?.user as ExtendedUser)?.role || 'USER'

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('MEDIUM')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [divisions, setDivisions] = useState<any[]>([])
  const [projectDivisionId, setProjectDivisionId] = useState('')

  const [agents, setAgents] = useState<any[]>([])
  const [assignedToId, setAssignedToId] = useState('')

  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetch('/api/admin/divisions')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setDivisions(data))
      .catch(console.error)
  }, [])

  useEffect(() => {
    if (userRole === 'ADMIN') {
      fetch('/api/admin/users')
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          const filtered = data.filter((u: any) => (u.role === 'AGENT' || u.role === 'ADMIN') && u.status === 'ACTIVE')
          setAgents(filtered)
        })
        .catch(console.error)
    }
  }, [userRole])

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setTitle('')
      setDescription('')
      setPriority('MEDIUM')
      setPhone('')
      setAddress('')
      setProjectDivisionId('')
      setAssignedToId('')
      setImageUrl(null)
    }
  }, [open])

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return
    setUploading(true)
    const formData = new FormData()
    formData.append('file', selectedFile)
    try {
      const response = await fetch('/api/issues/upload', { method: 'POST', body: formData })
      if (!response.ok) throw new Error()
      const data = await response.json()
      setImageUrl(data.url)
      toast.success('Attachment uploaded!')
    } catch {
      toast.error('Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !description) {
      toast.error('Title and description are required')
      return
    }
    if (!projectDivisionId) {
      toast.error('Project is required')
      return
    }
    setSubmitting(true)
    try {
      const payload: any = { title, description, priority, imageUrl, phone, address, projectDivisionId }
      if (userRole === 'ADMIN' && assignedToId) payload.assignedToId = assignedToId
      const response = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to submit')
      }
      toast.success('Issue reported successfully! Awaiting admin assignment.')
      onClose()
      if (onSuccess) onSuccess()
      else { router.refresh() }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create issue')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" aria-modal="true" role="dialog">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Panel */}
      <div className="relative z-10 w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
          <div>
            <h2 className="text-xl font-extrabold text-zinc-950 dark:text-zinc-50">Report a New Issue</h2>
            <p className="text-sm text-zinc-500 mt-0.5">Describe the telecom problem you&apos;re experiencing.</p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          <form id="new-issue-form" onSubmit={handleSubmit} className="space-y-5">

            {/* Issue Title */}
            <div>
              <label htmlFor="modal-title" className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Issue Title <span className="text-red-500">*</span>
              </label>
              <Input
                id="modal-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="focus-visible:ring-brand-green"
                placeholder="e.g. No internet in Bole area"
              />
            </div>

            {/* Project */}
            <div>
              <label htmlFor="modal-projectDivision" className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Project <span className="text-red-500">*</span>
              </label>
              <select
                id="modal-projectDivision"
                required
                value={projectDivisionId}
                onChange={(e) => setProjectDivisionId(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-1 focus:ring-brand-green"
              >
                <option value="">Select Project...</option>
                {divisions.map((div) => (
                  <option key={div.id} value={div.id}>{div.name}</option>
                ))}
              </select>
            </div>

            {/* Priority & Assignee */}
            <div className={`grid grid-cols-1 ${userRole === 'ADMIN' ? 'sm:grid-cols-2' : ''} gap-4`}>
              <div>
                <label htmlFor="modal-priority" className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Priority Level
                </label>
                <select
                  id="modal-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-brand-green"
                >
                  <option value="LOW">Low — Minor inconvenience</option>
                  <option value="MEDIUM">Medium — Service disrupted</option>
                  <option value="HIGH">High — Fully down / critical</option>
                </select>
              </div>

              {userRole === 'ADMIN' && (
                <div>
                  <label htmlFor="modal-assignedTo" className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Assign Agent (Optional)
                  </label>
                  <select
                    id="modal-assignedTo"
                    value={assignedToId}
                    onChange={(e) => setAssignedToId(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-brand-green cursor-pointer"
                  >
                    <option value="">Unassigned (Round-Robin fallback)</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>{agent.name} ({agent.role})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="modal-phone" className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                <FaPhoneAlt className="inline mr-1.5 text-zinc-400" size={12} />
                Contact Phone Number <span className="text-zinc-400 font-normal">(Optional)</span>
              </label>
              <Input
                id="modal-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="focus-visible:ring-brand-green"
                placeholder="e.g. +251 91 123 4567"
              />
            </div>

            {/* Address */}
            <div>
              <label htmlFor="modal-address" className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                <FaMapMarkerAlt className="inline mr-1.5 text-zinc-400" size={12} />
                Problem Location / Address <span className="text-zinc-400 font-normal">(Optional)</span>
              </label>
              <Input
                id="modal-address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="focus-visible:ring-brand-green"
                placeholder="e.g. Bole, Addis Ababa — near Edna Mall"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Full Description <span className="text-red-500">*</span>
              </label>
              <RichTextEditor
                value={description}
                onChange={setDescription}
                placeholder="Describe the problem in detail — when it started, what services are affected, what you've already tried..."
              />
            </div>

            {/* Screenshot Upload */}
            <div>
              <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Attach Screenshot <span className="text-zinc-400 font-normal">(Optional)</span>
              </label>
              {imageUrl ? (
                <div className="relative border border-zinc-200 dark:border-zinc-700 rounded-lg p-2 max-w-xs bg-zinc-50 dark:bg-zinc-800 flex items-center gap-4">
                  <div className="relative w-16 h-16 rounded overflow-hidden">
                    <Image src={imageUrl} alt="Attachment Preview" fill className="object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 truncate">Image attached</p>
                    <button
                      type="button"
                      onClick={() => setImageUrl(null)}
                      className="text-[10px] font-bold text-red-600 hover:underline flex items-center gap-1 mt-1 cursor-pointer"
                    >
                      <FaTimes /> Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 dark:border-zinc-700 hover:border-brand-green rounded-xl p-6 cursor-pointer bg-zinc-50/50 dark:bg-zinc-800/50 hover:bg-green-50/20 transition-all text-zinc-500">
                  <FaUpload className="text-zinc-400 mb-2" size={20} />
                  <span className="text-xs font-semibold">
                    {uploading ? 'Uploading image...' : 'Click to upload incident screenshot'}
                  </span>
                  <span className="text-[10px] text-zinc-400 mt-1">PNG, JPG or WEBP (Max 5MB)</span>
                  <input type="file" accept="image/*" disabled={uploading} onChange={handleImageUpload} className="hidden" />
                </label>
              )}
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 shrink-0 bg-white dark:bg-zinc-900">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="new-issue-form"
            disabled={submitting || uploading}
            className="bg-brand-green hover:bg-brand-dark-green text-white font-semibold shadow-sm transition-colors cursor-pointer"
          >
            {submitting ? 'Submitting...' : 'Submit Report'}
          </Button>
        </div>
      </div>
    </div>
  )
}
