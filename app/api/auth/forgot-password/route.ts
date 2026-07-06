import { NextResponse } from 'next/server'
import prisma from '@/app/lib/prisma'
import nodemailer from 'nodemailer'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      // Security best practice: don't reveal if user doesn't exist
      return NextResponse.json({ message: 'If this email is registered, you will receive an OTP code.' })
    }

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 mins

    // Save/Update reset request
    await prisma.passwordReset.upsert({
      where: { email },
      update: { otp, expiresAt },
      create: { email, otp, expiresAt }
    })

    // Check if SMTP is configured
    const smtpEmail = process.env.SMTP_EMAIL
    const smtpPass = process.env.SMTP_PASSWORD

    if (smtpEmail && smtpPass) {
      // Create transporter
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: smtpEmail,
          pass: smtpPass
        }
      })

      const mailOptions = {
        from: `"Ethio Telecom Support" <${smtpEmail}>`,
        to: email,
        subject: "Password Reset OTP - Ethio Telecom Issue Tracker",
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 500px;">
            <h2 style="color: #76bd22; border-bottom: 2px solid #76bd22; padding-bottom: 10px;">Password Reset Request</h2>
            <p>You requested a password reset for the Ethio Telecom Issue Tracker.</p>
            <p>Your 6-digit One-Time Password (OTP) is:</p>
            <div style="background-color: #f4f4f5; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #111; margin: 20px 0; border-radius: 5px; border: 1px dashed #76bd22;">
              ${otp}
            </div>
            <p style="color: #666; font-size: 12px;">This OTP will expire in 15 minutes. If you did not make this request, please ignore this email.</p>
          </div>
        `
      }

      await transporter.sendMail(mailOptions)
    } else {
      // Fallback for development if no SMTP email configured
      console.log(`\n🔑 [DEVELOPMENT RESET OTP] Email: ${email} | OTP: ${otp}\n`)
    }

    return NextResponse.json({ message: 'If this email is registered, you will receive an OTP code.' })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
