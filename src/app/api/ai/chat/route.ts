import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateKBJU } from '@/lib/kbju'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'
const CHAT_MODEL = 'openai/gpt-4o-mini'

const exerciseProps = {
  exercise_name: { type: 'string' },
  muscle_group: { type: 'string' },
  sets: { type: 'number' },
  reps: { type: 'string', description: 'например "8-12" или "30 сек"' },
  weight_kg: { type: 'string', description: 'пустая строка если не нужен' },
  notes: { type: 'string', description: 'подсказка по технике' },
}

const tools = [
  {
    type: 'function',
    function: {
      name: 'create_planned_workout',
      description: 'Сохраняет запланированную тренировку в раздел "Запланированные тренировки". Вызывай только когда пользователь явно согласился с планом и сказал сохранить/добавить/создать.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Название тренировки' },
          description: { type: 'string', description: 'Краткое описание' },
          scheduled_date: { type: 'string', description: 'Дата в формате YYYY-MM-DD, если пользователь указал' },
          exercises: {
            type: 'array',
            items: { type: 'object', properties: exerciseProps, required: ['exercise_name', 'muscle_group', 'sets', 'reps'] },
          },
        },
        required: ['name', 'exercises'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_planned_workout',
      description: 'Удаляет запланированную тренировку. Вызывай только когда пользователь явно попросил удалить тренировку и подтвердил.',
      parameters: {
        type: 'object',
        properties: {
          workout_id: { type: 'string', description: 'ID тренировки из списка запланированных' },
          workout_name: { type: 'string', description: 'Название тренировки для подтверждения' },
        },
        required: ['workout_id', 'workout_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'log_food',
      description: 'Записывает еду/блюдо в дневник питания. Вызывай когда пользователь говорит что съел что-то: "съел", "выпил", "перекусил", "занеси", "добавь в дневник". Рассчитай КБЖУ самостоятельно на основе своих знаний о продукте и указанного веса/количества.',
      parameters: {
        type: 'object',
        properties: {
          food_name: { type: 'string', description: 'Название блюда/продукта на русском' },
          meal_type: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'], description: 'Определи по времени или контексту: breakfast=завтрак, lunch=обед, dinner=ужин, snack=перекус' },
          amount_grams: { type: 'number', description: 'Вес в граммах. Если пользователь сказал "тарелка", "порция" — оцени стандартный вес.' },
          calories: { type: 'number', description: 'Калории для указанного веса' },
          protein_g: { type: 'number', description: 'Белки в граммах' },
          fat_g: { type: 'number', description: 'Жиры в граммах' },
          carbs_g: { type: 'number', description: 'Углеводы в граммах' },
        },
        required: ['food_name', 'meal_type', 'amount_grams', 'calories', 'protein_g', 'fat_g', 'carbs_g'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_food_entry',
      description: 'Удаляет запись о еде из дневника питания сегодняшнего дня. Вызывай когда пользователь просит удалить/убрать/отменить запись о конкретном продукте. Используй ID из списка питания сегодня.',
      parameters: {
        type: 'object',
        properties: {
          entry_id: { type: 'string', description: 'ID записи о еде из раздела ПИТАНИЕ СЕГОДНЯ' },
          food_name: { type: 'string', description: 'Название для подтверждения' },
        },
        required: ['entry_id', 'food_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_food_entry',
      description: 'Обновляет запись о еде — меняет вес порции или пересчитывает КБЖУ. Вызывай когда пользователь говорит что указал неверный вес, хочет исправить запись.',
      parameters: {
        type: 'object',
        properties: {
          entry_id: { type: 'string', description: 'ID записи о еде из раздела ПИТАНИЕ СЕГОДНЯ' },
          food_name: { type: 'string', description: 'Название блюда' },
          amount_grams: { type: 'number', description: 'Новый вес в граммах' },
          calories: { type: 'number' },
          protein_g: { type: 'number' },
          fat_g: { type: 'number' },
          carbs_g: { type: 'number' },
        },
        required: ['entry_id', 'food_name', 'amount_grams', 'calories', 'protein_g', 'fat_g', 'carbs_g'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_planned_workout',
      description: 'Заменяет упражнения в существующей запланированной тренировке. Вызывай когда пользователь просит изменить/обновить/заменить конкретную тренировку из запланированных.',
      parameters: {
        type: 'object',
        properties: {
          workout_id: { type: 'string', description: 'ID тренировки из списка запланированных' },
          name: { type: 'string', description: 'Новое название (или то же самое)' },
          description: { type: 'string' },
          exercises: {
            type: 'array',
            items: { type: 'object', properties: exerciseProps, required: ['exercise_name', 'muscle_group', 'sets', 'reps'] },
          },
        },
        required: ['workout_id', 'name', 'exercises'],
      },
    },
  },
]

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { messages } = await req.json()

  // Load user context
  const today = new Date().toISOString().split('T')[0]
  const d7  = new Date(Date.now() -  7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const d30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const d90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [{ data: profile }, { data: workouts }, { data: todayFood }, { data: plannedWorkouts }, { data: weightHistory }, { data: cardioEntries }, { data: foodHistory }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('workouts').select('id, name, date, duration_minutes').eq('user_id', user.id).gte('date', d90).order('date', { ascending: false }).limit(60),
    supabase.from('food_entries').select('id, food_name, calories, protein_g, fat_g, carbs_g, meal_type, amount_grams').eq('user_id', user.id).eq('date', today).order('created_at'),
    supabase.from('planned_workouts').select('id, name, description, scheduled_date, planned_workout_exercises(exercise_name, muscle_group, sets, reps, order_index)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
    supabase.from('weight_history').select('date, weight, body_fat').eq('user_id', user.id).gte('date', d90).order('date', { ascending: false }).limit(30),
    supabase.from('cardio_entries').select('date, activity_type, duration_minutes, calories_burned').eq('user_id', user.id).gte('date', d30).order('date', { ascending: false }),
    supabase.from('food_entries').select('date, calories, protein_g, fat_g, carbs_g').eq('user_id', user.id).gte('date', d30).order('date'),
  ])

  // Загружаем упражнения и подходы один раз — используется и в деталях и в статистике
  let allWes: { id: string; workout_id: string; exercise: unknown }[] = []
  let allSets: { workout_exercise_id: string; set_number: number; weight_kg: number | null; reps: number | null; completed: boolean }[] = []

  let workoutDetails = ''
  if (workouts && workouts.length > 0) {
    const { data: wesData } = await supabase
      .from('workout_exercises')
      .select('id, workout_id, exercise:exercises(name, muscle_group)')
      .in('workout_id', workouts.map(w => w.id))
    allWes = wesData ?? []

    const { data: setsData } = await supabase
      .from('workout_sets')
      .select('workout_exercise_id, set_number, weight_kg, reps, completed')
      .in('workout_exercise_id', allWes.map(we => we.id))
      .order('set_number')
    allSets = setsData ?? []

    const setsByWE: Record<string, typeof allSets> = {}
    for (const s of allSets) {
      if (!setsByWE[s.workout_exercise_id]) setsByWE[s.workout_exercise_id] = []
      setsByWE[s.workout_exercise_id]!.push(s)
    }
    const weByWorkout: Record<string, typeof allWes> = {}
    for (const we of allWes) {
      if (!weByWorkout[we.workout_id]) weByWorkout[we.workout_id] = []
      weByWorkout[we.workout_id]!.push(we)
    }

    workoutDetails = workouts.map(w => {
      const dateStr = new Date(w.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' })
      const exList = (weByWorkout[w.id] ?? []).map(we => {
        const ex = we.exercise as { name: string; muscle_group: string } | null
        const sets = (setsByWE[we.id] ?? []).map(s => `${s.weight_kg ?? '—'}кг×${s.reps ?? '—'}`).join(', ')
        return `  - ${ex?.name ?? '?'}: ${sets}`
      }).join('\n')
      return `📅 ${dateStr} — "${w.name}"\n${exList || '  нет данных'}`
    }).join('\n\n')
  }

  // ── Статистика по мышечным группам и упражнениям ──
  let statsStr = ''
  if (workouts && workouts.length > 0) {
    const completedSets = allSets.filter(s => s.completed)

    // Маппинг workout_id → date
    const workoutDateMap: Record<string, string> = {}
    for (const w of workouts) workoutDateMap[w.id] = w.date

    // Агрегация: по мышечной группе → { sets, volume, exercises }
    type MgStat = { sets7: number; sets30: number; sets90: number; vol7: number; vol30: number; vol90: number; exercises: Set<string> }
    const mgStats: Record<string, MgStat> = {}

    // Агрегация: по упражнению → последний вес, макс вес
    type ExStat = { lastDate: string; lastWeight: number; maxWeight: number; totalSets: number }
    const exStats: Record<string, ExStat> = {}

    for (const we of allWes ?? []) {
      const ex = we.exercise as unknown as { name: string; muscle_group: string } | null
      if (!ex) continue
      const mg = ex.muscle_group ?? 'Другое'
      const wDate = workoutDateMap[we.workout_id] ?? ''
      const weSets = completedSets.filter(s => s.workout_exercise_id === we.id)
      const vol = weSets.reduce((sum, s) => sum + (Number(s.weight_kg) || 0) * (s.reps || 0), 0)
      const setsCount = weSets.length

      if (!mgStats[mg]) mgStats[mg] = { sets7: 0, sets30: 0, sets90: 0, vol7: 0, vol30: 0, vol90: 0, exercises: new Set() }
      mgStats[mg]!.exercises.add(ex.name)
      if (wDate >= d90) { mgStats[mg]!.sets90 += setsCount; mgStats[mg]!.vol90 += vol }
      if (wDate >= d30) { mgStats[mg]!.sets30 += setsCount; mgStats[mg]!.vol30 += vol }
      if (wDate >= d7)  { mgStats[mg]!.sets7  += setsCount; mgStats[mg]!.vol7  += vol }

      // Статистика по упражнению
      if (!exStats[ex.name]) exStats[ex.name] = { lastDate: '', lastWeight: 0, maxWeight: 0, totalSets: 0 }
      const es = exStats[ex.name]!
      es.totalSets += setsCount
      for (const s of weSets) {
        const w = Number(s.weight_kg) || 0
        if (w > es.maxWeight) es.maxWeight = w
        if (!es.lastDate || wDate > es.lastDate) { es.lastDate = wDate; es.lastWeight = w }
      }
    }

    const mgLines = Object.entries(mgStats)
      .sort(([, a], [, b]) => b.sets90 - a.sets90)
      .map(([mg, s]) =>
        `  ${mg}: неделя=${s.sets7}подх/${Math.round(s.vol7)}кг | месяц=${s.sets30}подх/${Math.round(s.vol30/1000*10)/10}т | 3мес=${s.sets90}подх (упр: ${[...s.exercises].join(', ')})`
      ).join('\n')

    const topExLines = Object.entries(exStats)
      .filter(([, s]) => s.maxWeight > 0)
      .sort(([, a], [, b]) => b.totalSets - a.totalSets)
      .slice(0, 15)
      .map(([name, s]) =>
        `  ${name}: макс=${s.maxWeight}кг, последний=${s.lastWeight}кг (${s.lastDate}), всего подх=${s.totalSets}`
      ).join('\n')

    statsStr = `СТАТИСТИКА ПО МЫШЕЧНЫМ ГРУППАМ (за 7д / 30д / 3мес, подходы / тоннаж):
${mgLines || '  нет данных'}

ТОП УПРАЖНЕНИЙ (макс вес / последний вес / всего подходов):
${topExLines || '  нет данных'}`
  }

  // ── Статистика питания за 30 дней ──
  let nutritionHistoryStr = ''
  if (foodHistory && foodHistory.length > 0) {
    const byDay: Record<string, { cal: number; p: number; f: number; c: number }> = {}
    for (const e of foodHistory) {
      if (!byDay[e.date]) byDay[e.date] = { cal: 0, p: 0, f: 0, c: 0 }
      byDay[e.date]!.cal += e.calories
      byDay[e.date]!.p += e.protein_g
      byDay[e.date]!.f += e.fat_g
      byDay[e.date]!.c += e.carbs_g
    }
    const days = Object.values(byDay)
    const avgCal = Math.round(days.reduce((s, d) => s + d.cal, 0) / days.length)
    const avgP = Math.round(days.reduce((s, d) => s + d.p, 0) / days.length)
    const avgF = Math.round(days.reduce((s, d) => s + d.f, 0) / days.length)
    const avgC = Math.round(days.reduce((s, d) => s + d.c, 0) / days.length)
    const kbju = profile ? calculateKBJU(profile) : null
    const goalDays = kbju ? days.filter(d => Math.abs(d.cal - kbju.calories) / kbju.calories <= 0.1).length : 0
    nutritionHistoryStr = `СТАТИСТИКА ПИТАНИЯ ЗА 30 ДНЕЙ (дней с записями: ${days.length}):
  Среднее/день: ${avgCal} ккал | Б:${avgP}г Ж:${avgF}г У:${avgC}г
  Дней в норме ±10%: ${goalDays} из ${days.length}`
  }

  // ── Кардио активность ──
  let cardioStr = ''
  if (cardioEntries && cardioEntries.length > 0) {
    const totalBurned30 = cardioEntries.reduce((s, e) => s + e.calories_burned, 0)
    const totalMin30 = cardioEntries.reduce((s, e) => s + e.duration_minutes, 0)
    const actCount: Record<string, number> = {}
    for (const e of cardioEntries) actCount[e.activity_type] = (actCount[e.activity_type] ?? 0) + 1
    const topAct = Object.entries(actCount).sort(([,a],[,b]) => b - a).map(([k, v]) => `${k}(${v}р)`).join(', ')
    const cardio7 = cardioEntries.filter(e => e.date >= d7)
    cardioStr = `КАРДИО/АКТИВНОСТЬ ЗА 30 ДНЕЙ:
  Всего: ${totalMin30} мин, сожжено ${totalBurned30} ккал
  За эту неделю: ${cardio7.reduce((s,e)=>s+e.duration_minutes,0)} мин, ${cardio7.reduce((s,e)=>s+e.calories_burned,0)} ккал
  Виды активности: ${topAct}`
  }

  // ── Вес тела ──
  let weightStr = ''
  if (weightHistory && weightHistory.length > 0) {
    const latest = weightHistory[0]!
    const oldest = weightHistory[weightHistory.length - 1]!
    const change = Math.round((latest.weight - oldest.weight) * 10) / 10
    weightStr = `ВЕС ТЕЛА:
  Последний: ${latest.weight} кг (${latest.date})${latest.body_fat ? `, жир ${latest.body_fat}%` : ''}
  ${weightHistory.length > 1 ? `За период: ${oldest.weight} → ${latest.weight} кг (${change > 0 ? '+' : ''}${change} кг)` : 'одна запись'}`
  }

  const totalCals = todayFood?.reduce((s, e) => s + e.calories, 0) ?? 0
  const totalProtein = todayFood?.reduce((s, e) => s + e.protein_g, 0) ?? 0
  const totalFat = todayFood?.reduce((s, e) => s + e.fat_g, 0) ?? 0
  const totalCarbs = todayFood?.reduce((s, e) => s + e.carbs_g, 0) ?? 0

  const kbju = profile ? calculateKBJU(profile) : null

  const GOAL_MAP: Record<string, string> = {
    lose_weight: 'похудение', maintain: 'поддержание веса',
    gain_muscle: 'набор мышц', recomposition: 'рекомпозиция тела',
  }
  const WORK_MAP: Record<string, string> = {
    sedentary: 'сидячая', standing: 'на ногах', physical: 'физический труд',
  }
  const INTENSITY_MAP: Record<string, string> = {
    light: 'лёгкие', moderate: 'умеренные', intense: 'интенсивные',
  }

  const profileStr = profile ? [
    `Имя: ${profile.name ?? '?'}`,
    `Пол: ${profile.gender === 'male' ? 'мужской' : 'женский'}`,
    `Возраст: ${profile.age ?? '?'} лет`,
    `Вес: ${profile.weight ?? '?'} кг`,
    `Рост: ${profile.height ?? '?'} см`,
    profile.body_fat ? `Процент жира: ${profile.body_fat}%` : null,
    `Цель: ${GOAL_MAP[profile.goal ?? ''] ?? profile.goal ?? '?'}`,
    profile.goal_detail ? `Детали цели: ${profile.goal_detail}` : null,
    `Работа: ${WORK_MAP[profile.work_type ?? ''] ?? profile.activity_level ?? '?'}`,
    profile.training_days != null ? `Тренировок в неделю: ${profile.training_days} (${INTENSITY_MAP[profile.training_intensity ?? ''] ?? '?'})` : null,
    profile.experience ? `Опыт: ${profile.experience === 'beginner' ? 'новичок' : profile.experience === 'intermediate' ? 'средний' : 'опытный'}` : null,
    profile.sleep_hours ? `Сон: ${profile.sleep_hours} ч` : null,
    profile.stress_level ? `Стресс: ${profile.stress_level === 'low' ? 'низкий' : profile.stress_level === 'high' ? 'высокий' : 'умеренный'}` : null,
    profile.food_restrictions ? `Ограничения в питании: ${profile.food_restrictions}` : null,
    profile.medical_notes ? `Медицинское: ${profile.medical_notes}` : null,
    kbju ? `\nРАССЧИТАННЫЕ НОРМЫ (используй эти цифры когда пользователь спрашивает про свои нормы):` : null,
    kbju ? `  BMR: ${kbju.bmr} ккал/день (базовый обмен)` : null,
    kbju ? `  TDEE: ${kbju.tdee} ккал/день (суточный расход)` : null,
    kbju ? `  Целевые калории: ${kbju.calories} ккал/день` : null,
    kbju ? `  Белок: ${kbju.protein} г/день` : null,
    kbju ? `  Жиры: ${kbju.fat} г/день` : null,
    kbju ? `  Углеводы: ${kbju.carbs} г/день` : null,
  ].filter(Boolean).join('\n') : 'профиль не заполнен'

  const plannedStr = plannedWorkouts && plannedWorkouts.length > 0
    ? plannedWorkouts.map(pw => {
        const exList = (pw.planned_workout_exercises as { exercise_name: string; sets: number; reps: string; order_index: number }[] ?? [])
          .sort((a, b) => a.order_index - b.order_index)
          .map(e => `  - ${e.exercise_name} ${e.sets}×${e.reps}`)
          .join('\n')
        return `[ID: ${pw.id}] "${pw.name}"${pw.scheduled_date ? ` (${pw.scheduled_date})` : ''}\n${exList}`
      }).join('\n\n')
    : 'нет запланированных тренировок'

  const mealLabel = (t: string) => t === 'breakfast' ? 'Завтрак' : t === 'lunch' ? 'Обед' : t === 'dinner' ? 'Ужин' : 'Перекус'
  const nutritionToday = todayFood && todayFood.length > 0
    ? [
        `Итого: ${Math.round(totalCals)} / ${kbju?.calories ?? '?'} ккал (осталось: ${Math.round(Math.max(0, (kbju?.calories ?? 0) - totalCals))})`,
        `Белок: ${Math.round(totalProtein)} / ${kbju?.protein ?? '?'} г | Жиры: ${Math.round(totalFat)} / ${kbju?.fat ?? '?'} г | Углеводы: ${Math.round(totalCarbs)} / ${kbju?.carbs ?? '?'} г`,
        '',
        'Записи (используй ID для удаления/изменения):',
        ...todayFood.map(e => `  [ID:${e.id}] ${mealLabel(e.meal_type)}: ${e.food_name} ${e.amount_grams}г — ${Math.round(e.calories)} ккал (Б:${Math.round(e.protein_g)} Ж:${Math.round(e.fat_g)} У:${Math.round(e.carbs_g)})`),
      ].join('\n')
    : `Ещё ничего не съедено. Норма на сегодня: ${kbju?.calories ?? '?'} ккал`

  const systemMessage = {
    role: 'system' as const,
    content: `Ты персональный тренер и диетолог. Отвечай на русском языке. Будь дружелюбным, кратким и конкретным.

ВАЖНО: У тебя есть полный профиль пользователя с рассчитанными нормами КБЖУ. Когда пользователь спрашивает про свои нормы, данные, показатели — ВСЕГДА бери цифры из раздела ПРОФИЛЬ ниже, не придумывай диапазоны. Называй конкретные числа из профиля.

Когда пользователь сообщает что он съел или выпил ("съел", "выпил", "перекусил", "на обед было", "сегодня ел"):
— НЕМЕДЛЕННО вызови инструмент log_food, не спрашивай подтверждения
— Сам рассчитай КБЖУ по своим знаниям о продукте и указанному весу/порции
— Если вес не указан — оцени стандартную порцию (тарелка супа ~300г, стакан сока ~200мл и т.д.)
— После успешной записи сообщи: что записал, сколько ккал, сколько осталось до нормы

Когда пользователь просит удалить еду из дневника ("удали", "убери", "я не ел", "отмени"):
— Найди запись в разделе ПИТАНИЕ СЕГОДНЯ по названию, возьми её ID
— НЕМЕДЛЕННО вызови delete_food_entry без лишних вопросов (если понятно о чём речь)

Когда пользователь хочет исправить запись о еде ("неправильный вес", "было не 300 а 200", "исправь"):
— Возьми ID нужной записи из ПИТАНИЕ СЕГОДНЯ, пересчитай КБЖУ под новый вес
— НЕМЕДЛЕННО вызови update_food_entry

Когда пользователь просит запланировать или составить тренировку:
1. Сначала уточни детали если нужно (группы мышц, оборудование, уровень)
2. Предложи конкретный план в тексте
3. Спроси "Сохранить в запланированные?"
4. Только если пользователь согласился — вызови инструмент create_planned_workout

Когда пользователь просит удалить запланированную тренировку:
1. Уточни какую именно (если неясно)
2. Спроси подтверждение
3. Только после подтверждения — вызови delete_planned_workout

Когда пользователь просит изменить/заменить/обновить запланированную тренировку:
1. Предложи новый вариант
2. Только после согласия — вызови update_planned_workout с ID нужной тренировки

=== ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ ===
${profileStr}

=== ПИТАНИЕ СЕГОДНЯ (${today}) ===
${nutritionToday}

=== ТРЕНИРОВКИ ЗА 90 ДНЕЙ (детально) ===
${workoutDetails || 'тренировок нет'}

=== ${statsStr || 'нет статистики по упражнениям'}

=== ${nutritionHistoryStr || 'нет истории питания'}

=== ${weightStr || 'вес не записан'}

=== ${cardioStr || 'кардио не записано'}

=== ЗАПЛАНИРОВАННЫЕ ТРЕНИРОВКИ ===
${plannedStr}`,
  }

  // First API call
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'FitTrack AI',
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages: [systemMessage, ...messages],
      tools,
      tool_choice: 'auto',
      max_tokens: 1500,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`OpenRouter error: ${err}`)
  }

  const data = await response.json()
  const choice = data.choices?.[0]
  if (!choice) throw new Error('No response from AI')

  console.log('[chat] finish_reason:', choice.finish_reason, '| tool_calls:', choice.message?.tool_calls?.map((t: {function: {name: string}}) => t.function.name))

  // Check if model wants to call a tool
  if (choice.finish_reason === 'tool_calls' && choice.message?.tool_calls?.length > 0) {
    const toolCall = choice.message.tool_calls[0]
    const fnName = toolCall.function.name
    const args = JSON.parse(toolCall.function.arguments)

    let toolResult: Record<string, unknown> = { success: false }
    let responseFlag: Record<string, boolean> = {}

    if (fnName === 'create_planned_workout') {
      const { data: pw } = await supabase.from('planned_workouts').insert({
        user_id: user.id,
        name: args.name,
        description: args.description || null,
        scheduled_date: args.scheduled_date || null,
      }).select().single()

      if (pw && args.exercises?.length > 0) {
        await supabase.from('planned_workout_exercises').insert(
          args.exercises.map((ex: {
            exercise_name: string; muscle_group: string; sets: number
            reps: string; weight_kg?: string; notes?: string
          }, i: number) => ({
            planned_workout_id: pw.id,
            exercise_name: ex.exercise_name,
            muscle_group: ex.muscle_group,
            sets: ex.sets,
            reps: ex.reps,
            weight_kg: ex.weight_kg || '',
            notes: ex.notes || '',
            order_index: i,
          }))
        )
      }
      toolResult = { success: true, workout_name: args.name }
      responseFlag = { workout_saved: true }

    } else if (fnName === 'log_food') {
      const { error } = await supabase.from('food_entries').insert({
        user_id: user.id,
        date: today,
        meal_type: args.meal_type,
        food_name: args.food_name,
        amount_grams: Number(args.amount_grams),
        calories: Number(args.calories),
        protein_g: Number(args.protein_g),
        fat_g: Number(args.fat_g),
        carbs_g: Number(args.carbs_g),
      })
      if (error) {
        console.error('[log_food] Supabase error:', error)
        toolResult = { success: false, error: error.message }
        responseFlag = {}
      } else {
        const newTotal = Math.round(totalCals + args.calories)
        const remaining = kbju ? Math.max(0, kbju.calories - newTotal) : null
        toolResult = {
          success: true,
          food_name: args.food_name,
          calories: args.calories,
          total_today: newTotal,
          remaining_calories: remaining,
          calorie_goal: kbju?.calories ?? null,
        }
        responseFlag = { food_logged: true }
      }

    } else if (fnName === 'delete_food_entry') {
      const { error } = await supabase
        .from('food_entries')
        .delete()
        .eq('id', args.entry_id)
        .eq('user_id', user.id)
      if (error) {
        toolResult = { success: false, error: error.message }
        responseFlag = {}
      } else {
        const deletedEntry = todayFood?.find(e => e.id === args.entry_id)
        const newTotal = Math.round(totalCals - (deletedEntry?.calories ?? 0))
        const remaining = kbju ? Math.max(0, kbju.calories - newTotal) : null
        toolResult = { success: true, food_name: args.food_name, total_today: newTotal, remaining_calories: remaining }
        responseFlag = { food_logged: true }
      }

    } else if (fnName === 'update_food_entry') {
      const { error } = await supabase
        .from('food_entries')
        .update({
          food_name: args.food_name,
          amount_grams: Number(args.amount_grams),
          calories: Number(args.calories),
          protein_g: Number(args.protein_g),
          fat_g: Number(args.fat_g),
          carbs_g: Number(args.carbs_g),
        })
        .eq('id', args.entry_id)
        .eq('user_id', user.id)
      if (error) {
        toolResult = { success: false, error: error.message }
        responseFlag = {}
      } else {
        const oldEntry = todayFood?.find(e => e.id === args.entry_id)
        const newTotal = Math.round(totalCals - (oldEntry?.calories ?? 0) + args.calories)
        const remaining = kbju ? Math.max(0, kbju.calories - newTotal) : null
        toolResult = { success: true, food_name: args.food_name, new_calories: args.calories, total_today: newTotal, remaining_calories: remaining }
        responseFlag = { food_logged: true }
      }

    } else if (fnName === 'delete_planned_workout') {
      const { error } = await supabase
        .from('planned_workouts')
        .delete()
        .eq('id', args.workout_id)
        .eq('user_id', user.id)
      toolResult = { success: !error, workout_name: args.workout_name }
      responseFlag = { workout_deleted: true }

    } else if (fnName === 'update_planned_workout') {
      await supabase
        .from('planned_workout_exercises')
        .delete()
        .eq('planned_workout_id', args.workout_id)

      await supabase
        .from('planned_workouts')
        .update({ name: args.name, description: args.description || null })
        .eq('id', args.workout_id)
        .eq('user_id', user.id)

      if (args.exercises?.length > 0) {
        await supabase.from('planned_workout_exercises').insert(
          args.exercises.map((ex: {
            exercise_name: string; muscle_group: string; sets: number
            reps: string; weight_kg?: string; notes?: string
          }, i: number) => ({
            planned_workout_id: args.workout_id,
            exercise_name: ex.exercise_name,
            muscle_group: ex.muscle_group,
            sets: ex.sets,
            reps: ex.reps,
            weight_kg: ex.weight_kg || '',
            notes: ex.notes || '',
            order_index: i,
          }))
        )
      }
      toolResult = { success: true, workout_name: args.name }
      responseFlag = { workout_updated: true }
    }

    // Second call to get confirmation message
    const confirmResponse = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'FitTrack AI',
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        messages: [
          systemMessage,
          ...messages,
          choice.message,
          {
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult),
          },
        ],
        max_tokens: 300,
      }),
    })

    const confirmData = await confirmResponse.json()
    const content = confirmData.choices?.[0]?.message?.content ?? `✅ Готово!`
    return NextResponse.json({ content, ...responseFlag })
  }

  // Regular text response
  const content = choice.message?.content ?? 'Ошибка. Попробуй ещё раз.'
  return NextResponse.json({ content })
}
