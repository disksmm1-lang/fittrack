import { NextRequest, NextResponse } from 'next/server'
import { analyzeNutritionPhoto } from '@/lib/openrouter'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { image } = await req.json()
  if (!image) return NextResponse.json({ error: 'No image' }, { status: 400 })

  const raw = await analyzeNutritionPhoto(image)

  try {
    const result = JSON.parse(raw)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response', raw }, { status: 500 })
  }
}
