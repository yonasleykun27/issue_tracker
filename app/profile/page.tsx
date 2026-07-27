'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import toast from 'react-hot-toast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  FaUser, FaEnvelope, FaShieldAlt, FaEye, FaEyeSlash,
  FaCheck, FaTimes, FaLock
} from 'react-icons/fa'
import { validatePassword } from '@/app/lib/validatePassword'

interface ExtendedUser {
  id?: string
  role?: string
  name?: string | null
  email?: string | null
  status?: string
}

function PasswordStrengthIndicator({ password }: { password: string }) {
  if (!password) return null
  const v = validatePassword(password)
  const score = [v.minLength, v.hasUppercase, v.hasLowercase, v.hasNumber, v.hasSymbol].filter(Boolean).length

  const strengthLabel = score <= 1 ? 'Very Weak' : score === 2 ? 'Weak' : score === 3 ? 'Fair' : score === 4 ? 'Strong' : 'Very Strong'
  const strengthColor = score <= 1 ? 'bg-red-500' : score === 2 ? 'bg-orange-500' : score === 3 ? 'bg-yellow-500' : score === 4 ? 'bg-blue-500' : 'bg-brand-green'
  const textColor = score <= 1 ? 'text-red-600' : score === 2 ? 'text-orange-600' : score === 3 ? 'text-yellow-600' : score === 4 ? 'text-blue-600' : 'text-brand-green'

  const rules = [
    { label: 'At least 8 characters', met: v.minLength },
    { label: 'Uppercase letter (A-Z)', met: v.hasUppercase },
    { label: 'Lowercase letter (a-z)', met: v.hasLowercase },
    { label: 'Number (0-9)', met: v.hasNumber },
    { label: 'Symbol (!@#$%...)', met: v.hasSymbol },
  ]

  return (
    <div className="mt-2 space-y-2">
      {/* Strength bars */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1 flex-1">
          {[1,2,3,4,5].map(i => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= score ? strengthColor : 'bg-zinc-200 dark:bg-zinc-700'}`} />
          ))}
        </div>
        <span className={`text-[11px] font-bold whitespace-nowrap ${textColor}`}>{strengthLabel}</span>
      </div>
      {/* Checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-0.5">
        {rules.map((rule) => (
          <div key={rule.label} className="flex items-center gap-1.5">
            {rule.met
              ? <FaCheck size={9} className="text-brand-green flex-shrink-0" />
              : <FaTimes size={9} className="text-zinc-400 dark:text-zinc-600 flex-shrink-0" />
            }
            <span className={`text-[11px] font-medium ${rule.met ? 'text-zinc-700 dark:text-zinc-300' : 'text-zinc-400 dark:text-zinc-600'}`}>
              {rule.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const user = session?.user as ExtendedUser

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/auth/signin')
  }, [status, router])

  const roleColor = user?.role === 'ADMIN'
    ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400'
    : user?.role === 'AGENT'
    ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400'
    : 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400'

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('All password fields are required')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    const v = validatePassword(newPassword)
    if (!v.valid) {
      toast.error('New password does not meet complexity requirements')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/profile/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update password')
      toast.success('Password updated successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password')
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-zinc-500 text-sm">
        Loading profile...
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-zinc-950 dark:text-zinc-50">Profile &amp; Settings</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Manage your account information and security settings.</p>
      </div>

      {/* Profile Info Card */}
      <Card className="border border-zinc-100 dark:border-zinc-800 shadow-sm rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden">
        <CardHeader className="border-b border-zinc-50 dark:border-zinc-800 pb-4">
          <CardTitle className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <FaUser className="text-brand-green" size={14} />
            Account Information
          </CardTitle>
          <CardDescription className="text-zinc-500 dark:text-zinc-400 text-xs">Your profile details managed by the system.</CardDescription>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          {/* Avatar + info */}
          <div className="flex items-center gap-4 p-4 bg-zinc-50/60 dark:bg-zinc-950/40 border border-zinc-100 dark:border-zinc-800 rounded-xl">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-green to-brand-blue flex items-center justify-center text-white font-black text-xl shadow-sm flex-shrink-0">
              {user?.name?.slice(0, 2).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-zinc-900 dark:text-zinc-100 text-base truncate">{user?.name || '—'}</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">{user?.email || '—'}</p>
              <Badge className={`mt-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border-none ${roleColor}`}>
                {user?.role || 'USER'}
              </Badge>
            </div>
          </div>

          {/* Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">
                <FaUser className="inline mr-1.5" size={10} />Full Name
              </label>
              <Input
                value={user?.name || ''}
                disabled
                className="disabled:opacity-75 disabled:bg-zinc-50 dark:disabled:bg-zinc-850 cursor-not-allowed text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">
                <FaEnvelope className="inline mr-1.5" size={10} />Email Address
              </label>
              <Input
                value={user?.email || ''}
                disabled
                className="disabled:opacity-75 disabled:bg-zinc-50 dark:disabled:bg-zinc-850 cursor-not-allowed text-sm"
              />
            </div>
          </div>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-600 italic">
            Contact IT Administration to update your name or email address.
          </p>
        </CardContent>
      </Card>

      {/* Change Password Card */}
      <Card className="border border-zinc-100 dark:border-zinc-800 shadow-sm rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden">
        <CardHeader className="border-b border-zinc-50 dark:border-zinc-800 pb-4">
          <CardTitle className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <FaShieldAlt className="text-brand-green" size={14} />
            Change Password
          </CardTitle>
          <CardDescription className="text-zinc-500 dark:text-zinc-400 text-xs">
            Keep your account secure with a strong password.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          <form onSubmit={handleChangePassword} className="space-y-4">
            {/* Current Password */}
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                <FaLock className="inline mr-1.5 text-zinc-400" size={11} />
                Current Password
              </label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  className="pr-10 focus-visible:ring-brand-green"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                >
                  {showCurrent ? <FaEyeSlash size={15} /> : <FaEye size={15} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label htmlFor="newPassword" className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                <FaLock className="inline mr-1.5 text-zinc-400" size={11} />
                New Password
              </label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter your new password"
                  className="pr-10 focus-visible:ring-brand-green"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                >
                  {showNew ? <FaEyeSlash size={15} /> : <FaEye size={15} />}
                </button>
              </div>
              <PasswordStrengthIndicator password={newPassword} />
            </div>

            {/* Confirm New Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                <FaLock className="inline mr-1.5 text-zinc-400" size={11} />
                Confirm New Password
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your new password"
                  className={`pr-10 focus-visible:ring-brand-green ${
                    confirmPassword && newPassword !== confirmPassword
                      ? 'border-red-400 focus-visible:ring-red-400'
                      : confirmPassword && newPassword === confirmPassword
                      ? 'border-brand-green'
                      : ''
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                >
                  {showConfirm ? <FaEyeSlash size={15} /> : <FaEye size={15} />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                  <FaTimes size={9} /> Passwords do not match
                </p>
              )}
              {confirmPassword && newPassword === confirmPassword && (
                <p className="text-[11px] text-brand-green mt-1 flex items-center gap-1">
                  <FaCheck size={9} /> Passwords match
                </p>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <Button
                type="submit"
                disabled={saving || !validatePassword(newPassword).valid || newPassword !== confirmPassword}
                className="bg-brand-green hover:bg-brand-dark-green text-white font-semibold shadow-sm cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
