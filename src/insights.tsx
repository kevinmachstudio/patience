import { useState } from 'react'
import { ArrowLeft, ArrowRight, CalendarDays, Flag, Flame, Heart, Shield, Sparkles } from 'lucide-react'
import {
  actions, active, average, badges, day, decisions, discipline, distance, friendly, moods, ordered, outcomes,
  own, progress, score, shift, uniqueDays, xp, type Data, type Entry,
} from './model'
import { Empty, Heatmap, hue, Icon, LineChart, Matrix, Meter, NumberChange, Radar, Section } from './ui'

const periods = [['Day', 1], ['Week', 7], ['Month', 30], ['Quarter', 90], ['Year', 365], ['All time', 0]] as const
function inRange<T extends { date: string }>(records: T[], start: string, end: string) {
  return records.filter(record => record.date >= start && record.date <= end)
}
function weekStart(date: string) {
  return shift(date, -(new Date(date + 'T12:00:00').getDay() + 6) % 7)
}
function scoreSeries(entries: Entry[], today: string, buckets: number, days: number) {
  return Array.from({ length: buckets }, (_, index) => {
    const end = shift(today, -(buckets - 1 - index) * days)
    return score(inRange(entries, shift(end, 1 - days), end))
  })
}

export function Insights({ data, today, onDay, onCategory }: { data: Data; today: string; onDay: (date: string) => void; onCategory: (id: string) => void }) {
  const [period, setPeriod] = useState<number>(30)
  const [periodBack, setPeriodBack] = useState(0)
  const earliest = [today, ...data.categories.map(category => category.start), ...data.entries.map(entry => entry.date), ...data.rest].sort()[0]
  const end = shift(today, -periodBack * period)
  const start = period ? shift(end, 1 - period) : earliest
  const previousEnd = shift(start, -1)
  const previousStart = shift(previousEnd, 1 - period)
  const entries = inRange(data.entries, start, end)
  const categories = active(data)
  const patience = score(entries)
  const currentDiscipline = discipline(entries)
  const ranked = categories.flatMap(category => {
    const value = score(entries.filter(entry => entry.category === category.id))
    return value === null ? [] : [{ name: category.name, value }]
  }).sort((a, b) => b.value - a.value)
  const { steady, impulsive } = decisions(entries)
  const count = Math.min(12, Math.max(1, distance(start, end) + 1))
  const length = Math.max(1, distance(start, end) + 1)
  const groupStart = (index: number) => shift(start, Math.floor(index * length / count))
  const groups = Array.from({ length: count }, (_, index) => ({ start: groupStart(index), end: shift(groupStart(index + 1), -1) }))
  const activity = groups.map(group => inRange(entries, group.start, group.end).length)
  const overall = (date: string) => average(categories.filter(category => category.start <= date).map(category => progress(category, own(data, category.id), date)))
  const growth = groups.map(group => overall(group.end))
  const first = overall(start)
  const last = overall(end)
  const compare = first !== null && last !== null ? last - first : null
  const ribbons = badges.filter(item => data.awards.includes(item.id))
  const longestHeatmap = shift(end, -363)
  const best = ranked[0]
  const worst = ranked.at(-1)
  return <>
    <header className="page-head"><div><div className="date-kicker">Patterns over time</div><h1>See what’s <em>changing.</em></h1><p>Track your feelings and actions side by side.</p></div></header>
    <div className="toolbar range-toolbar">
      <div className="segmented range-control" aria-label="Reporting period">{periods.map(([name, n]) => <button key={n} aria-pressed={period === n} onClick={() => { setPeriod(n); setPeriodBack(0) }}>{name}</button>)}</div>
      <div className="date-pager"><button className="icon-button" aria-label="Previous period" disabled={!period || start <= earliest} onClick={() => setPeriodBack(periodBack + 1)}><ArrowLeft size={17} /></button>
        <span>{friendly(start)}{start !== end && ' – ' + friendly(end, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        <button className="icon-button" aria-label="Next period" disabled={!periodBack} onClick={() => setPeriodBack(periodBack - 1)}><ArrowRight size={17} /></button></div>
    </div>
    <div className="insight-grid">
      <section className="panel insight-score patience-tile"><Heart size={22} /><div><h2>Patience</h2><p>Emotions in the selected period</p></div><strong>{patience ?? '—'}</strong></section>
      <section className="panel insight-score discipline-tile"><Shield size={22} /><div><h2>Discipline</h2><p>Actions in the selected period</p></div><strong>{currentDiscipline ?? '—'}</strong></section>
      <section className="panel"><Section title="Patience trend" description="Emotional check-ins through the selected end date" />
        {data.entries.some(entry => entry.date <= end && entry.date >= shift(end, -29)) ? <>
          <LineChart series={[{ label: 'Daily patience, last seven days', color: 'var(--primary)', values: scoreSeries(data.entries, end, 7, 1) }]} />
          <div className="chart-labels"><span>{friendly(shift(end, -6))}</span><span>Weekly view</span><span>{friendly(end)}</span></div>
          <LineChart series={[{ label: 'Five-day averages, last 30 days', color: 'var(--sage)', values: scoreSeries(data.entries, end, 6, 5) }]} />
          <div className="chart-labels"><span>{friendly(shift(end, -29))}</span><span>Monthly view</span><span>{friendly(end)}</span></div>
        </> : <Empty>Log your feelings to see changes in patience over time.</Empty>}
      </section>
      <section className="panel"><Section title="Process signals" description="Based on the check-ins in this period" />
        <dl className="stats-list">
          <div><dt>Most patient</dt><dd>{best ? best.name + ' · ' + best.value : '—'}</dd></div>
          <div><dt>Least patient</dt><dd>{worst && ranked.length > 1 ? worst.name + ' · ' + worst.value : '—'}</dd></div>
          <div><dt>Disciplined actions</dt><dd>{steady}</dd></div>
          <div><dt>Impulsive decisions</dt><dd>{impulsive}</dd></div>
          <div><dt>Days you trusted the process</dt><dd>{uniqueDays(entries.filter(entry => entry.actions.includes(actions[5])))}</dd></div>
          <div><dt>Days you felt behind</dt><dd>{uniqueDays(entries.filter(entry => entry.actions.includes(actions[8])))}</dd></div>
        </dl>
      </section>
      <section className="panel span-two"><Section title="Consistency heatmap" description="Number of check-ins per day. Select a day to view it." />
        <Heatmap data={data} start={start > longestHeatmap ? start : longestHeatmap} end={end} select={onDay} />
        <div className="heat-legend"><span>Fewer</span>{[0, 1, 2, 3, 4].map(n => <i key={n} className={'heat-' + n} />)}<span>More</span><i className="rest" /><span>Planned rest</span></div>
      </section>
      <section className="panel"><Section title="Check-in activity" description="Check-ins by date group" />
        <div className="bars" role="img" aria-label={activity.map((n, i) => friendly(groups[i].start) + ': ' + n + ' check-ins').join(', ')}>
          {activity.map((n, i) => <div className="bar-slot" key={groups[i].start} title={friendly(groups[i].start) + ' to ' + friendly(groups[i].end) + ' · ' + n + ' check-ins'}>
            <span style={{ height: (n / Math.max(1, ...activity) * 100) + '%' }} />{(i === 0 || i === count - 1 || count <= 4) && <small>{friendly(groups[i].start)}</small>}</div>)}</div>
      </section>
      <section className="panel"><Section title="Goal growth" description="Average progress across started categories" />
        <LineChart series={[{ label: 'Average goal progress', color: 'var(--primary)', values: growth }]} />
        {first !== null && last !== null ? <div className="before-after"><span>{friendly(start)} <b>{first}%</b></span><NumberChange value={compare!} /><span>{friendly(end)} <b>{last}%</b></span></div> : <Empty>Set goals and record progress to compare dates.</Empty>}
      </section>
      <section className="panel span-two"><Section title="Life balance" description={'Category progress as of ' + friendly(end)} /><Radar categories={categories} data={data} end={end} /></section>
      <section className="panel span-two"><Section title="Progress and patience" description={period ? 'Dotted lines connect categories to their position in the previous period.' : 'Category progress and average patience across all recorded check-ins.'} />
        <Matrix data={data} categories={categories} start={start} end={end} previousStart={previousStart} previousEnd={previousEnd} select={onCategory} />
      </section>
      <section className="panel span-two"><Weekly data={data} today={today} /></section>
      <section className="panel span-two">
        <Section title="Personal growth" description={ribbons.length + ' of ' + badges.length + ' badges collected'} action={<span className="xp-badge"><Sparkles size={17} /> Level {Math.floor(xp(data) / 100) + 1}</span>} />
        <p className="muted">{xp(data)} XP earned · {100 - xp(data) % 100} XP until the next level</p>
        <Meter value={xp(data) % 100} label="Progress to next level" />
        <div className="badge-grid">{badges.map(item => <div className={'award-card ' + (data.awards.includes(item.id) ? 'earned' : '')} key={item.id}>
          <span className="award-icon"><Icon name={item.icon} size={24} /></span><b>{item.label}</b><small>{data.awards.includes(item.id) ? 'Earned' : item.detail}</small>
        </div>)}</div>
      </section>
    </div>
  </>
}

function Weekly({ data, today }: { data: Data; today: string }) {
  const [back, setBack] = useState(0)
  const start = shift(weekStart(today), -back * 7)
  const end = back === 0 ? today : shift(start, 6)
  const firstRecord = [...data.entries.map(entry => entry.date), ...data.pauses.map(pause => day(new Date(pause.created))), today].sort()[0]
  const entries = inRange(data.entries, start, end)
  const previous = inRange(data.entries, shift(start, -7), shift(end, -7))
  const categories = active(data).filter(category => category.start <= end)
  const attention = categories.filter(category => !entries.some(entry => entry.category === category.id))
  const { steady, impulsive, reactive } = decisions(entries)
  const compared = entries.filter(entry => entry.actions.includes(actions[2])).length
  const paused = data.pauses.filter(pause => {
    const date = day(new Date(pause.created))
    return date >= start && date <= end
  })
  const triggers = [...new Set(paused.map(pause => pause.answers[2]))]
  const wins = ordered(entries).filter(entry => entry.accomplishment).map(entry => entry.accomplishment)
  const weekStartValue = (category: (typeof categories)[number]) => progress(category, own(data, category.id), shift(start, -1))
  const changes = categories.filter(category => category.start < start).map(category => ({ name: category.name,
    delta: progress(category, own(data, category.id), end) - weekStartValue(category) }))
  const improved = changes.filter(item => item.delta > 0)
  const unchanged = changes.filter(item => item.delta === 0)
  const down = changes.filter(item => item.delta < 0)
  const currentMood = score(entries)
  const previousMood = score(previous)
  const currentAction = discipline(entries)
  const previousAction = discipline(previous)
  return <>
    <Section title="Weekly reflection" description={friendly(start) + ' – ' + friendly(end) + (back ? '' : ' · in progress')}
      action={<div className="date-pager"><button className="icon-button" aria-label="Previous week" disabled={start <= firstRecord} onClick={() => setBack(back + 1)}><ArrowLeft size={17} /></button>
        <button className="icon-button" aria-label="Next week" disabled={!back} onClick={() => setBack(back - 1)}><ArrowRight size={17} /></button></div>} />
    {!entries.length && !paused.length && !improved.length && !down.length ? <Empty>No recorded activity for this week yet.</Empty> :
      <div className="reflection-grid">
        <div><h3>What changed</h3><p>{improved.length ? improved.map(item => item.name + ' +' + item.delta + ' pts').join(', ') : 'No goal progress increases recorded.'}</p>
          {down.length > 0 && <p>{down.map(item => item.name + ' ' + item.delta + ' pts').join(', ')}</p>}
          <p>{unchanged.length ? unchanged.map(item => item.name).join(', ') + ' stayed steady.' : 'No unchanged goals with a prior baseline.'}</p></div>
        <div><h3>How you responded</h3><p>{steady} disciplined actions · {impulsive} impulsive decisions · {reactive - impulsive} emotional plan changes · {compared} comparisons.</p>
          {triggers.length > 0 && <p>Recorded pause triggers were {triggers.join(', ').toLowerCase()}.</p>}</div>
        <div><h3>Compared with last week</h3>
          {currentMood === null || previousMood === null ? <p>Patience needs check-ins in both weeks to compare.</p> : <p>Patience moved from {previousMood} to {currentMood}.</p>}
          {currentAction === null || previousAction === null ? <p>Discipline needs behavioral records in both weeks to compare.</p> : <p>Discipline moved from {previousAction} to {currentAction}.</p>}</div>
        <div><h3>Accomplishments</h3>{wins.length ? <ul>{wins.map((win, index) => <li key={index}>{win}</li>)}</ul> : <p>No accomplishments recorded.</p>}</div>
        <div><h3>Areas without a check-in</h3><p>{attention.length ? attention.map(category => category.name).join(', ') : 'Every active area had a check-in.'}</p></div>
        <div><h3>One focus for next week</h3><p>{impulsive ? 'Use a cooling-off timer before your next decision that feels urgent.' :
          attention.length ? 'Try one small action for ' + attention[0].name + '.' : 'Repeat one action that helped you follow your plan.'}</p></div>
      </div>}
  </>
}

export function Timeline({ data, today, onCheck, onCategory, onPause, onRest }: {
  data: Data; today: string; onCheck: (date: string, category?: string) => void; onCategory: (id: string) => void;
  onPause: () => void; onRest: (date: string) => void;
}) {
  const [selected, setSelected] = useState(today)
  const [month, setMonth] = useState(today.slice(0, 7) + '-01')
  const [selectedCategory, setCategory] = useState('')
  const move = (delta: number) => {
    const date = new Date(month + 'T12:00:00')
    date.setMonth(date.getMonth() + delta)
    setMonth(day(date))
  }
  const entries = data.entries.filter(entry => entry.date === selected)
  const names = new Map(data.categories.map(category => [category.id, category.name]))
  const milestones = data.categories.filter(category => !selectedCategory || category.id === selectedCategory).flatMap(category =>
    category.milestones.map(item => ({ ...item, category }))).sort((a, b) => (a.done || a.date || '9999').localeCompare(b.done || b.date || '9999'))
  const base = weekStart(month)
  const rest = data.rest.includes(selected)
  return <>
    <header className="page-head"><div><div className="date-kicker">A longer view</div><h1>Your <em>timeline.</em></h1><p>Look back at the days, decisions and milestones that shaped your progress.</p></div>
      <button className="button pause-button" onClick={onPause}>Cooling-off journal</button></header>
    <div className="insight-grid">
      <section className="panel">
        <Section title={friendly(month, { month: 'long', year: 'numeric' })} action={<div className="date-pager">
          <button className="icon-button" aria-label="Previous month" onClick={() => move(-1)}><ArrowLeft size={18} /></button>
          <button className="icon-button" aria-label="Next month" onClick={() => move(1)}><ArrowRight size={18} /></button>
        </div>} />
        <div className="calendar">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(label => <span key={label}>{label}</span>)}
          {Array.from({ length: 42 }, (_, index) => {
            const date = shift(base, index)
            const count = data.entries.filter(entry => entry.date === date).length
            const rest = data.rest.includes(date)
            const inMonth = date.slice(0, 7) === month.slice(0, 7)
            return <button className={(inMonth ? '' : 'outside ') + (date === today ? 'today' : '')} key={date} aria-pressed={date === selected}
              aria-label={friendly(date, { month: 'long', day: 'numeric', year: 'numeric' }) + ' · ' + count + ' check-ins' + (rest ? ' · planned rest' : '')}
              onClick={() => { setSelected(date); if (!inMonth) setMonth(date.slice(0, 7) + '-01') }}>
              {Number(date.slice(-2))}<i className={rest ? 'rest' : count ? 'has-data' : ''} /></button>
          })}</div>
      </section>
      <section className="panel">
        <Section title={friendly(selected, { weekday: 'long', month: 'short', day: 'numeric' })} description={rest ? 'Planned rest day' : entries.length + ' check-ins'} />
        {entries.map((entry: Entry) => <button key={entry.id} className="record-row history-button" onClick={() => onCheck(selected, entry.category)}>
          <span>{moods[entry.mood].icon}</span><div><b>{names.get(entry.category)}</b><small>{outcomes[entry.outcome]} · {moods[entry.mood].name}</small></div><ArrowRight size={17} />
        </button>)}
        {!entries.length && <Empty>{selected > today ? 'Upcoming day.' : 'No check-ins recorded.'}</Empty>}
        <div className="toolbar">
          {selected <= today && <button className="button primary" onClick={() => onCheck(selected)}><CalendarDays size={17} /> Open check-in</button>}
          <button className="button secondary" aria-pressed={rest} onClick={() => onRest(selected)}>{rest ? 'Remove rest' : 'Plan rest'}</button>
        </div>
      </section>
      <section className="panel span-two">
        <Section title="Milestone timeline" action={<select className="filter-select" value={selectedCategory} aria-label="Filter milestones by category" onChange={event => setCategory(event.target.value)}>
          <option value="">All categories</option>{data.categories.map(category => <option value={category.id} key={category.id}>{category.name}</option>)}</select>} />
        {!milestones.length ? <Empty>Add milestones to your categories to see them here.</Empty> : milestones.map(item =>
          <button className="record-row history-button" style={hue(item.category.color)} key={item.category.id + ':' + item.id} onClick={() => onCategory(item.category.id)}>
            <span className="category-icon">{item.done ? <Flame size={19} /> : <Flag size={19} />}</span>
            <div><b>{item.text}</b><small>{item.category.name} · {item.done ? 'Completed ' + friendly(item.done) : item.date ? 'Due ' + friendly(item.date) : 'Unscheduled'}</small></div><ArrowRight size={17} />
          </button>)}
      </section>
    </div>
  </>
}
