import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = 'openai/gpt-4o-mini'

// Инструмент сохранения профиля
const tools = [
  {
    type: 'function',
    function: {
      name: 'save_profile',
      description: 'Сохраняет данные профиля пользователя после завершения опроса. Вызывай только когда собраны все обязательные данные: имя, пол, возраст, рост, вес, цель, тип работы, тренировки.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          gender: { type: 'string', enum: ['male', 'female'] },
          age: { type: 'number' },
          weight: { type: 'number', description: 'кг' },
          height: { type: 'number', description: 'см' },
          goal: { type: 'string', enum: ['lose_weight', 'maintain', 'gain_muscle', 'recomposition'] },
          goal_detail: { type: 'string', description: 'Детали цели: напр. минус 10 кг за 4 месяца' },
          body_fat: { type: 'number', description: 'Процент жира если известен, иначе null' },
          work_type: { type: 'string', enum: ['sedentary', 'standing', 'physical'], description: 'sedentary=офис, standing=на ногах, physical=физический труд' },
          training_days: { type: 'number', description: 'Дней тренировок в неделю' },
          training_intensity: { type: 'string', enum: ['light', 'moderate', 'intense'] },
          experience: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
          target_weight: { type: 'number', description: 'Целевой вес кг если указал' },
          diet_history: { type: 'string', enum: ['none', 'occasional', 'chronic'], description: 'История диет' },
          sleep_hours: { type: 'number', description: 'Часов сна' },
          stress_level: { type: 'string', enum: ['low', 'moderate', 'high'] },
          food_restrictions: { type: 'string', description: 'Аллергии, вегетарианство и т.д.' },
          medical_notes: { type: 'string', description: 'Медицинские особенности если есть' },
        },
        required: ['name', 'gender', 'age', 'weight', 'height', 'goal', 'work_type', 'training_days', 'training_intensity', 'experience'],
      },
    },
  },
]

const SYSTEM_PROMPT = `Ты профессиональный фитнес-тренер и нутрициолог, проводишь первичную консультацию нового клиента.

Твоя задача — собрать все необходимые данные для составления персонального плана питания (КБЖУ) через естественный дружелюбный диалог. Веди себя как настоящий тренер: объясняй ЗАЧЕМ нужен каждый параметр, подбадривай, реагируй на ответы.

ПОРЯДОК ВОПРОСОВ (строго по одному за раз):
1. Имя (установи контакт, поприветствуй)
2. Пол и возраст (одним вопросом)
3. Рост и текущий вес
4. Главная цель + детали (похудеть на сколько? к какому сроку? или набрать мышцы?)
   Варианты: похудение / набор мышц / рекомпозиция (похудеть и накачаться) / поддержать форму
5. Опыт тренировок (новичок / 1-2 года / 3+ лет)
6. Работа: сидячая (офис, водитель) / на ногах (магазин, больница) / физический труд
7. Тренировки: сколько дней в неделю и какой тип (лёгкие/умеренные/интенсивные)
8. Процент жира (объясни метод Navy или визуальный гайд — можно пропустить)
   Для МУЖЧИН: опиши варианты: ~8-10% (рельефные кубики, видны вены), ~15% (подтянут, кубики слабо), ~20% (небольшой животик), ~25%+ (выраженный жир)
   Для ЖЕНЩИН: ~18-20% (очень подтянута), ~25% (атлетичная), ~30% (нормальная форма), ~35%+ (мягкая форма)
9. История диет: никогда не сидел на диете / иногда пробовал / долго держал дефицит калорий
10. Сон (часов в сутки) и уровень стресса (низкий/умеренный/высокий)
11. Пищевые ограничения: аллергии, вегетарианство, что не ешь
12. Медицинское (кратко): диабет, щитовидная, другие условия влияющие на питание — или "всё в порядке"

После сбора всех данных:
— Рассчитай BMR, TDEE и целевые калории с объяснением
— Назови макросы (белки/жиры/углеводы) с обоснованием
— Добавь предупреждения если нужно (слишком большой дефицит, мало сна, история хронического дефицита)
— Спроси подтверждение: "Сохранить этот план в профиль?"
— После согласия — вызови save_profile

ПРАВИЛА:
- Один вопрос за раз, не засыпай списком
- Реагируй на ответ прежде чем задать следующий вопрос ("Отлично, 182 см и 85 кг — хорошие данные для работы!")
- При расчёте используй Katch-McArdle если известен % жира, иначе Mifflin-St Jeor
- PAL считай по работе + тренировкам ОТДЕЛЬНО, не одним вопросом
- Дефицит не более 20% от TDEE (безопасный темп -0.5 кг/нед)
- Белок при похудении 2.0-2.2 г/кг, при наборе 1.8-2.0 г/кг, при рекомпозиции 2.3 г/кг
- Жиры минимум 0.8 г/кг (не меньше 50-60 г — для гормонов!)
- Если хронический дефицит в прошлом — предупреди о метаболической адаптации
- Если сон < 6 часов — предупреди что это снижает жиросжигание
- Отвечай на русском, будь тёплым и мотивирующим`

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { messages } = await req.json()

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'FitTrack AI',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      tools,
      tool_choice: 'auto',
      max_tokens: 800,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    return NextResponse.json({ error: err }, { status: 500 })
  }

  const data = await response.json()
  const choice = data.choices?.[0]
  if (!choice) return NextResponse.json({ error: 'No response' }, { status: 500 })

  // Модель вызывает save_profile
  if (choice.finish_reason === 'tool_calls' && choice.message?.tool_calls?.length > 0) {
    const toolCall = choice.message.tool_calls[0]
    const args = JSON.parse(toolCall.function.arguments)

    // Рассчитываем КБЖУ на сервере
    const kbju = calculateKBJU(args)

    // Сохраняем профиль
    await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      name: args.name,
      gender: args.gender,
      age: args.age,
      weight: args.weight,
      height: args.height,
      goal: args.goal,
      goal_detail: args.goal_detail || null,
      body_fat: args.body_fat || null,
      work_type: args.work_type,
      training_days: args.training_days,
      training_intensity: args.training_intensity,
      experience: args.experience,
      target_weight: args.target_weight || null,
      activity_level: computeActivityLevel(args),
      diet_history: args.diet_history || 'none',
      sleep_hours: args.sleep_hours || null,
      stress_level: args.stress_level || null,
      food_restrictions: args.food_restrictions || null,
      medical_notes: args.medical_notes || null,
      onboarding_completed: true,
    })

    // Второй вызов — подтверждение с итоговым планом
    const confirmResp = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'FitTrack AI',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages,
          choice.message,
          {
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify({ success: true, kbju }),
          },
        ],
        max_tokens: 600,
      }),
    })

    const confirmData = await confirmResp.json()
    const content = confirmData.choices?.[0]?.message?.content ?? '✅ Профиль сохранён!'
    return NextResponse.json({ content, profile_saved: true, kbju })
  }

  const content = choice.message?.content ?? 'Попробуй ещё раз.'
  return NextResponse.json({ content })
}

