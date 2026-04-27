'use client'

import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { Scale, TrendingUp, Dumbbell, Flame, CalendarDays, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Period = 'today' | '7d' | '30d' | '90d' | 'custom'

interface Props {
  foodByDay: Record<string, { calories: number; protein_g: number; fat_g: number; carbs_g: number }>
  workouts: { id: string; date: string; name: string; duration_minutes: number | null; volume: number }[]
  weightHistory: { date: string; weight: number; body_fat: number | null }[]
  muscleGroups: Record<string, number>
  kbjuGoal: { calories: number; protein: number; fat: number; carbs: number } | null
  today: string
  profileWeight: number | null
  cardioByDay: Record<string, { calories: number; minutes: number }>
}

const PERIOD_DAYS: Record<Exclude<Period, 'custom' | 'today'>, number> = { '7d': 7, '30d': 30, '90d': 90 }
const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ef4444', '#06b6d4', '#f97316', '#84cc16']

const tooltipStyle = {
  backgroundColor: '#111',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  color: '#fff',
  fontSize: 12,
}

function toLocalDateStr(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function fmt(dateStr: string, short = false) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('ru-RU', short ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short' })
}

export default function StatsClient({ foodByDay, workouts, weightHistory, muscleGroups, kbjuGoal, today, profileWeight, cardioByDay }: Props) {
  const supabase = createClient()
  const [period, setPeriod] = useState<Period>('30d')
  const [showCalendar, setShowCalendar] = useState(false)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [weightInput, setWeightInput] = useState('')
  const [savingWeight, setSavingWeight] = useState(false)

  // Фильтр по периоду
  const { cutoff, endDate } = useMemo(() => {
    if (period === 'today') return { cutoff: today, endDate: today }
    if (period === 'custom' && customFrom && customTo) return { cutoff: customFrom, endDate: customTo }
    const days = PERIOD_DAYS[period as Exclude<Period, 'custom' | 'today'>] ?? 30
    const from = new Date()
    from.setDate(from.getDate() - days + 1)
    return { cutoff: toLocalDateStr(from), endDate: today }
  }, [period, customFrom, customTo, today])

  // Генерируем все даты периода
  const dateRange = useMemo(() => {
    const arr: string[] = []
    const start = new Date(cutoff + 'T00:00:00')
    const end = new Date(endDate + 'T00:00:00')
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      arr.push(toLocalDateStr(d))
    }
    return arr
  }, [cutoff, endDate])

  // Данные питания по дням (с учётом сожжённых на кардио)
  const caloriesData = dateRange.map(date => ({
    date,
    label: fmt(date, true),
    calories: Math.round(foodByDay[date]?.calories ?? 0),
    burned: Math.round(cardioByDay[date]?.calories ?? 0),
    net: Math.round((foodByDay[date]?.calories ?? 0) - (cardioByDay[date]?.calories ?? 0)),
    goal: kbjuGoal?.calories ?? 0,
  }))

  // Средние за период
  const daysWithFood = caloriesData.filter(d => d.calories > 0)
  const avgCalories = daysWithFood.length ? Math.round(daysWithFood.reduce((s, d) => s + d.calories, 0) / daysWithFood.length) : 0
  const avgProtein = daysWithFood.length ? Math.round(Object.entries(foodByDay).filter(([d]) => d >= cutoff).reduce((s, [, v]) => s + v.protein_g, 0) / daysWithFood.length) : 0
  const avgFat = daysWithFood.length ? Math.round(Object.entries(foodByDay).filter(([d]) => d >= cutoff).reduce((s, [, v]) => s + v.fat_g, 0) / daysWithFood.length) : 0
  const avgCarbs = daysWithFood.length ? Math.round(Object.entries(foodByDay).filter(([d]) => d >= cutoff).reduce((s, [, v]) => s + v.carbs_g, 0) / daysWithFood.length) : 0

  // Соблюдение нормы калорий
  const goalDays = kbjuGoal ? daysWithFood.filter(d => Math.abs(d.calories - kbjuGoal.calories) / kbjuGoal.calories <= 0.1).length : 0

  // Тренировки за период
  const filteredWorkouts = workouts.filter(w => w.date >= cutoff)
  const workoutDates = new Set(filteredWorkouts.map(w => w.date))

  // Объём по неделям
  const volumeByWeek: Record<string, number> = {}
  for (const w of filteredWorkouts) {
    const d = new Date(w.date + 'T00:00:00')
    const mon = new Date(d)
    mon.setDate(d.getDate() - d.getDay() + 1)
    const key = mon.toISOString().split('T')[0]
    volumeByWeek[key] = (volumeByWeek[key] ?? 0) + w.volume
  }
  const volumeData = Object.entries(volumeByWeek)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, volume]) => ({ label: fmt(date, true), volume }))

  // Мышечные группы — пирог
  const muscleData = Object.entries(muscleGroups)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([name, value]) => ({ name, value }))

  // Средние макросы — пирог
  const macroData = avgCalories > 0 ? [
    { name: 'Белки', value: avgProtein * 4, grams: avgProtein },
    { name: 'Жиры', value: avgFat * 9, grams: avgFat },
    { name: 'Углеводы', value: avgCarbs * 4, grams: avgCarbs },
  ] : []
  const macroColors = ['#3b82f6', '#f59e0b', '#f97316']

  // Вес тела
  const filteredWeight = weightHistory.filter(w => w.date >= cutoff)

  // Тепловая карта: 7 недель Пн-Вс, последняя неделя заканчивается сегодня
  const heatmapWeeks: string[][] = useMemo(() => {
    // Найдём воскресенье текущей недели (или сегодня если сегодня вс)
    const todayD = new Date(today + 'T00:00:00')
    const dow = todayD.getDay() // 0=вс,1=пн..6=сб
    // Сдвиг до конца недели (вс): (7 - dow) % 7 дней вперёд, но мы берём назад
    // Строим 49 дней назад от "конца текущей недели" (вс)
    const sundayOffset = (dow === 0) ? 0 : 7 - dow // дней до следующего вс
    const endSunday = new Date(todayD)
    endSunday.setDate(todayD.getDate() + sundayOffset)

    const weeks: string[][] = []
    for (let w = 6; w >= 0; w--) {
      const week: string[] = []
      for (let d = 6; d >= 0; d--) {
        const date = new Date(endSunday)
        date.setDate(endSunday.getDate() - (w * 7 + d))
        week.push(toLocalDateStr(date))
      }
      weeks.push(week)
    }
    return weeks
  }, [today])

  async function saveWeight() {
    const w = parseFloat(weightInput)
    if (!w || w < 20 || w > 300) return
    setSavingWeight(true)
    await supabase.from('weight_history').upsert({ date: today, weight: w })
    setWeightInput('')
    setSavingWeight(false)
    window.location.reload()
  }

  const periodBtns: { label: string; value: Period }[] = [
    { label: 'Сегодня', value: 'today' },
    { label: '7 дней', value: '7d' },
    { label: '30 дней', value: '30d' },
    { label: '90 дней', value: '90d' },
  ]

  function applyCustom() {
    if (customFrom && customTo && customFrom <= customTo) {
      setPeriod('custom')
      setShowCalendar(false)
    }
  }

  return (
    <div className="px-4 pt-6 pb-8 max-w-lg mx-auto">
      <h1 className="text-[26px] font-bold text-white mb-5">Статистика</h1>

      {/* Период */}
      <div className="flex gap-2 mb-2 flex-wrap">
        {periodBtns.map(btn => (
          <button
            key={btn.value}
            onClick={() => { setPeriod(btn.value); setShowCalendar(false) }}
            className={`py-2.5 px-3 rounded-xl text-sm font-semibold transition-colors ${
              period === btn.value
                ? 'bg-blue-600 text-white'
                : 'bg-[#111] border border-white/[0.07] text-zinc-400'
            }`}
          >
            {btn.label}
          </button>
        ))}
        <button
          onClick={() => setShowCalendar(v => !v)}
          className={`py-2.5 px-3 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 ${
            period === 'custom'
              ? 'bg-blue-600 text-white'
              : 'bg-[#111] border border-white/[0.07] text-zinc-400'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          {period === 'custom' && customFrom && customTo
            ? `${customFrom.slice(5).replace('-', '.')} – ${customTo.slice(5).replace('-', '.')}`
            : 'Период'}
        </button>
      </div>

      {/* Календарь — произвольный период */}
      {showCalendar && (
        <div className="bg-[#111] border border-white/[0.07] rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-white text-sm font-semibold">Выбрать период</p>
            <button onClick={() => setShowCalendar(false)}><X className="w-4 h-4 text-zinc-500" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <p className="text-zinc-500 text-xs mb-1.5">От</p>
              <input
                type="date"
                value={customFrom}
                max={customTo || today}
                onChange={e => setCustomFrom(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-zinc-800 border border-white/[0.07] text-white text-sm focus:outline-none focus:border-blue-500 [color-scheme:dark]"
              />
            </div>
            <div>
              <p className="text-zinc-500 text-xs mb-1.5">До</p>
              <input
                type="date"
                value={customTo}
                min={customFrom}
                max={today}
                onChange={e => setCustomTo(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-zinc-800 border border-white/[0.07] text-white text-sm focus:outline-none focus:border-blue-500 [color-scheme:dark]"
              />
            </div>
          </div>
          <button
            onClick={applyCustom}
            disabled={!customFrom || !customTo || customFrom > customTo}
            className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-40"
          >
            Применить
          </button>
        </div>
      )}
      {(period !== 'custom' || showCalendar) && <div className="mb-4" />}

      {/* ── ПИТАНИЕ ── */}
      <SectionTitle icon={<Flame className="w-4 h-4 text-orange-400" />} title="Питание" color="bg-orange-500/20" />

      {/* Сводка питания */}
      {(() => {
        const daysWithCardio = dateRange.filter(d => (cardioByDay[d]?.calories ?? 0) > 0)
        const avgBurned = daysWithCardio.length
          ? Math.round(daysWithCardio.reduce((s, d) => s + (cardioByDay[d]?.calories ?? 0), 0) / daysWithCardio.length)
          : 0
        return (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <StatCard label="Среднее ккал/день" value={avgCalories} unit="ккал" goal={kbjuGoal?.calories} color="text-white" />
            <StatCard label="Дней в норме ±10%" value={goalDays} unit={`из ${daysWithFood.length}`} color="text-green-400" />
            {avgBurned > 0 && (
              <StatCard label="Среднее кардио/день" value={avgBurned} unit="ккал сожжено" color="text-red-400" />
            )}
          </div>
        )
      })()}

      {/* Калории по дням */}
      <div className="bg-[#111] border border-white/[0.07] rounded-2xl p-4 mb-4">
        <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-3">Калории по дням</p>
        {caloriesData.some(d => d.calories > 0) ? (
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={caloriesData} barSize={period === '90d' ? 2 : period === '30d' ? 5 : 14}>
              <XAxis dataKey="label" tick={{ fill: '#52525b', fontSize: 10 }} tickLine={false} axisLine={false}
                interval={period === '7d' ? 0 : period === '30d' ? 4 : 13} />
              <YAxis hide domain={[0, Math.max((kbjuGoal?.calories ?? 0) * 1.2, 500)]} />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                formatter={(v, name) => {
                  if (name === 'calories') return [`${v ?? 0} ккал`, 'Съедено']
                  if (name === 'burned') return [`−${v ?? 0} ккал`, 'Кардио']
                  return [`${v ?? 0}`, String(name)]
                }}
              />
              {kbjuGoal && <Bar dataKey="goal" fill="rgba(34,197,94,0.1)" radius={[2, 2, 0, 0]} />}
              <Bar dataKey="calories" fill="#f97316" radius={[3, 3, 0, 0]}>
                {caloriesData.map((entry, i) => (
                  <Cell key={i} fill={kbjuGoal && entry.calories > kbjuGoal.calories * 1.1 ? '#ef4444' : '#f97316'} />
                ))}
              </Bar>
              {caloriesData.some(d => d.burned > 0) && (
                <Bar dataKey="burned" fill="rgba(239,68,68,0.5)" radius={[3, 3, 0, 0]} />
              )}
            </BarChart>
          </ResponsiveContainer>
        ) : <EmptyState text="Нет данных о питании" />}
        {kbjuGoal && <p className="text-zinc-600 text-xs mt-2">Зелёная полоса = норма {kbjuGoal.calories} ккал</p>}
      </div>

      {/* Средние макросы — пирог */}
      <div className="bg-[#111] border border-white/[0.07] rounded-2xl p-4 mb-6">
        <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-3">Средние макросы за день</p>
        {macroData.length > 0 ? (
          <div className="flex items-center gap-4">
            <PieChart width={130} height={130}>
              <Pie data={macroData} cx={60} cy={60} innerRadius={38} outerRadius={58} dataKey="value" strokeWidth={0}>
                {macroData.map((_, i) => <Cell key={i} fill={macroColors[i]} />)}
              </Pie>
              <text x={63} y={56} textAnchor="middle" fill="#fff" fontSize={16} fontWeight="bold">{avgCalories}</text>
              <text x={63} y={72} textAnchor="middle" fill="#71717a" fontSize={10}>ккал</text>
            </PieChart>
            <div className="flex flex-col gap-2 flex-1">
              {[
                { label: 'Белки', value: avgProtein, goal: kbjuGoal?.protein, color: '#3b82f6' },
                { label: 'Жиры', value: avgFat, goal: kbjuGoal?.fat, color: '#f59e0b' },
                { label: 'Углеводы', value: avgCarbs, goal: kbjuGoal?.carbs, color: '#f97316' },
              ].map(m => (
                <div key={m.label}>
                  <div className="flex justify-between mb-0.5">
                    <span className="text-zinc-500 text-xs">{m.label}</span>
                    <span className="text-white text-xs font-semibold">{m.value}г {m.goal ? <span className="text-zinc-600">/ {m.goal}г</span> : ''}</span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(m.goal ? (m.value / m.goal) * 100 : 100, 100)}%`, backgroundColor: m.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : <EmptyState text="Нет данных о питании" />}
      </div>

      {/* ── ТРЕНИРОВКИ ── */}
      <SectionTitle icon={<Dumbbell className="w-4 h-4 text-blue-400" />} title="Тренировки" color="bg-blue-500/20" />

      {/* Сводка тренировок */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <StatCard label="Тренировок" value={filteredWorkouts.length} unit="за период" color="text-blue-400" />
        <StatCard label="Общий объём" value={Math.round(filteredWorkouts.reduce((s, w) => s + w.volume, 0) / 1000)} unit="тонн" color="text-purple-400" />
      </div>

      {/* Тепловая карта активности */}
      <div className="bg-[#111] border border-white/[0.07] rounded-2xl p-4 mb-4">
        <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-3">Активность (7 недель)</p>
        {/* heatmapWeeks[wi][di]: wi=0 самая старая неделя, di=0 самый старый день недели */}
        {/* Строки = дни недели (Пн..Вс), колонки = недели */}
        <div className="flex gap-1">
          {/* Подписи дней недели */}
          <div className="flex flex-col gap-1 mr-1" style={{ paddingTop: 0 }}>
            {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d => (
              <div key={d} className="text-zinc-600 text-[9px] leading-none flex items-center" style={{ height: 28 }}>{d}</div>
            ))}
          </div>
          {/* Колонки недель */}
          <div className="flex gap-1 flex-1">
            {heatmapWeeks.map((week, wi) => {
              // Показываем подпись месяца если первый день недели сменил месяц
              const firstDate = week[0]!
              const prevFirstDate = wi > 0 ? heatmapWeeks[wi - 1]![0]! : null
              const showMonth = !prevFirstDate || firstDate.slice(0, 7) !== prevFirstDate.slice(0, 7)
              const monthLabel = showMonth
                ? new Date(firstDate + 'T00:00:00').toLocaleDateString('ru-RU', { month: 'short' })
                : ''
              return (
                <div key={wi} className="flex flex-col gap-1 flex-1 min-w-0">
                  {week.map((date, di) => {
                    const hasWorkout = workoutDates.has(date)
                    const isToday = date === today
                    const dayNum = new Date(date + 'T00:00:00').getDate()
                    return (
                      <div
                        key={date}
                        title={date}
                        className={`relative rounded-md w-full flex items-center justify-center ${
                          isToday ? 'ring-1 ring-white/40' : ''
                        } ${hasWorkout ? 'bg-blue-600' : 'bg-zinc-800/80'}`}
                        style={{ height: 28 }}
                      >
                        <span className={`text-[8px] leading-none font-medium select-none ${
                          hasWorkout ? 'text-blue-200' : 'text-zinc-600'
                        } ${isToday ? 'font-bold' : ''}`}>
                          {dayNum}
                        </span>
                      </div>
                    )
                  })}
                  {/* Подпись месяца под колонкой */}
                  <div className="text-zinc-600 text-[9px] text-center mt-0.5 truncate">{monthLabel}</div>
                </div>
              )
            })}
          </div>
        </div>
        <div className="flex gap-3 mt-3">
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-zinc-800" /><span className="text-zinc-600 text-xs">Отдых</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-blue-600" /><span className="text-zinc-600 text-xs">Тренировка</span></div>
        </div>
      </div>

      {/* Объём по неделям */}
      <div className="bg-[#111] border border-white/[0.07] rounded-2xl p-4 mb-4">
        <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-3">Тоннаж по неделям (кг)</p>
        {volumeData.length > 0 ? (
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={volumeData} barSize={18}>
              <XAxis dataKey="label" tick={{ fill: '#52525b', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                formatter={(v) => [`${v ?? 0} кг`, 'Объём']} />
              <Bar dataKey="volume" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <EmptyState text="Нет данных о тренировках" />}
      </div>

      {/* Мышечные группы — пирог */}
      <div className="bg-[#111] border border-white/[0.07] rounded-2xl p-4 mb-6">
        <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-3">Мышечные группы</p>
        {muscleData.length > 0 ? (
          <div className="flex items-center gap-3">
            <PieChart width={130} height={130}>
              <Pie data={muscleData} cx={60} cy={60} innerRadius={35} outerRadius={58} dataKey="value" strokeWidth={0}>
                {muscleData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
            </PieChart>
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              {muscleData.slice(0, 6).map((item, i) => {
                const total = muscleData.reduce((s, d) => s + d.value, 0)
                return (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-zinc-400 text-xs truncate flex-1">{item.name}</span>
                    <span className="text-zinc-500 text-xs flex-shrink-0">{Math.round(item.value / total * 100)}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        ) : <EmptyState text="Нет данных о тренировках" />}
      </div>

      {/* ── ВЕС ТЕЛА ── */}
      <SectionTitle icon={<Scale className="w-4 h-4 text-green-400" />} title="Вес тела" color="bg-green-500/20" />

      {/* Ввод веса сегодня */}
      <div className="bg-[#111] border border-white/[0.07] rounded-2xl p-4 mb-4">
        <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-3">Записать вес сегодня</p>
        <div className="flex gap-2">
          <input
            type="number"
            step="0.1"
            placeholder={profileWeight ? `${profileWeight}` : '75.0'}
            value={weightInput}
            onChange={e => setWeightInput(e.target.value)}
            className="flex-1 px-4 py-3 rounded-xl bg-zinc-800 border border-white/[0.07] text-white text-sm focus:outline-none focus:border-green-500"
          />
          <span className="flex items-center text-zinc-500 text-sm px-1">кг</span>
          <button
            onClick={saveWeight}
            disabled={savingWeight || !weightInput}
            className="px-5 py-3 rounded-xl bg-green-600 text-white font-semibold text-sm disabled:opacity-40"
          >
            {savingWeight ? '...' : 'Сохранить'}
          </button>
        </div>
      </div>

      {/* График веса */}
      <div className="bg-[#111] border border-white/[0.07] rounded-2xl p-4 mb-4">
        <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-3">Динамика веса</p>
        {filteredWeight.length > 1 ? (
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={filteredWeight.map(w => ({ ...w, label: fmt(w.date, true) }))}>
              <XAxis dataKey="label" tick={{ fill: '#52525b', fontSize: 10 }} tickLine={false} axisLine={false}
                interval={Math.max(0, Math.floor(filteredWeight.length / 5) - 1)} />
              <YAxis hide domain={['dataMin - 2', 'dataMax + 2']} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v ?? 0} кг`, 'Вес']} />
              <Line type="monotone" dataKey="weight" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e', r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState text={filteredWeight.length === 1 ? 'Записывай вес каждый день — появится график' : 'Начни записывать вес'} />
        )}
        {filteredWeight.length >= 2 && (
          <div className="flex gap-4 mt-3">
            <div>
              <p className="text-zinc-600 text-xs">Начало</p>
              <p className="text-white text-sm font-bold">{filteredWeight[0]!.weight} кг</p>
            </div>
            <div>
              <p className="text-zinc-600 text-xs">Сейчас</p>
              <p className="text-white text-sm font-bold">{filteredWeight[filteredWeight.length - 1]!.weight} кг</p>
            </div>
            <div>
              <p className="text-zinc-600 text-xs">Изменение</p>
              <p className={`text-sm font-bold ${filteredWeight[filteredWeight.length - 1]!.weight - filteredWeight[0]!.weight < 0 ? 'text-green-400' : 'text-red-400'}`}>
                {(filteredWeight[filteredWeight.length - 1]!.weight - filteredWeight[0]!.weight > 0 ? '+' : '')}
                {(filteredWeight[filteredWeight.length - 1]!.weight - filteredWeight[0]!.weight).toFixed(1)} кг
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SectionTitle({ icon, title, color }: { icon: React.ReactNode; title: string; color: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div className={`w-7 h-7 ${color} rounded-lg flex items-center justify-center`}>{icon}</div>
      <p className="text-white font-bold text-base">{title}</p>
    </div>
  )
}

function StatCard({ label, value, unit, goal, color }: { label: string; value: number; unit: string; goal?: number; color: string }) {
  return (
    <div className="bg-[#111] border border-white/[0.07] rounded-2xl p-4">
      <p className="text-zinc-500 text-xs mb-1">{label}</p>
      <p className={`text-2xl font-bold leading-none ${color}`}>{value}</p>
      <p className="text-zinc-600 text-xs mt-1">{unit}{goal ? ` / норма ${goal}` : ''}</p>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-8 text-center">
      <p className="text-zinc-600 text-sm">{text}</p>
    </div>
  )
}
