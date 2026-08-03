import { NextResponse } from 'next/server'
import prisma from '@/app/lib/prisma'

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, role: true }
    })
    return NextResponse.json(users)
  } catch {
    return NextResponse.json([])
  }
}
