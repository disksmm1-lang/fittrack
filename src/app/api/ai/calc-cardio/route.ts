import { NextRequest, NextResponse } from 'next/server'

// MET значения для видов активности (метаболический эквивалент)
// Ккал = MET * вес_кг * время_ч
const MET: Record<string, { label: string; met: number }> = {
  walking:      { label: 'Ходьба',         met: 3.5  },
  walking_fast: { label: 'Быстрая ходьба', met: 5.0  },
  running:      { label: 'Бег',            met: 9.8  },
  running_slow: { label: 'Лёгкий бег',     met: 7.0  },
  cycling:      { label: 'Велосипед',      met: 7.5  },
  cycling_fast: { label: 'Велосипед (быстро)', met: 12.0 },
  swimming:     { label: 'Плавание',       met: 7.0  },
  swimming_fast:{ label: 'Плавание (интенсивно)', met: 10.0 },
  tennis:       { label: 'Теннис',         met: 7.3  },
  football:     { label: 'Футбол',         met: 8.0  },
  basketball:   { label: 'Баскетбол',      met: 6.5  },
  volleyball:   { label: 'Волейбол',       met: 4.0  },
  yoga:         { label: 'Йога',           met: 2.5  },
  stretching:   { label: 'Растяжка',       met: 2.3  },
  hiit:         { label: 'ВИИТ',           met: 12.0 },
  dancing:      { label: 'Танцы',          met: 5.5  },
  skiing:       { label: 'Лыжи',           met: 7.0  },
  rowing:       { label: 'Гребля',         met: 8.5  },
  jump_rope:    { label: 'Скакалка',       met: 12.3 },
  elliptical:   { label: 'Эллипсоид',      met: 5.0  },
  stairs:       { label: 'Подъём по лестнице', met: 9.0 },
  hiking:       { label: 'Поход/хайкинг',  met: 6.0  },
}

export const ACTIVITY_LIST = Object.entries(MET).map(([key, v]) => ({ key, label: v.label, met: v.met }))

export async function POST(req: NextRequest) {
  const { activity_type, duration_minutes, weight_kg } = await req.json()

  const activity = MET[activity_type]
  if (!activity) return NextResponse.json({ error: 'Unknown activity' }, { status: 400 })

  const weight = Number(weight_kg) || 75
  const hours = Number(duration_minutes) / 60
  const calories = Math.round(activity.met * weight * hours)

  return NextResponse.json({ calories_burned: calories, activity_label: activity.label })
}
