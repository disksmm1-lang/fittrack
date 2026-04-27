import { NextRequest, NextResponse } from 'next/server'
import { chatWithAI } from '@/lib/openrouter'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { prompt } = await req.json()

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, age, gender, weight, height, goal, activity_level')
    .eq('id', user.id)
    .single()

  const profileStr = profile
    ? `Пол: ${profile.gender === 'male' ? 'мужской' : 'женский'}, Возраст: ${profile.age ?? '?'}, Вес: ${profile.weight ?? '?'} кг, Рост: ${profile.height ?? '?'} см, Цель: ${profile.goal ?? '?'}, Активность: ${profile.activity_level ?? '?'}`
    : 'профиль не заполнен'

  const systemPrompt = `Ты персональный тренер. Пользователь просит составить план тренировки.
Профиль: ${profileStr}

Верни ТОЛЬКО валидный JSON без markdown блоков, в формате:
{
  "name": "Название тренировки",
  "description": "Краткое описание цели тренировки",
  "exercises": [
    {
      "exercise_name": "Название упражнения",
      "muscle_group": "Группа мышц",
      "sets": 3,
      "reps": "8-12",
      "weight_kg": "60",
      "notes": "Подсказка по технике (необязательно)"
    }
  ]
}

Упражнений должно быть от 4 до 8. Reps может быть строкой типа "8-12" или "30 сек". Weight_kg — пустая строка если вес не нужен.`

  const raw = await chatWithAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt },
  ])

  // Extract JSON from response
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return NextResponse.json({ error: 'Invalid AI response' }, { status: 500 })

  const plan = JSON.parse(jsonMatch[0])
  return NextResponse.json(plan)
}
