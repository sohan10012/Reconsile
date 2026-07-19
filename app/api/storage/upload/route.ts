import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Limit file size to 15MB
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: 'File exceeds 15MB limit' }, { status: 413 })
    }

    // Verify allowed mime types
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF and images are allowed.' },
        { status: 400 },
      )
    }

    const timestamp = Date.now()
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const pathname = `${user.id}/${timestamp}-${safeFileName}`

    // Upload to Supabase Storage
    const buffer = Buffer.from(await file.arrayBuffer())
    const { data, error } = await supabase.storage
      .from('invoices')
      .upload(pathname, buffer, {
        contentType: file.type,
        duplex: 'half',
      })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Generate signed URL or retrieve public/private URL.
    // Since it is a private bucket, the application will stream files via the secure file endpoint.
    // We return a logical path URL that points to our local file proxy route.
    const fileUrl = `/api/storage/file?pathname=${encodeURIComponent(pathname)}`

    return NextResponse.json({
      url: fileUrl,
      pathname,
      fileType: file.type,
    })
  } catch (err) {
    console.error('Upload handler error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
