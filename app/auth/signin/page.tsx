'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import toast from 'react-hot-toast'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

import { FaEye, FaEyeSlash } from 'react-icons/fa'

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const result = await signIn('credentials', {
      redirect: false,
      email,
      password
    })

    setLoading(false)

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success('Signed in successfully!')
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="min-h-[calc(100vh-180px)] flex items-center justify-center px-4 py-8 bg-zinc-50/30">
      <Card className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 border border-zinc-100 shadow-md rounded-2xl bg-white overflow-hidden p-0 min-h-[500px]">
        {/* Left Side: Brand Panel */}
        <div className="hidden lg:flex lg:col-span-5 bg-linear-to-br from-brand-green to-brand-blue text-white flex-col justify-between p-8 relative overflow-hidden">
          {/* Decorative background shapes */}
          <div className="absolute -top-12 -left-12 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
          <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-3xl" />

          <div className="relative z-10 flex flex-col h-full justify-between gap-8">
            <div className="flex items-center">
              <div className="bg-white/95 p-2 rounded-xl shadow-sm inline-block">
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
              <p className="text-sm text-white/80 leading-relaxed">
                A secure and centralized portal for managing network operations, incident reporting, and bug tracking across the telecom infrastructure.
              </p>
            </div>

            <div className="text-xs text-white/60 font-light">
              <span>IT Operations & Support Center</span>
            </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="col-span-1 lg:col-span-7 flex flex-col justify-center p-8 sm:p-12">
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
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
              Sign In
            </h1>
            <p className="text-sm text-zinc-500">
              Enter your credentials to access the tracker.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-zinc-700">
                  Email address
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="mt-1 focus-visible:ring-brand-green"
                />
              </div>

              <div>
                <div className="flex justify-between items-center">
                  <label htmlFor="password" className="block text-sm font-semibold text-zinc-700">
                    Password
                  </label>
                  <Link href="/auth/forgot-password" className="text-xs font-semibold text-brand-green hover:underline">
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative mt-1">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-green hover:bg-brand-dark-green text-white font-semibold shadow-sm transition-colors py-2.5 cursor-pointer"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>

            <div className="text-center text-sm text-zinc-500 pt-2">
              Don&apos;t have an account?{' '}
              <Link href="/auth/signup" className="font-semibold text-brand-green hover:underline">
                Create a new account
              </Link>
            </div>
          </form>
        </div>
      </Card>
    </div>
  )
}
