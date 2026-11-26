import type { CSSProperties, ReactNode } from 'react'
import {
  ArrowDown, ArrowRight, ArrowUp, AudioLines, BookOpen, BriefcaseBusiness, ChartNoAxesCombined, ChefHat,
  CircleDollarSign, Dumbbell, Flag, Flame, Heart, Lightbulb, Shield, Sparkles, Sprout, Timer,
} from 'lucide-react'
import {
  clamp, consistency, day, friendly, own, progress, score, shift, type Category, type Data,
} from './model'

const icons = {
  wealth: CircleDollarSign, career: BriefcaseBusiness, fitness: Dumbbell, business: Lightbulb, cooking: ChefHat,
  ai: Sparkles, music: AudioLines, learning: BookOpen, growth: Sprout, relationships: Heart,
  Sprout, Shield, Flame, Timer, Flag, Heart,
}
export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const Graphic = icons[name as keyof typeof icons] ?? Sprout
  return <Graphic size={size} strokeWidth={1.85} aria-hidden="true" />
}
export function hue(color: string) {
  return { '--hue': color } as CSSProperties
}
export function Ring({ value, size = 70, label, className = '' }: { value: number | null; size?: number; label?: string; className?: string }) {
  const radius = 46
  const circumference = 2 * Math.PI * radius
  return <div className={'progress-ring ' + className} style={{ width: size, maxWidth: '100%' }} role="img" aria-label={label ?? (value === null ? 'No score yet' : value + '%')}>
    <svg viewBox="0 0 104 104" aria-hidden="true">
      <circle cx="52" cy="52" r={radius} fill="none" stroke="var(--ring-track, var(--line))" strokeWidth="5.5" />
      {value !== null && value > 0 && <circle cx="52" cy="52" r={radius} fill="none" stroke="var(--ring-color, var(--hue, var(--primary)))" strokeWidth="5.5"
        strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - clamp(value) / 100)} transform="rotate(-90 52 52)" />}
    </svg>
    <span aria-hidden="true">{value === null ? '—' : value + (label ? '' : '%')}</span>
  </div>
}
export function Meter({ value, label }: { value: number; label: string }) {
  return <div className="meter" role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
    <span style={{ width: clamp(value) + '%' }} />
  </div>
}
export function Section({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <div className="section-heading"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</div>
}
export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty"><Sprout size={23} /><p>{children}</p></div>
}
export function CategoryCard({ category, data, open }: { category: Category; data: Data; open: () => void }) {
  const entries = own(data, category.id)
  const value = progress(category, entries)
  return <button className="category-card" style={hue(category.color)} onClick={open}>
    <div className="category-top">
      <span className="category-icon"><Icon name={category.icon} /></span>
      <ArrowRight size={17} className="category-arrow" />
    </div>
    <h3>{category.name}</h3>
    <p>{category.goal || 'Set a goal at your own pace'}</p>
    <div className="category-progress"><Meter value={value} label={category.name + ' progress'} /><strong>{value}%</strong></div>
  </button>
}
export function NumberChange({ value }: { value: number }) {
  if (!value) return <span className="number-change">Unchanged</span>
  const Arrow = value > 0 ? ArrowUp : ArrowDown
  return <span className="number-change"><Arrow size={13} />{Math.abs(value)} pts</span>
}

export function Heatmap({ data, start, end, select }: { data: Data; start: string; end: string; select: (date: string) => void }) {
  const counts = new Map<string, number>()
  data.entries.forEach(entry => counts.set(entry.date, (counts.get(entry.date) ?? 0) + 1))
  const offset = (new Date(start + 'T12:00:00').getDay() + 6) % 7
  const base = shift(start, -offset)
  const weeks = Math.max(1, Math.ceil(((Date.parse(end) - Date.parse(base)) / 86400000 + 1) / 7))
  return <div className="heat-wrap"><div className="heatmap" style={{ gridTemplateColumns: 'repeat(' + weeks + ', 48px)' }}>
    {Array.from({ length: weeks * 7 }, (_, index) => {
      const date = shift(base, index)
      const count = counts.get(date) ?? 0
      const rest = data.rest.includes(date)
      if (date < start || date > end) return <div key={date} />
      return <button key={date} className={'heat-cell heat-' + Math.min(count, 4) + (rest ? ' rest' : '')} title={friendly(date) + (rest ? ' · planned rest' : ' · ' + count + ' check-ins')} aria-label={friendly(date) + ', ' + count + ' check-ins' + (rest ? ', planned rest' : '')} onClick={() => select(date)} />
    })}
  </div></div>
}

