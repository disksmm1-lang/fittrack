const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string | { type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }[]
}

export async function chatWithAI(messages: Message[], model = 'openai/gpt-4o-mini') {
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'FitTrack AI',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 1024,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenRouter error: ${error}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error(`No content in response: ${JSON.stringify(data).slice(0, 200)}`)
  return content as string
}

export async function analyzeNutritionPhoto(base64Image: string, description?: string) {
  const totalWeightMatch = description?.match(/(\d+)\s*г/i)
  const totalWeight = totalWeightMatch ? parseInt(totalWeightMatch[1]!) : null

  const descriptionHint = description
    ? `\n\nПользователь сообщил: "${description}".${
        totalWeight
          ? ` Общий вес порции = ${totalWeight}г. Раздели этот вес между ингредиентами по визуальным пропорциям на фото (например, рис занимает 60% тарелки → ~${Math.round(totalWeight * 0.6)}г, котлеты 40% → ~${Math.round(totalWeight * 0.4)}г). Рассчитай КБЖУ каждого ингредиента по его весу и сложи.`
          : ' Используй эти названия ингредиентов для точного определения КБЖУ.'
      }`
    : ''

  return chatWithAI([
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: `Ты опытный диетолог и нутрициолог. Внимательно изучи фото еды.${descriptionHint}

Твоя задача — максимально точно определить КБЖУ:
1. Определи каждый ингредиент на тарелке
2. Оцени визуальные пропорции каждого ингредиента (какую часть тарелки занимает)
3. Если пользователь указал общий вес — раздели его по пропорциям между ингредиентами
4. Если вес не указан — оцени по размеру тарелки/посуды (стандартная тарелка ~26 см)
5. Для каждого ингредиента рассчитай КБЖУ по его весу, затем сложи
6. Учти способ приготовления (жареное, варёное, запечённое)

Верни ТОЛЬКО валидный JSON без markdown, без пояснений:
{
  "food_name": "точное название блюда на русском",
  "amount_grams": 350,
  "calories": 420,
  "protein_g": 28,
  "fat_g": 14,
  "carbs_g": 38,
  "ingredients": "рис ~180г, котлета говяжья ~170г",
  "confidence": "high|medium|low",
  "comment": "пропорции определены визуально: рис ~50%, котлеты ~50%"
}`,
        },
        {
          type: 'image_url',
          image_url: { url: `data:image/jpeg;base64,${base64Image}` },
        },
      ],
    },
  ], 'openai/gpt-4o-mini')
}

export async function getWorkoutRecommendation(workoutHistory: string, userProfile: string) {
  return chatWithAI([
    {
      role: 'system',
      content: 'Ты персональный тренер. Давай конкретные, практичные советы на русском языке. Будь кратким.',
    },
    {
      role: 'user',
      content: `Профиль спортсмена: ${userProfile}\n\nПоследние тренировки:\n${workoutHistory}\n\nДай рекомендации по следующей тренировке и прогрессии нагрузок.`,
    },
  ])
}

export async function getNutritionRecommendation(todayNutrition: string, goals: string) {
  return chatWithAI([
    {
      role: 'system',
      content: 'Ты диетолог. Давай конкретные советы по питанию на русском языке. Будь кратким.',
    },
    {
      role: 'user',
      content: `Цели по КБЖУ: ${goals}\n\nСъедено сегодня: ${todayNutrition}\n\nДай рекомендации по питанию на остаток дня.`,
    },
  ])
}
