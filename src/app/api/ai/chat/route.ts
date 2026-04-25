import { NextRequest, NextResponse } from 'next/server'
import { chatWithAI } from '@/lib/openrouter'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { messages } = await req.json()

  const systemMessage = {
    role: 'system' as const,
    content: 'Ты персональный тренер и диетолог. Отвечай на русском языке. Давай конкретные, практичные советы. Будь дружелюбным и мотивирующим. Если не знаешь точных данных пользователя — предложи заполнить профиль.',
  }

  const reply = await chatWithAI([systemMessage, ...messages])
  return NextResponse.json({ content: reply })
}
