export const moods = [
  { name: 'Very impatient', icon: '⚡' },
  { name: 'Impatient', icon: '😤' },
  { name: 'Neutral', icon: '😐' },
  { name: 'Patient', icon: '🙂' },
  { name: 'Very patient', icon: '😌' },
]
export const actions = [
  'Followed my plan', 'Wanted to rush results', 'Compared myself to others',
  'Made an impulsive decision', 'Changed my plan emotionally', 'Trusted the process',
  'Stayed disciplined despite setbacks', 'Deliberately rested', 'Felt behind',
] as const
const disciplined = new Set<string>([actions[0], actions[5], actions[6], actions[7]])
const reactive = new Set<string>([actions[3], actions[4]])
export const outcomes = ['Made progress', 'Maintained progress', 'No progress today'] as const
export const metrics = ['Percentage', 'Numerical target', 'Milestones', 'Consistency'] as const
export const horizons = [30, 90, 365, 1095, 1825, 3650]
export const horizonLabels = ['30 days', '90 days', '1 year', '3 years', '5 years', '10 years']
export const palette = ['#488b70', '#5778c8', '#c85363', '#865aca', '#b76332', '#3d859b', '#b65387', '#947116', '#607f49', '#b95249']
export const glyphs = ['wealth', 'career', 'fitness', 'business', 'cooking', 'ai', 'music', 'learning', 'growth', 'relationships']
export const reminders = [
  'Progress is not always visible.', 'Slow progress is still progress.', 'Do not confuse impatience with ambition.',
  'A bad day does not erase a good year.', 'Measure your actions, not just your outcomes.',
  'You can be impatient internally and disciplined externally.',
]

export type Milestone = { id: string; text: string; date: string; done: string }
export type Category = {
  id: string; name: string; icon: string; color: string; start: string; targetDate: string;
  goal: string; origin: string; next: string; metric: typeof metrics[number]; baseline: number;
  current: number; target: number; milestones: Milestone[]; archived: boolean; history: { date: string; value: number }[];
}
export type Entry = {
  id: string; category: string; date: string; outcome: number; mood: number;
  actions: string[]; note: string; accomplishment: string; value?: number;
}
export type Pause = {
  id: string; created: number; until: number; answers: string[]; review?: string;
}
export type Data = {
  version: 1; categories: Category[]; entries: Entry[]; pauses: Pause[]; rest: string[];
  awards: string[]; theme: 'light' | 'dark' | 'system';
}

