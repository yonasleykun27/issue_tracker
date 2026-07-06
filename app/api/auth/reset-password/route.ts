import { NextResponse } from 'next/server'
import prisma from '@/app/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    const { email, otp, newPassword } = await request.json()

    if (!email || !otp || !newPassword) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    // Verify PasswordReset record
    const resetRecord = await prisma.passwordReset.findUnique({
      where: { email }
    })

    if (!resetRecord) {
      return NextResponse.json({ error: 'No password reset request found' }, { status: 400 })
    }

    if (resetRecord.otp !== otp) {
      return NextResponse.json({ error: 'Invalid OTP code' }, { status: 400 })
    }

    if (new Date() > resetRecord.expiresAt) {
      return NextResponse.json({ error: 'OTP code has expired' }, { status: 400 })
    }

    // Hash new password and update user
    const passwordHash = await bcrypt.hash(newPassword, 10)

    await prisma.$transaction([
      prisma.user.update({
        where: { email },
        data: { passwordHash }
      }),
      prisma.passwordReset.delete({
        where: { email }
      })
    ])

    return NextResponse.json({ message: 'Password reset successfully!' })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
