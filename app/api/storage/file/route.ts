import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Streams a private invoice file to its authenticated owner.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pathname = searchParams.get('pathname')

    if (!pathname) {
      return NextResponse.json({ error: 'Missing pathname parameter' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Double-check ownership via folder path structure (invoices/{userId}/filename)
    const folderUserPrefix = pathname.split('/')[0]
    if (folderUserPrefix !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You do not own this file.' },
        { status: 403 },
      )
    }

    // Download the file from storage
    const { data, error } = await supabase.storage.from('invoices').download(pathname)

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || 'File not found' },
        { status: 404 },
      )
    }

    const buffer = Buffer.from(await data.arrayBuffer())

    // Invoices are PDFs or images, guess contentType
    let contentType = 'application/octet-stream'
    if (pathname.endsWith('.pdf')) {
      contentType = 'application/pdf'
    } else if (pathname.endsWith('.png')) {
      contentType = 'image/png'
    } else if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) {
      contentType = 'image/jpeg'
    } else if (pathname.endsWith('.webp')) {
      contentType = 'image/webp'
    }

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${pathname.split('/').pop()}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (err) {
    console.error('File stream error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
