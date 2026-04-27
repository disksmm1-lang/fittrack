import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { food_name, amount_grams } = await req.json()
  if (!food_name || !amount_grams) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'FitTrack AI',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: `Рассчитай КБЖУ для: "${food_name}", ${amount_grams} г.
Верни ТОЛЬКО валидный JSON без markdown:
{"calories": 165, "protein_g": 31.0, "fat_g": 3.6, "carbs_g": 0.0}
Числа округли: калории до целых, макросы до 1 знака после запятой.`,
        },
      ],
      max_tokens: 100,
    }),
  })

  if (!response.ok) {
    return NextResponse.json({ error: 'AI error' }, { status: 500 })
  }

  const data = await response.json()
  const text: string = data.choices?.[0]?.message?.content ?? ''

  try {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON')
    const result = JSON.parse(match[0])
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Parse error', raw: text }, { status: 500 })
  }
}