interface OnboardingArgs {
  gender: 'male' | 'female'
  age: number
  weight: number
  height: number
  goal: 'lose_weight' | 'maintain' | 'gain_muscle' | 'recomposition'
  body_fat?: number
  work_type: 'sedentary' | 'standing' | 'physical'
  training_days: number
  training_intensity: 'light' | 'moderate' | 'intense'
}

function calculateKBJU(args: OnboardingArgs) {
  const { gender, age, weight, height, goal, body_fat, work_type, training_days, training_intensity } = args

  // BMR: Katch-McArdle если известен % жира, иначе Mifflin-St Jeor
  let bmr: number
  if (body_fat && body_fat > 0) {
    const lbm = weight * (1 - body_fat / 100)
    bmr = 370 + 21.6 * lbm
  } else {
    bmr = gender === 'male'
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161
  }

  // PAL из работы + тренировок (раздельно — точнее)
  const workPal: Record<string, number> = { sedentary: 1.2, standing: 1.3, physical: 1.5 }
  const intensityAdd: Record<string, number> = { light: 0.1, moderate: 0.15, intense: 0.2 }
  const trainingAdd = (training_days / 7) * (intensityAdd[training_intensity] ?? 0.15) * 2
  const pal = (workPal[work_type] ?? 1.2) + trainingAdd
  const tdee = bmr * Math.min(pal, 1.9)

  // Калории по цели
  let calories: number
  if (goal === 'lose_weight') calories = tdee * 0.80       // дефицит 20%
  else if (goal === 'gain_muscle') calories = tdee + 300
  else if (goal === 'recomposition') calories = tdee - 200
  else calories = tdee

  // Белок (ISSN нормы)
  let protein: number
  if (goal === 'lose_weight') protein = weight * 2.1
  else if (goal === 'recomposition') protein = weight * 2.3
  else if (goal === 'gain_muscle') protein = weight * 1.9
  else protein = weight * 1.6

  // Жиры — минимум 0.8 г/кг, обычно 25-30% калорий
  const fatFromPercent = (calories * 0.27) / 9
  const fat = Math.max(fatFromPercent, weight * 0.8)

  // Углеводы — остаток
  const carbs = (calories - protein * 4 - fat * 9) / 4

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    calories: Math.round(calories),
    protein: Math.round(protein),
    fat: Math.round(fat),
    carbs: Math.max(0, Math.round(carbs)),
  }
}

function computeActivityLevel(args: OnboardingArgs): string {
  const { work_type, training_days } = args
  if (work_type === 'physical' || training_days >= 6) return 'very_active'
  if (training_days >= 4) return 'active'
  if (training_days >= 2) return 'moderate'
  if (work_type === 'standing') return 'light'
  return 'sedentary'
}
