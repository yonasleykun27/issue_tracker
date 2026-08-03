import { NextResponse } from 'next/server'
import prisma from '@/app/lib/prisma'
import { sendOtpEmail } from '@/app/lib/email'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: 'Email address is required' }, { status: 400 })
    }

    // Verify email is not already in use
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Email is already registered' }, { status: 400 })
    }

    // Generate 6-digit numeric OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString()

    // Expiry: 10 minutes from now
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    // Store in db, replacing any active registration OTP for this email
    await prisma.otpCode.upsert({
      where: { email },
      update: { code: otp, expiresAt },
      create: { email, code: otp, expiresAt }
    })

    // Send verification email
    await sendOtpEmail({ to: email, otp })

    return NextResponse.json({ message: 'Verification code sent to your email address' })
  } catch (error: any) {
    console.error('Failed to send registration OTP:', error)
    return NextResponse.json({ error: 'Failed to send verification code. Please check your SMTP configuration.' }, { status: 500 })
  }
}
