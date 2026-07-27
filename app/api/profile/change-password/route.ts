import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/app/lib/prisma'
import bcrypt from 'bcryptjs'
import { validatePassword } from '@/app/lib/validatePassword'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = parseInt((session.user as any).id || '0')
    if (!userId) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const { currentPassword, newPassword, confirmPassword } = await request.json()

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: 'New passwords do not match' }, { status: 400 })
    }

    // Validate new password complexity
    const complexity = validatePassword(newPassword)
    if (!complexity.valid) {
      const issues = [
        !complexity.minLength && 'at least 8 characters',
        !complexity.hasUppercase && 'an uppercase letter',
        !complexity.hasLowercase && 'a lowercase letter',
        !complexity.hasNumber && 'a number',
        !complexity.hasSymbol && 'a special symbol',
      ].filter(Boolean)
      return NextResponse.json(
        { error: `Password must contain ${issues.join(', ')}.` },
        { status: 400 }
      )
    }

    // Fetch user with password hash
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!isMatch) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    }

    // Hash and update
    const newHash = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash }
    })

    return NextResponse.json({ message: 'Password updated successfully' })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
