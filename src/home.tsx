import { ArrowRight, CalendarDays, Clock3, Flame, Heart, Plus, Shield, Sparkles, Sprout, Zap } from 'lucide-react'
import { active, average, day, discipline, friendly, own, progress, reminders, score, streak, type Data } from './model'
import { CategoryCard, Empty, Ring, Section } from './ui'

type HomeProps = {
  data: Data; today: string; onCheck: () => void; onPause: () => void; onCategories: () => void;
  onInsights: () => void; onCategory: (id: string) => void; onCreate: () => void; onRest: () => void;
}
export function Home({ data, today, onCheck, onPause, onCategories, onInsights, onCategory, onCreate, onRest }: HomeProps) {
  const list = active(data)
  const entries = data.entries.filter(entry => entry.date === today)
  const current = average(list.map(category => progress(category, own(data, category.id), today)))
  const patience = score(entries)
  const action = discipline(entries)
  const rest = data.rest.includes(today)
  const count = list.filter(category => entries.some(entry => entry.category === category.id)).length
  const streakDays = streak(data, today)
  const reminder = reminders[Math.abs(Math.floor(new Date(today + 'T12:00:00Z').valueOf() / 86400000)) % reminders.length]
  return <>
    <header className="page-head home-head">
      <div><div className="date-kicker"><CalendarDays size={15} />{friendly(today, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
        <h1>The art of <em>becoming.</em></h1><p>Small steps build the life you want.</p></div>
      <button className="button pause-button" onClick={onPause}><Zap size={17} /> I’m Feeling Impatient</button>
    </header>
    <div className="home-layout">
      <div className="home-main">
        <section className="hero">
          <div className="hero-copy">
            <span className="hero-label"><Sparkles size={15} /> The big picture</span>
            <h2>Overall progress</h2>
            <p>Be ambitious about the destination, patient with the timeline, and disciplined about today’s actions.</p>
            <button className="button hero-button" onClick={onCheck}><Plus size={19} /> Daily check-in</button>
          </div>
          <div className="hero-graphic">
            <svg className="orbit" viewBox="0 0 300 300" fill="none" aria-hidden="true">
              <circle cx="150" cy="150" r="113" /><circle cx="150" cy="150" r="137" /><circle cx="150" cy="150" r="94" strokeDasharray="2 6" />
              <circle cx="150" cy="13" r="3.5" className="planet" /><circle cx="264" cy="149" r="5" className="planet light" />
              <path className="star" d="M72 36q0 12 12 12-12 0-12 12 0-12-12-12 12 0 12-12ZM239 231q0 10 10 10-10 0-10 10 0-10-10-10 10 0 10-10ZM48 187q0 6 6 6-6 0-6 6 0-6-6-6 6 0 6-6Z" />
            </svg>
            <Ring className="hero-ring" value={current} size={184} />
            <span className="hero-ring-label">OF LIFE GOALS</span>
          </div>
        </section>
        <section className="life-section">
          <Section title="Life areas" description="Give each area the time it needs."
            action={<button className="text-button" onClick={onCategories}>All categories <ArrowRight size={17} /></button>} />
          {list.length ? <div className="category-grid">{list.slice(0, 6).map(category =>
            <CategoryCard category={category} data={data} key={category.id} open={() => onCategory(category.id)} />)}</div>
            : <div className="panel"><Empty>Create a category to set your first goal.</Empty><button className="button primary" onClick={onCreate}><Plus size={18} /> New category</button></div>}
        </section>
      </div>
      <aside className="home-side">
        <section className="panel today-panel">
          <Section title="Today’s practice" action={<button className="icon-button" aria-label="Open insights" onClick={onInsights}><ArrowRight size={18} /></button>} />
          <div className="score-stack">
            <div className="score-tile patience-tile"><span className="score-icon"><Heart size={19} /></span><div><b>Patience</b><small>How you felt</small></div><Ring value={patience} size={54} label={patience === null ? 'No patience score' : 'Patience ' + patience + ' out of 100'} /></div>
            <div className="score-tile discipline-tile"><span className="score-icon"><Shield size={19} /></span><div><b>Discipline</b><small>How you acted</small></div><Ring value={action} size={54} label={action === null ? 'No discipline score' : 'Discipline ' + action + ' out of 100'} /></div>
          </div>
          <div className="today-footer"><span><Flame size={16} /> {streakDays} {streakDays === 1 ? 'day' : 'days'} in a row</span><span>{count}/{list.length} checked in</span></div>
        </section>
        <section className="prompt-card">
          <div className="quote-decor" aria-hidden="true">“</div>
          <span className="prompt-label"><Sprout size={16} /> A little perspective</span>
          <p>{reminder}</p>
        </section>
        <button className="rest-card" aria-pressed={rest} onClick={onRest}>
          <span className="score-icon"><Clock3 size={19} /></span><span><b>{rest ? 'Today is a rest day' : 'Plan a rest day'}</b><small>{rest ? 'Tap to remove planned rest' : 'Make room to recharge'}</small></span>
          <ArrowRight size={17} />
        </button>
      </aside>
    </div>
  </>
}