export function LineChart({ series, max = 100 }: { series: { label: string; values: (number | null)[]; color: string }[]; max?: number }) {
  const count = Math.max(...series.map(line => line.values.length))
  const width = 520
  const height = 154
  const x = (i: number) => 14 + i / Math.max(count - 1, 1) * (width - 28)
  const y = (n: number) => height - 12 - n / max * (height - 24)
  return <svg className="line-chart" viewBox={'0 0 ' + width + ' ' + height} role="img"
    aria-label={series.map(line => line.label + ': ' + line.values.map(value => value ?? 'no record').join(', ')).join('. ')}>
    {[0, .25, .5, .75, 1].map(fraction => <line key={fraction} x1="0" x2={width} y1={y(max * fraction)} y2={y(max * fraction)} stroke="var(--line)" strokeDasharray={fraction === 0 ? undefined : '3 6'} />)}
    {series.map(line => {
      const points = line.values.flatMap((value, index) => value === null ? [] : [[x(index), y(value), value]])
      return <g key={line.label}>
        <polyline points={points.map(([px, py]) => px + ',' + py).join(' ')} fill="none" stroke={line.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map(([px, py, value]) => <circle key={px} cx={px} cy={py} r="3.5" fill="var(--surface)" stroke={line.color} strokeWidth="2"><title>{line.label}: {value}</title></circle>)}
      </g>
    })}
  </svg>
}

export function Radar({ categories, data, end = day() }: { categories: Category[]; data: Data; end?: string }) {
  if (categories.length < 3) return <Empty>Add at least three categories for a radar comparison.</Empty>
  const coordinate = (index: number, amount: number) => {
    const angle = index / categories.length * Math.PI * 2 - Math.PI / 2
    return [120 + Math.cos(angle) * amount, 120 + Math.sin(angle) * amount]
  }
  const shape = (values: number[]) => values.map((value, index) => coordinate(index, value).join(',')).join(' ')
  const values = categories.map(category => progress(category, own(data, category.id), end))
  return <div className="radar-wrap">
    <svg viewBox="0 0 240 240" role="img" aria-label={categories.map((category, index) => category.name + ' ' + values[index] + '%').join(', ')}>
      {[25, 50, 75, 100].map(scale => <polygon key={scale} points={shape(categories.map(() => scale))} fill="none" stroke="var(--line)" />)}
      {categories.map((category, index) => {
        const [x, y] = coordinate(index, 100)
        return <line key={category.id} x1="120" y1="120" x2={x} y2={y} stroke="var(--line)" />
      })}
      <polygon points={shape(values)} fill="var(--primary-soft)" stroke="var(--primary)" strokeWidth="3" />
      {categories.map((category, index) => {
        const [x, y] = coordinate(index, values[index])
        return <circle key={category.id} cx={x} cy={y} r="4" fill={category.color}><title>{category.name} · {values[index]}%</title></circle>
      })}
    </svg>
    <ul className="legend">{categories.map((category, index) => <li key={category.id}><i style={hue(category.color)} />{category.name}<b>{values[index]}%</b></li>)}</ul>
  </div>
}

export function Matrix({ data, categories, start, end, previousStart, previousEnd, select }: {
  data: Data; categories: Category[]; start: string; end: string; previousStart: string; previousEnd: string; select: (id: string) => void;
}) {
  const plotted = categories.flatMap(category => {
    const entries = own(data, category.id)
    const patience = score(entries.filter(entry => entry.date >= start && entry.date <= end))
    const before = score(entries.filter(entry => entry.date >= previousStart && entry.date <= previousEnd))
    return patience === null ? [] : [{ category, patience, before, value: progress(category, entries, end), previous: progress(category, entries, previousEnd) }]
  })
  return <>
    <div className="matrix-container">
      <span className="axis-y">Progress</span>
      <div className="matrix">
        <div className="quadrant restlessness">Growing but restless</div><div className="quadrant sustainable">Sustainable growth</div>
        <div className="quadrant reset">Review and reset</div><div className="quadrant foundation">Building foundations</div>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {plotted.map(({ category, patience, before, value, previous }) => before === null ? null :
            <line key={category.id} x1={4 + before * .92} y1={96 - previous * .92} x2={4 + patience * .92} y2={96 - value * .92}
              stroke={category.color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeDasharray="4 4" />)}
        </svg>
        {plotted.map(({ category, patience, value }) =>
          <span key={category.id} className="matrix-point" style={{ ...hue(category.color), left: (4 + patience * .92) + '%', top: (96 - value * .92) + '%' }}
            title={category.name + ' · ' + value + '% progress · ' + patience + ' patience'}>
            <Icon name={category.icon} size={13} />
          </span>)}
      </div>
      <span className="axis-x">Patience</span>
    </div>
    {plotted.length ? <div className="tag-list">
      {plotted.map(({ category, patience, value, before, previous }) => <button key={category.id} className="tag" style={hue(category.color)}
        onClick={() => select(category.id)}><Icon name={category.icon} size={16} /><span>{category.name}<small>{value}% progress · {patience} patience{before !== null && ' · was ' + previous + '% / ' + before}</small></span></button>)}
    </div> : <Empty>Log how you felt to place a category on the matrix.</Empty>}
  </>
}

export function CategoryStats({ category, data }: { category: Category; data: Data }) {
  const entries = own(data, category.id)
  return <div className="detail-stats">
    <div><ChartNoAxesCombined size={18} /><strong>{progress(category, entries)}%</strong><span>Progress</span></div>
    <div><Flame size={18} /><strong>{consistency(category, entries, day(), data.rest) ?? '—'}{consistency(category, entries, day(), data.rest) !== null && '%'}</strong><span>7-day consistency</span></div>
    <div><Heart size={18} /><strong>{score(entries) ?? '—'}</strong><span>Patience</span></div>
  </div>
}