export function day(date = new Date()) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}
export function shift(date: string, amount: number) {
  const result = new Date(date + 'T12:00:00')
  result.setDate(result.getDate() + amount)
  return day(result)
}
export function distance(a: string, b: string) {
  return Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86400000)
}
export function friendly(date: string, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }) {
  return new Date(date + 'T12:00:00').toLocaleDateString(undefined, options)
}
export const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)))
export const average = (numbers: number[]) => numbers.length ? Math.round(numbers.reduce((sum, n) => sum + n, 0) / numbers.length) : null
export const uid = () => crypto.randomUUID()
export const active = (data: Data) => data.categories.filter(category => !category.archived)
export const own = (data: Data, id: string) => data.entries.filter(entry => entry.category === id)
export const uniqueDays = (entries: Entry[]) => new Set(entries.map(entry => entry.date)).size
export const ordered = (entries: Entry[]) => [...entries].sort((a, b) => b.date.localeCompare(a.date))
export const score = (entries: Entry[]) => average(entries.map(entry => entry.mood * 25))
export function decisions(entries: Entry[]) {
  return entries.reduce((totals, entry) => ({
    steady: totals.steady + entry.actions.filter(action => disciplined.has(action)).length,
    reactive: totals.reactive + entry.actions.filter(action => reactive.has(action)).length,
    impulsive: totals.impulsive + Number(entry.actions.includes(actions[3])),
  }), { steady: 0, reactive: 0, impulsive: 0 })
}
export function discipline(entries: Entry[]) {
  const { steady, reactive: changed } = decisions(entries)
  return steady + changed ? Math.round(100 * steady / (steady + changed)) : null
}
export function progress(category: Category, entries: Entry[], date = day()) {
  if (date < category.start) return 0
  if (category.metric === 'Milestones') {
    return category.milestones.length ? clamp(100 * category.milestones.filter(m => m.done && m.done <= date).length / category.milestones.length) : 0
  }
  const logs = entries.filter(entry => entry.date <= date && entry.date >= category.start)
  if (category.metric === 'Consistency') return clamp(100 * uniqueDays(logs.filter(log => log.outcome !== 2)) / Math.max(1, category.target))
  const history = [
    ...category.history,
    ...logs.flatMap(log => log.value === undefined ? [] : [{ date: log.date, value: log.value }]),
  ].filter(log => log.date >= category.start && log.date <= date).sort((a, b) => a.date.localeCompare(b.date))
  const current = history.at(-1)?.value ?? (date === day() ? category.current : category.baseline)
  if (category.metric === 'Percentage') return clamp(current)
  return category.target === category.baseline ? 0 : clamp(100 * (current - category.baseline) / (category.target - category.baseline))
}
export function consistency(category: Category, entries: Entry[], today = day(), rest: string[] = []) {
  const start = [category.start, shift(today, -6)].sort().at(-1)!
  const eligible = Math.max(0, distance(start, today) + 1 - rest.filter(date => date >= start && date <= today).length)
  const count = uniqueDays(entries.filter(entry => entry.date >= start && entry.date <= today && entry.outcome !== 2 && !rest.includes(entry.date)))
  return eligible ? clamp(100 * count / eligible) : null
}
export function streak(data: Data, today = day()) {
  const recorded = new Set(data.entries.map(entry => entry.date))
  const rest = new Set(data.rest)
  let date = today
  let length = 0
  if (!recorded.has(date) && !rest.has(date)) date = shift(date, -1)
  while (recorded.has(date) || rest.has(date)) {
    if (recorded.has(date) && !rest.has(date)) length++
    date = shift(date, -1)
  }
  return length
}
export const badges = [
  { id: 'begin', label: 'First step', detail: 'Log your first check-in', icon: 'Sprout' },
  { id: 'steady', label: 'Steady hands', detail: 'Record 5 check-ins with disciplined actions', icon: 'Shield' },
  { id: 'week', label: 'Showing up', detail: 'Build a 7-day check-in streak', icon: 'Flame' },
  { id: 'pause', label: 'Room to breathe', detail: 'Reflect on your first cooling-off timer', icon: 'Timer' },
  { id: 'mile', label: 'A moment to mark', detail: 'Complete your first milestone', icon: 'Flag' },
  { id: 'patient', label: 'Trust the process', detail: 'Record 5 patient or very patient check-ins', icon: 'Heart' },
]
export function earned(data: Data) {
  const tests = [
    data.entries.length > 0, data.entries.filter(entry => decisions([entry]).steady > 0).length >= 5,
    streak(data) >= 7, data.pauses.some(pause => pause.review),
    data.categories.some(category => category.milestones.some(m => m.done)),
    data.entries.filter(entry => entry.mood >= 3).length >= 5,
  ]
  return [...new Set([...data.awards, ...badges.filter((_, index) => tests[index]).map(badge => badge.id)])]
}
export function xp(data: Data) {
  return data.entries.length * 10 + data.entries.filter(entry => decisions([entry]).steady > 0).length * 5
    + data.pauses.filter(pause => pause.review).length * 15 + data.awards.length * 20
}
const names = [
  'Wealth & Investing', 'Career & Engineering', 'Fitness & Physique', 'Business & Entrepreneurship',
  'Cooking & Culinary Skills', 'AI & Technology', 'Music & Creativity', 'Languages & Learning',
  'Mental Growth', 'Relationships & Experiences',
]
const examples = [
  ['Build a 6-month emergency fund', 'Set up the next automatic transfer', 'Set a monthly savings target', 68],
  ['Ship a portfolio project', 'Write a case study outline', 'Published the first prototype', 54],
  ['Train consistently for 90 days', 'Do the next scheduled session', 'Finished the foundation block', 42],
  ['Validate a business idea', 'Schedule one customer interview', 'Interviewed three customers', 28],
  ['Master ten weeknight recipes', 'Practice a pan sauce', 'Cooked five recipes without notes', 48],
  ['Build a useful AI workflow', 'Test one evaluation case', 'Ran the first evaluation', 63],
  ['Record three original songs', 'Record a rough vocal', 'Finished the first arrangement', 36],
  ['Hold a 15-minute conversation', 'Practice five useful phrases', 'Finished a lesson streak', 51],
  ['Build a sustainable reflection habit', 'Spend five minutes journaling', 'Set a weekly reflection time', 72],
  ['Plan more meaningful time together', 'Pick a date for dinner', 'Hosted a weekend dinner', 58],
] as const
export function blankCategory(): Category {
  return { id: uid(), name: '', color: palette[0], icon: glyphs[8], start: day(), targetDate: shift(day(), 90),
    goal: '', origin: '', next: '', metric: metrics[0], baseline: 0, current: 0, target: 100, milestones: [], archived: false, history: [] }
}
export function initial(sample = false): Data {
  const today = day()
  const categories = names.map((name, index) => {
    const [goal, next, win, value] = examples[index]
    const start = sample ? shift(today, -46 - index * 3) : today
    return {
      ...blankCategory(), id: glyphs[index], name, start, targetDate: shift(start, 90 + index * 7),
      icon: glyphs[index], color: palette[index], goal: sample ? goal : '', next: sample ? next : '',
      origin: sample ? 'Start with a plan I can repeat each week.' : '', current: sample ? value : 0,
      history: sample ? Array.from({ length: 5 }, (_, i) => ({ date: shift(today, -28 + 7 * i), value: Math.max(0, value - 8 * (4 - i)) })) : [],
      milestones: sample ? [
        { id: glyphs[index] + '-first', text: win, date: shift(today, -7), done: shift(today, -7) },
        { id: glyphs[index] + '-next', text: next, date: shift(today, 14 + index), done: '' },
      ] : [],
    }
  })
  const entries: Entry[] = sample ? Array.from({ length: 36 }, (_, age) => {
    const indices = age === 0 ? [0, 1] : [age % 10, (age + 3) % 10, (age + 6) % 10].slice(0, age % 3 + 1)
    return indices.map((index, order) => ({
      id: `sample-${age}-${index}`, category: glyphs[index], date: shift(today, -age), outcome: (age + index) % 8 === 0 && age ? 2 : (age + order) % 3 === 2 ? 1 : 0,
      mood: age === 0 ? 3 : [4, 3, 3, 2, 4, 4, 1][(age + order + index) % 7],
      actions: age % 9 === 4 ? [actions[3], actions[2], actions[8]] : age % 5 === 1 ? [actions[0], actions[1]] : [actions[0], actions[5]],
      note: '', accomplishment: age % 11 === 3 && order === 0 ? examples[index][2] : '',
    }))
  }).flat() : []
  const data: Data = { version: 1, categories, entries, pauses: [], rest: [], awards: [], theme: 'system' }
  return { ...data, awards: earned(data) }
}
