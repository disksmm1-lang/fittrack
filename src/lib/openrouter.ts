const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string | { type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }[]
}

export async function chatWithAI(messages: Message[], model = 'mistralai/mistral-small-3.2-24b-instruct') {
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

export async function analyzeNutritionPhoto(base64Image: string) {
  return chatWithAI([
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: `Ты диетолог. Посмотри на фото еды и оцени примерный состав КБЖУ.
Верни ТОЛЬКО JSON без markdown блоков, в формате:
{
  "food_name": "название блюда",
  "amount_grams": 300,
  "calories": 450,
  "protein_g": 25,
  "fat_g": 15,
  "carbs_g": 45,
  "confidence": "high|medium|low",
  "comment": "краткий комментарий"
}`,
        },
        {
          type: 'image_url',
          image_url: { url: `data:image/jpeg;base64,${base64Image}` },
        },
      ],
    },
  ])
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
