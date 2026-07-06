import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Ensure uploads directory exists
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    try {
      await mkdir(uploadDir, { recursive: true })
    } catch (e) {
      // directory already exists or error
    }

    // Save with unique name to prevent collisions
    const fileExtension = path.extname(file.name)
    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${fileExtension}`
    const filePath = path.join(uploadDir, uniqueFileName)

    await writeFile(filePath, buffer)
    const fileUrl = `/uploads/${uniqueFileName}`

    return NextResponse.json({ url: fileUrl })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
  }
}
