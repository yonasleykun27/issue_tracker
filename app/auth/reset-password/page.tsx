'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import toast from 'react-hot-toast'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { FaEye, FaEyeSlash, FaArrowLeft } from 'react-icons/fa'

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
    } catch {
      setLoading(false)
      toast.error('Failed to reset password')
    }
  }

  return (
    <Card className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 border border-zinc-100 dark:border-zinc-800 shadow-md rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden p-0 min-h-[500px]">
      {/* Left Side: Brand Panel (Flat brand green, no gradient) */}
      <div className="hidden lg:flex lg:col-span-5 bg-brand-green text-white flex-col justify-between p-8 relative overflow-hidden">
        <div className="relative z-10 flex flex-col h-full justify-between gap-8">
          <div className="flex items-center">
            <div className="bg-white p-2 rounded-xl shadow-xs inline-block">
              <Image
                src="/Et-logo.png"
                alt="Ethio Telecom Logo"
                width={90}
                height={30}
                style={{ width: 'auto', height: 'auto' }}
                className="object-contain"
                priority
              />
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-3xl font-bold tracking-tight leading-tight">
              Ethio Telecom <br />
              <span className="text-white/85 font-medium text-2xl">Issue Tracker</span>
            </h2>
            <p className="text-sm text-white/80 leading-relaxed font-normal">
              A secure and centralized portal for managing network operations, incident reporting, and bug tracking across the telecom infrastructure.
            </p>
          </div>

          <div className="text-xs text-white/60 font-light">
            <span>IT Operations & Support Center</span>
          </div>
        </div>
      </div>

      {/* Right Side: Form */}
      <div className="col-span-1 lg:col-span-7 flex flex-col justify-center p-8 sm:p-12 relative">
        {/* Back Link to Landing Page */}
        <Link
          href="/"
          className="absolute top-4 right-4 flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-brand-green transition-colors cursor-pointer"
        >
          <FaArrowLeft size={10} />
          Back to Home
        </Link>

        {/* Logo visible only on mobile/tablet */}
        <div className="lg:hidden flex justify-center mb-6">
          <Image
            src="/Et-logo.png"
            alt="Ethio Telecom"
            width={140}
            height={45}
            style={{ width: 'auto', height: 'auto' }}
            className="object-contain"
            priority
          />
        </div>

        <div className="space-y-2 mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
            Reset Password
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Enter the 6-digit OTP sent to your email and choose a new password.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="mt-1 focus-visible:ring-brand-green dark:bg-zinc-800 dark:border-zinc-700"
            />
          </div>

          {/* OTP */}
          <div>
            <label htmlFor="otp" className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
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
              className="mt-1 tracking-[4px] font-mono text-center font-bold text-lg focus-visible:ring-brand-green dark:bg-zinc-800 dark:border-zinc-700"
            />
          </div>

          {/* Password fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
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
                  className="pr-10 focus-visible:ring-brand-green dark:bg-zinc-800 dark:border-zinc-700"
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

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
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
                  className="pr-10 focus-visible:ring-brand-green dark:bg-zinc-800 dark:border-zinc-700"
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
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-green hover:bg-brand-dark-green text-white font-semibold shadow-xs transition-colors py-2.5 mt-2"
          >
            {loading ? 'Resetting Password...' : 'Reset Password'}
          </Button>

          <div className="text-center text-sm text-zinc-500 pt-2 dark:text-zinc-400">
            Back to{' '}
            <Link href="/auth/signin" className="font-semibold text-brand-green hover:underline">
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </Card>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50/30 dark:bg-zinc-950/30 py-12 px-4">
      <Suspense fallback={<div className="text-sm text-zinc-500">Loading...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
}
