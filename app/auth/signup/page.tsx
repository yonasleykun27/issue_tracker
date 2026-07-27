'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import toast from 'react-hot-toast'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

import { FaEye, FaEyeSlash, FaEnvelope, FaCheck, FaTimes } from 'react-icons/fa'
import { validatePassword } from '@/app/lib/validatePassword'

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
    <div className="mt-2 space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="flex gap-1 flex-1">
          {[1,2,3,4,5].map(i => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= score ? strengthColor : 'bg-zinc-200'}`} />
          ))}
        </div>
        <span className={`text-[11px] font-bold whitespace-nowrap ${textColor}`}>{strengthLabel}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
        {rules.map(rule => (
          <div key={rule.label} className="flex items-center gap-1">
            {rule.met ? <FaCheck size={8} className="text-brand-green flex-shrink-0" /> : <FaTimes size={8} className="text-zinc-400 flex-shrink-0" />}
            <span className={`text-[10px] font-medium ${rule.met ? 'text-zinc-700' : 'text-zinc-400'}`}>{rule.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function SignUpPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [activationCode, setActivationCode] = useState('')
  
  // OTP States
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  const [loading, setLoading] = useState(false)

  // OTP Cooldown Countdown Timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [cooldown])

  const handleSendOtp = async () => {
    if (!email) {
      toast.error('Please enter your email address first')
      return
    }

    setSendingOtp(true)
    try {
      const response = await fetch('/api/register/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await response.json()
      setSendingOtp(false)

      if (!response.ok) {
        toast.error(data.error || 'Failed to send verification code')
      } else {
        toast.success('Verification code sent to your email!')
        setOtpSent(true)
        setCooldown(60) // 1 minute cooldown
      }
    } catch {
      setSendingOtp(false)
      toast.error('Failed to send verification code')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    const complexity = validatePassword(password)
    if (!complexity.valid) {
      toast.error('Password does not meet complexity requirements. Check the checklist below.')
      return
    }

    if (!otpSent) {
      toast.error('Please request and enter the verification code sent to your email')
      return
    }

    if (!otp) {
      toast.error('Please enter the verification code')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, activationCode, otp })
      })

      const data = await response.json()
      setLoading(false)

      if (!response.ok) {
        toast.error(data.error || 'Something went wrong')
      } else {
        toast.success('Account created! Please sign in.')
        router.push('/auth/signin')
      }
    } catch (error) {
      setLoading(false)
      toast.error('Failed to create account')
    }
  }

  return (
    <div className="min-h-[calc(100vh-180px)] flex items-center justify-center px-4 py-8 bg-zinc-50/30">
      <Card className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 border border-zinc-100 shadow-md rounded-2xl bg-white overflow-hidden p-0 min-h-[550px]">
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
              Create Account
            </h1>
            <p className="text-sm text-zinc-500">
              Sign up to get access to the issue tracker portal.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-3">
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-zinc-700">Full Name</label>
                <Input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="mt-1 focus-visible:ring-brand-green"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-zinc-700">Email Address</label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="focus-visible:ring-brand-green"
                  />
                  <Button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={sendingOtp || cooldown > 0 || !email}
                    className="bg-brand-green hover:bg-brand-dark-green text-white font-semibold text-xs whitespace-nowrap cursor-pointer px-4 flex items-center gap-1.5"
                  >
                    <FaEnvelope size={11} />
                    {cooldown > 0 ? `${cooldown}s` : sendingOtp ? 'Sending...' : 'Send Code'}
                  </Button>
                </div>
              </div>

              {otpSent && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                  <label htmlFor="otp" className="block text-sm font-semibold text-zinc-700">Verification Code</label>
                  <Input
                    id="otp"
                    type="text"
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter the 6-digit code sent to your email"
                    className="mt-1 focus-visible:ring-brand-green font-mono tracking-widest text-center font-bold text-lg"
                    maxLength={6}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-zinc-700">Password</label>
                  <div className="relative mt-1">
                    <Input
                      id="password"
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
                  <PasswordStrengthIndicator password={password} />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-semibold text-zinc-700">Confirm Password</label>
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
              </div>

              <div>
                <div className="flex justify-between items-center">
                  <label htmlFor="activationCode" className="block text-sm font-semibold text-zinc-700">
                    Activation Code
                  </label>
                  <span className="text-[10px] text-zinc-400">Required for registration</span>
                </div>
                <Input
                  id="activationCode"
                  type="text"
                  required
                  value={activationCode}
                  onChange={(e) => setActivationCode(e.target.value)}
                  className="mt-1 focus-visible:ring-brand-green"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !otpSent}
              className="w-full bg-brand-green hover:bg-brand-dark-green text-white font-semibold shadow-sm transition-colors py-2.5 cursor-pointer mt-2 disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>

            <div className="text-center text-sm text-zinc-500 pt-2">
              Already have an account?{' '}
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
