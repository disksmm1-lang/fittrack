import { NextRequest, NextResponse } from 'next/server'
import { analyzeNutritionPhoto } from '@/lib/openrouter'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { image, description } = await req.json()
  if (!image) return NextResponse.json({ error: 'No image' }, { status: 400 })

  let raw = ''
  try {
    raw = await analyzeNutritionPhoto(image, description)
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found')
    const result = JSON.parse(jsonMatch[0])
    return NextResponse.json(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg, raw }, { status: 500 })
  }
}
