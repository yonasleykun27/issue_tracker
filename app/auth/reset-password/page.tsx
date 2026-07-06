'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import toast from 'react-hot-toast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { FaEye, FaEyeSlash } from 'react-icons/fa'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState(searchParams.get('email') ?? '')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !otp || !newPassword || !confirmPassword) {
      toast.error('All fields are required')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword })
      })

      const data = await response.json()
      setLoading(false)

      if (!response.ok) {
        toast.error(data.error || 'Something went wrong')
      } else {
        toast.success('Password updated successfully! Please sign in.')
        router.push('/auth/signin')
      }
    } catch (error) {
      setLoading(false)
      toast.error('Failed to reset password')
    }
  }

  return (
    <Card className="max-w-md w-full border border-zinc-100 shadow-sm rounded-2xl bg-white overflow-hidden p-2">
      <CardHeader className="flex flex-col items-center pb-2">
        <Image
          src="/Et-logo.png"
          alt="Ethio Telecom"
          width={180}
          height={60}
          style={{ width: 'auto', height: 'auto' }}
          className="object-contain mb-2"
          priority
        />
        <CardTitle className="text-2xl font-bold tracking-tight text-zinc-950">
          Reset Password
        </CardTitle>
        <CardDescription className="text-zinc-500 mt-1 text-center">
          Enter the 6-digit OTP sent to your email and choose a new password.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-zinc-700">
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="mt-1 focus-visible:ring-brand-green"
            />
          </div>

          {/* OTP */}
          <div>
            <label htmlFor="otp" className="block text-sm font-semibold text-zinc-700">
              OTP Verification Code
            </label>
            <Input
              id="otp"
              type="text"
              required
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="123456"
              className="mt-1 tracking-[4px] font-mono text-center font-bold text-lg focus-visible:ring-brand-green"
            />
          </div>

          {/* New Password */}
          <div>
            <label htmlFor="newPassword" className="block text-sm font-semibold text-zinc-700">
              New Password
            </label>
            <div className="relative mt-1">
              <Input
                id="newPassword"
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="*****"
                className="pr-10 focus-visible:ring-brand-green"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-zinc-700">
              Confirm New Password
            </label>
            <div className="relative mt-1">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="*****"
                className="pr-10 focus-visible:ring-brand-green"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                {showConfirmPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-green hover:bg-brand-dark-green text-white font-semibold shadow-sm transition-colors py-2.5 mt-2"
          >
            {loading ? 'Resetting Password...' : 'Reset Password'}
          </Button>

          <div className="text-center text-sm text-zinc-500 pt-2">
            Back to{' '}
            <Link href="/auth/signin" className="font-semibold text-brand-green hover:underline">
              Sign in
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-zinc-50 py-12 px-4">
      <Suspense fallback={<div className="text-sm text-zinc-500">Loading...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
}
