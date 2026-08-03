'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useSession } from 'next-auth/react'
import { FaUpload, FaTimes, FaPhoneAlt, FaMapMarkerAlt } from 'react-icons/fa'
import Image from 'next/image'
import dynamic from 'next/dynamic'

const RichTextEditor = dynamic(() => import('@/app/components/RichTextEditor'), { ssr: false })

interface ExtendedUser {
  id?: string
  role?: string
}

export default function NewIssuePage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const userRole = (session?.user as ExtendedUser)?.role || 'USER'

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('MEDIUM')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Project Division States
  const [divisions, setDivisions] = useState<any[]>([])
  const [projectDivisionId, setProjectDivisionId] = useState('')

  // Admin Assignment States
  const [agents, setAgents] = useState<any[]>([])
  const [assignedToId, setAssignedToId] = useState('')

  // Image Upload States
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  // Load divisions list
  useEffect(() => {
    fetch('/api/admin/divisions')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setDivisions(data))
      .catch(console.error)
  }, [])

  // Load active agents list for admin assignment options
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

  // Redirect non-employees and pending approval accounts away from this page
  const userStatus = (session?.user as any)?.status
  useEffect(() => {
    if (status === 'authenticated') {
      if (userStatus === 'PENDING') {
        toast.error('Your registration is pending administrator approval.')
        router.replace('/')
      } else if (userRole !== 'USER' && userRole !== 'ADMIN') {
        toast.error('Only employees and administrators can create tasks.')
        router.replace('/')
      }
    }
  }, [status, userRole, userStatus, router])

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
      toast.success('Attachment uploaded!')
    } catch (err) {
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
      const payload: any = {
        title,
        description,
        priority,
        imageUrl,
        phone,
        address,
        projectDivisionId
      }

      if (userRole === 'ADMIN' && assignedToId) {
        payload.assignedToId = assignedToId
      }

      const response = await fetch('/api/issues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to submit')
      }

      toast.success('Issue reported successfully! Awaiting admin assignment.')
      router.push('/')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to create issue')
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading') {
    return <div className="text-center py-20 text-zinc-400 text-sm">Loading...</div>
  }

  return (
    <div className="max-w-2xl mx-auto mt-8 p-4">
      <Card className="border border-zinc-100 shadow-sm rounded-2xl bg-white overflow-hidden p-2">
        <CardHeader>
          <CardTitle className="text-2xl font-extrabold text-zinc-950">Report a New Issue</CardTitle>
          <CardDescription className="text-zinc-500">
            Describe the telecom problem you're experiencing. Include your contact details and location so support can reach you.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Issue Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-semibold text-zinc-700 mb-1.5">
                Issue Title <span className="text-red-500">*</span>
              </label>
              <Input
                id="title"
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
              <label htmlFor="projectDivision" className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Project <span className="text-red-500">*</span>
              </label>
              <select
                id="projectDivision"
                required
                value={projectDivisionId}
                onChange={(e) => setProjectDivisionId(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 focus:outline-hidden focus:ring-1 focus:ring-brand-green"
              >
                <option value="">Select Project...</option>
                {divisions.map((div) => (
                  <option key={div.id} value={div.id}>
                    {div.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority & Assignee Option */}
            <div className={`grid grid-cols-1 ${userRole === 'ADMIN' ? 'sm:grid-cols-2' : ''} gap-4`}>
              <div>
                <label htmlFor="priority" className="block text-sm font-semibold text-zinc-700 dark:text-zinc-350 mb-1.5">
                  Priority Level
                </label>
                <select
                  id="priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-750 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-brand-green"
                >
                  <option value="LOW">Low — Minor inconvenience</option>
                  <option value="MEDIUM">Medium — Service disrupted</option>
                  <option value="HIGH">High — Fully down / critical</option>
                </select>
              </div>

              {userRole === 'ADMIN' && (
                <div>
                  <label htmlFor="assignedTo" className="block text-sm font-semibold text-zinc-700 dark:text-zinc-355 mb-1.5">
                    Assign Agent (Optional)
                  </label>
                  <select
                    id="assignedTo"
                    value={assignedToId}
                    onChange={(e) => setAssignedToId(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-750 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-brand-green cursor-pointer"
                  >
                    <option value="">Unassigned (Round-Robin fallback)</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name} ({agent.role})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Contact Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-zinc-700 mb-1.5">
                <FaPhoneAlt className="inline mr-1.5 text-zinc-400" size={12} />
                Contact Phone Number <span className="text-zinc-400 font-normal">(Optional)</span>
              </label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="focus-visible:ring-brand-green"
                placeholder="e.g. +251 91 123 4567"
              />
            </div>

            {/* Problem Address */}
            <div>
              <label htmlFor="address" className="block text-sm font-semibold text-zinc-700 mb-1.5">
                <FaMapMarkerAlt className="inline mr-1.5 text-zinc-400" size={12} />
                Problem Location / Address <span className="text-zinc-400 font-normal">(Optional)</span>
              </label>
              <Input
                id="address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="focus-visible:ring-brand-green"
                placeholder="e.g. Bole, Addis Ababa — near Edna Mall"
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-semibold text-zinc-700 mb-1.5">
                Full Description <span className="text-red-500">*</span>
              </label>
              <RichTextEditor
                value={description}
                onChange={setDescription}
                placeholder="Describe the problem in detail — when it started, what services are affected, what you've already tried..."
              />
            </div>

            {/* Optional Screenshot */}
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1.5">
                Attach Screenshot <span className="text-zinc-400 font-normal">(Optional)</span>
              </label>
              
              {imageUrl ? (
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
                    <p className="text-xs font-semibold text-zinc-700 truncate">Image attached</p>
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
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 hover:border-brand-green rounded-xl p-6 cursor-pointer bg-zinc-50/50 hover:bg-green-50/20 transition-all text-zinc-500">
                  <FaUpload className="text-zinc-400 mb-2" size={20} />
                  <span className="text-xs font-semibold">
                    {uploading ? 'Uploading image...' : 'Click to upload incident screenshot'}
                  </span>
                  <span className="text-[10px] text-zinc-400 mt-1">PNG, JPG or WEBP (Max 5MB)</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploading}
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-zinc-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/')}
                className="border-zinc-200 hover:bg-zinc-50"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || uploading}
                className="bg-brand-green hover:bg-brand-dark-green text-white font-semibold shadow-sm transition-colors cursor-pointer"
              >
                {submitting ? 'Submitting...' : 'Submit Report'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
