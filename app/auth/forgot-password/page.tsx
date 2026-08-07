'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import toast from 'react-hot-toast'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setLoading(true)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await response.json()
      setLoading(false)

      if (!response.ok) {
        toast.error(data.error || 'Something went wrong')
      } else {
        toast.success('OTP sent successfully if email is registered!')
        router.push(`/auth/reset-password?email=${encodeURIComponent(email)}`)
      }
    } catch {
      setLoading(false)
      toast.error('Failed to request reset')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-zinc-50/30 dark:bg-zinc-950/30">
      <Card className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 border border-zinc-100 dark:border-zinc-800 shadow-md rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden p-0 min-h-[500px]">
        {/* Left Side: Brand Panel (Flat brand green, no gradient) */}
        <div className="hidden lg:flex lg:col-span-5 bg-brand-green text-white flex-col justify-between p-8 relative overflow-hidden">
          <div className="relative z-10 flex flex-col h-full justify-between gap-8">
            <div className="flex items-center">
              <div className="bg-white dark:bg-zinc-900 p-2 rounded-xl shadow-xs inline-block">
                <Image
                  src="/Et-logo.png"
                  alt="Ethio Telecom Logo"
                  width={90}
                  height={30}
                  style={{ width: 'auto', height: 'auto' }}
                  className="object-contain block dark:hidden"
                  priority
                />
                <Image
                  src="/Et-logo-dark-v2.png"
                  alt="Ethio Telecom Logo"
                  width={90}
                  height={30}
                  style={{ width: 'auto', height: 'auto' }}
                  className="object-contain hidden dark:block"
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
          {/* Logo visible only on mobile/tablet */}
          <div className="lg:hidden flex justify-center mb-6">
            <Image
              src="/Et-logo.png"
              alt="Ethio Telecom"
              width={140}
              height={45}
              style={{ width: 'auto', height: 'auto' }}
              className="object-contain block dark:hidden"
              priority
            />
            <Image
              src="/Et-logo-dark-v2.png"
              alt="Ethio Telecom"
              width={140}
              height={45}
              style={{ width: 'auto', height: 'auto' }}
              className="object-contain hidden dark:block"
              priority
            />
          </div>

          <div className="space-y-2 mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
              Forgot Password
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Enter your registered email and we will send you a 6-digit verification code.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
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

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-green hover:bg-brand-dark-green text-white font-semibold shadow-xs transition-colors py-2.5 cursor-pointer"
            >
              {loading ? 'Sending OTP...' : 'Send Verification OTP'}
            </Button>

            <div className="text-center text-sm text-zinc-500 pt-2 dark:text-zinc-400">
              Remember your password?{' '}
              <Link href="/auth/signin" className="font-semibold text-brand-green hover:underline">
                Sign in
              </Link>
            </div>
          </form>
        </div>
      </Card>
    </div>
  )
}
