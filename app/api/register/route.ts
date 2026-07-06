import { NextResponse } from 'next/server'
import prisma from '@/app/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, password, activationCode } = body

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Missing name, email, or password' }, { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    if (!activationCode) {
      return NextResponse.json({ error: 'Activation code is required for registration' }, { status: 400 })
    }

    let assignedRole = ''
    if (activationCode === 'TELE_ADMIN') {
      assignedRole = 'ADMIN'
    } else if (activationCode === 'TELE_AGENT') {
      assignedRole = 'AGENT'
    } else if (activationCode === 'TELE_EMPLOYEE') {
      assignedRole = 'USER'
    } else {
      return NextResponse.json({ error: 'Invalid registration activation code' }, { status: 400 })
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: assignedRole as 'USER' | 'AGENT' | 'ADMIN',
        status: assignedRole === 'ADMIN' ? 'ACTIVE' : 'PENDING'
      }
    })

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
