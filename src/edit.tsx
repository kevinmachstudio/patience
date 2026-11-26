import { useState, type FormEvent } from 'react'
import { ArrowDown, ArrowUp, Archive, Check, ChevronLeft, ChevronRight, Flag, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react'
import {
  actions, blankCategory, day, distance, friendly, glyphs, horizonLabels, horizons, metrics, moods,
  ordered, outcomes, own, palette, progress, shift, uid, type Category, type Data, type Entry,
} from './model'
import { useDraft } from './draft'
import { CategoryCard, CategoryStats, Empty, hue, Icon, Meter, Section } from './ui'

export function Categories({ data, onOpen, onCreate, onReorder }: { data: Data; onOpen: (id: string) => void; onCreate: () => void; onReorder: (id: string, delta: number) => void }) {
  const [archive, setArchive] = useState(false)
  const [sorting, setSorting] = useState(false)
  const list = data.categories.filter(category => category.archived === archive)
  return <>
    <header className="page-head"><div><div className="date-kicker">Your goals</div><h1>Life <em>areas.</em></h1><p>Define what progress looks like in each part of your life.</p></div>
    <button className="button primary" onClick={onCreate}><Plus size={20} /> New category</button></header>
    <div className="toolbar">
      <div className="segmented" aria-label="Category status">
        <button aria-pressed={!archive} onClick={() => setArchive(false)}>Active</button>
        <button aria-pressed={archive} onClick={() => setArchive(true)}>Archived</button>
      </div>
      <button className="button secondary" aria-pressed={sorting} onClick={() => setSorting(!sorting)}>{sorting ? 'Done reordering' : 'Reorder'}</button>
    </div>
    {list.length === 0 ? <Empty>{archive ? 'Archived categories will appear here.' : 'Add a category to get started.'}</Empty> :
      <div className="category-grid full-grid">{list.map((category, index) => <div className="category-order" key={category.id}>
        <CategoryCard category={category} data={data} open={() => onOpen(category.id)} />
        {sorting && <div className="sort-controls">
          <button className="icon-button" disabled={!index} aria-label={'Move ' + category.name + ' earlier'} onClick={() => onReorder(category.id, -1)}><ArrowUp size={19} /></button>
          <button className="icon-button" disabled={index === list.length - 1} aria-label={'Move ' + category.name + ' later'} onClick={() => onReorder(category.id, 1)}><ArrowDown size={19} /></button>
        </div>}
      </div>)}</div>}
  </>
}

export function CategoryForm({ category, draftKey, onSave, onCancel }: { category?: Category; draftKey: string; onSave: (category: Category) => void; onCancel: () => void }) {
  const [draft, setDraft, clearDraft] = useDraft(draftKey, () => category ?? blankCategory())
  const [error, setError] = useState('')
  const set = <K extends keyof Category>(key: K, value: Category[K]) => setDraft(previous => ({ ...previous, [key]: value }))
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft.name.trim()) return setError('Enter a category name.')
    if (draft.targetDate < draft.start) return setError('Pick a target date on or after the start date.')
    if (draft.metric === 'Numerical target' && draft.baseline === draft.target) return setError('Enter a target that differs from the starting value.')
    const recordValue = !category || category.current !== draft.current || category.metric !== draft.metric || category.start !== draft.start
    clearDraft()
    onSave({ ...draft, name: draft.name.trim(), history: recordValue ?
      [...draft.history.filter(item => item.date !== day()), { date: day(), value: draft.current }] : draft.history })
  }
  return <form className="form-stack" onSubmit={submit}>
    <label>Category name<input value={draft.name} onChange={event => set('name', event.target.value)} required maxLength={70} autoFocus /></label>
    <fieldset><legend>Icon</legend><div className="option-grid glyph-grid">{glyphs.map(icon =>
      <button key={icon} type="button" className="choice" aria-label={icon} aria-pressed={draft.icon === icon} onClick={() => set('icon', icon)}><Icon name={icon} /></button>)}</div></fieldset>
    <fieldset><legend>Color</legend><div className="option-grid glyph-grid">{palette.map((color, index) =>
      <button key={color} type="button" className="choice swatch" style={hue(color)} aria-label={['Green','Blue','Red','Purple','Orange','Cyan','Pink','Gold','Olive','Coral'][index]} aria-pressed={draft.color === color} onClick={() => set('color', color)}>{draft.color === color && <Check size={17} />}</button>)}</div></fieldset>
    <label>Goal<input value={draft.goal} onChange={event => set('goal', event.target.value)} placeholder="Where do you want to be?" /></label>
    <label>Starting point<textarea rows={2} value={draft.origin} onChange={event => set('origin', event.target.value)} placeholder="Where are you starting from?" /></label>
    <label>Next action<input value={draft.next} onChange={event => set('next', event.target.value)} placeholder="What can you do next?" /></label>
    <div className="form-grid">
      <label>Start date<input type="date" value={draft.start} max={day()} required onChange={event => set('start', event.target.value)} /></label>
      <label>Target date<input type="date" value={draft.targetDate} min={draft.start} required onChange={event => set('targetDate', event.target.value)} /></label>
    </div>
    <fieldset><legend>Goal horizon</legend><div className="chips">{horizons.map((days, index) => <button key={days} type="button" className="choice"
      aria-pressed={draft.targetDate === shift(draft.start, days)} onClick={() => set('targetDate', shift(draft.start, days))}>{horizonLabels[index]}</button>)}</div></fieldset>
    <label>How to measure progress<select value={draft.metric} onChange={event => set('metric', event.target.value as Category['metric'])}>{metrics.map(metric => <option key={metric}>{metric}</option>)}</select></label>
    {(draft.metric === 'Numerical target' || draft.metric === 'Percentage') && <div className="form-grid">
      <label>{draft.metric === 'Percentage' ? 'Starting progress (%)' : 'Starting value'}<input type="number" step="any" value={draft.baseline} min={draft.metric === 'Percentage' ? 0 : undefined} max={draft.metric === 'Percentage' ? 100 : undefined} required onChange={event => set('baseline', event.target.valueAsNumber || 0)} /></label>
      <label>{draft.metric === 'Percentage' ? 'Current progress (%)' : 'Current value'}<input type="number" step="any" value={draft.current} min={draft.metric === 'Percentage' ? 0 : undefined} max={draft.metric === 'Percentage' ? 100 : undefined} required onChange={event => set('current', event.target.valueAsNumber || 0)} /></label>
      {draft.metric === 'Numerical target' && <label>Target value<input type="number" step="any" value={draft.target} required onChange={event => set('target', event.target.valueAsNumber || 0)} /></label>}
    </div>}
    {draft.metric === 'Consistency' && <label>Number of active days<input type="number" min="1" value={draft.target} required onChange={event => set('target', event.target.valueAsNumber || 0)} /></label>}
    {error && <div className="error" role="alert">{error}</div>}
    <div className="form-actions"><button type="button" className="button secondary" onClick={() => { clearDraft(); onCancel() }}>Cancel</button><button className="button primary" type="submit"><Check size={18} /> Save category</button></div>
  </form>
}

export function CategoryDetail({ category, data, onEdit, onArchive, onDelete, onUpdate, onCheck }: {
  category: Category; data: Data; onEdit: () => void; onArchive: () => void; onDelete: () => void;
  onUpdate: (category: Category) => void; onCheck: (id?: string) => void;
}) {
  const [milestone, setMilestone] = useState<{id: string; text: string; date: string; done: string} | null>(null)
  const today = day()
  const entries = ordered(own(data, category.id))
  const wins = entries.filter(entry => entry.accomplishment)
  const value = progress(category, entries)
  const elapsed = distance(category.start, today)
  const remaining = distance(today, category.targetDate)
  const overdue = category.milestones.filter(item => !item.done && item.date && item.date < today).length
  const timed = category.milestones.some(item => item.date)
  const pace = value === 100 ? 'Goal reached' : overdue ? overdue + ' overdue' : remaining < 0 ? 'Goal date passed' : timed ? 'On pace' : 'Set dated milestones'
  return <div className="detail-view" style={hue(category.color)}>
    <div className="detail-cover"><span className="category-icon"><Icon name={category.icon} size={24} /></span><p>{category.goal || 'Set a goal for this area.'}</p>
      <div className="toolbar"><button className="button primary" onClick={() => onCheck()}><Plus size={18} /> Check in</button>
        <button className="button secondary" onClick={onEdit}><Pencil size={17} /> Edit category</button></div>
    </div>
    <CategoryStats data={data} category={category} />
    <div className="panel"><Section title="Your trajectory" description={pace} />
      <Meter value={value} label="Goal progress" />
      <div className="trajectory">
        <div><b>Started {friendly(category.start)}</b><p>{category.origin || 'Starting point can be added in settings.'}</p></div>
        <div><b>Today · {value}%</b><p>{Math.max(0, elapsed)} days elapsed. {remaining < 0 ? Math.abs(remaining) + ' days past target' : remaining + ' days remaining'}.</p></div>
        <div><b>Target · {friendly(category.targetDate, { day: 'numeric', month: 'short', year: 'numeric' })}</b><p>{category.goal || 'Goal details can be added in settings.'}</p></div>
      </div>
      <p className="detail-next"><strong>Next action</strong> {category.next || 'Add a next action to your category.'}</p>
    </div>
    <div className="panel"><Section title="Milestones" action={<button className="icon-button" aria-label="Add milestone" onClick={() => setMilestone({ id: uid(), text: '', date: '', done: '' })}><Plus size={20} /></button>} />
      {milestone && <form className="form-stack milestone-form" onSubmit={event => {
        event.preventDefault()
        if (!milestone.text.trim()) return
        const item = { ...milestone, text: milestone.text.trim() }
        onUpdate({ ...category, milestones: category.milestones.some(m => m.id === item.id) ?
          category.milestones.map(m => m.id === item.id ? item : m) : [...category.milestones, item] })
        setMilestone(null)
      }}>
        <label>Milestone<input autoFocus required value={milestone.text} onChange={event => setMilestone({ ...milestone, text: event.target.value })} /></label>
        <label>Target date (optional)<input type="date" value={milestone.date} onChange={event => setMilestone({ ...milestone, date: event.target.value })} /></label>
        <div className="form-actions"><button className="button secondary" type="button" onClick={() => setMilestone(null)}>Cancel</button><button className="button primary">Save milestone</button></div>
      </form>}
      {category.milestones.length === 0 && !milestone && <Empty>Add a milestone to mark a step along the way.</Empty>}
      {category.milestones.map(item => <div className="record-row" key={item.id}>
        <button type="button" aria-label={(item.done ? 'Reopen ' : 'Complete ') + item.text} aria-pressed={!!item.done} className="icon-button milestone-toggle"
          onClick={() => onUpdate({ ...category, milestones: category.milestones.map(m => m.id === item.id ? { ...m, done: m.done ? '' : today } : m) })}>{item.done ? <Check size={19} /> : <Flag size={18} />}</button>
        <div><b>{item.text}</b><small>{item.done ? 'Completed ' + friendly(item.done) : item.date ? 'Due ' + friendly(item.date) : 'No due date'}</small></div>
        <button className="icon-button" type="button" aria-label={'Edit ' + item.text} onClick={() => setMilestone(item)}><Pencil size={17} /></button>
        <button className="icon-button" type="button" aria-label={'Remove ' + item.text} onClick={() => onUpdate({ ...category, milestones: category.milestones.filter(m => m.id !== item.id) })}><Trash2 size={17} /></button>
      </div>)}
    </div>
    <div className="panel"><Section title="Recent accomplishments" />{wins.length ? <ul className="record-list">{wins.slice(0, 6).map(entry =>
      <li key={entry.id}><b>{entry.accomplishment}</b><small>{friendly(entry.date)}</small></li>)}</ul> : <Empty>Record an accomplishment during check-in.</Empty>}</div>
    <div className="panel"><Section title="Check-in history" />{entries.length ? entries.map(entry => <button key={entry.id} className="record-row history-button" onClick={() => onCheck(entry.id)}>
      <span>{moods[entry.mood].icon}</span><div><b>{friendly(entry.date)} · {outcomes[entry.outcome]}</b><small>{moods[entry.mood].name}{entry.note && ' · ' + entry.note}</small></div><ChevronRight size={17} /></button>) : <Empty>Your check-ins will appear here.</Empty>}</div>
    <div className="toolbar"><button className="button secondary" onClick={onArchive}>{category.archived ? <RotateCcw size={17} /> : <Archive size={17} />}{category.archived ? 'Restore category' : 'Archive category'}</button>
      <button className="button danger" onClick={onDelete}><Trash2 size={17} /> Delete category</button></div>
  </div>
}

export function CheckForm({ category, entry, date, draftKey, onSave, onBack, onDelete }: { category: Category; entry?: Entry; date: string; draftKey: string; onSave: (entry: Entry) => void; onBack?: () => void; onDelete?: () => void }) {
  const [draft, change, clearDraft] = useDraft(draftKey, () => ({
    outcome: entry?.outcome ?? null, mood: entry?.mood ?? null, behavior: entry?.actions ?? [],
    note: entry?.note ?? '', win: entry?.accomplishment ?? '', value: entry?.value?.toString() ?? '',
    details: Boolean(entry?.note || entry?.accomplishment || entry?.value !== undefined),
  }))
  const { outcome, mood, behavior, note, win, value, details } = draft
  const set = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) =>
    change(previous => ({ ...previous, [key]: value }))
  return <form className="form-stack check-form" onSubmit={event => {
    event.preventDefault()
    if (outcome === null || mood === null) return
    clearDraft()
    onSave({ id: entry?.id ?? uid(), category: category.id, date, outcome, mood, actions: behavior,
      note: note.trim(), accomplishment: win.trim(), value: value === '' ? undefined : Number(value) })
  }}>
    <div className="check-category" style={hue(category.color)}>
      <span className="category-icon"><Icon name={category.icon} /></span><div><b>{category.name}</b><small>{friendly(date, { weekday: 'long', month: 'long', day: 'numeric' })}</small></div>
      {onBack && <button type="button" className="button secondary" onClick={onBack}><ChevronLeft size={17} /> Change</button>}
    </div>
    <fieldset><legend>How did it go?</legend><div className="option-grid outcomes">{outcomes.map((text, index) =>
      <button key={text} type="button" className="choice big-choice" aria-pressed={outcome === index} onClick={() => set('outcome', index)}><span>{['🚀', '🌱', '💤'][index]}</span>{text}</button>)}</div></fieldset>
    <fieldset><legend>How did it feel?</legend><div className="option-grid moods">{[...moods].reverse().map((item, index) =>
      <button key={item.name} type="button" className="choice big-choice" aria-pressed={mood === 4 - index} onClick={() => set('mood', 4 - index)}><span>{item.icon}</span>{item.name}</button>)}</div></fieldset>
    <fieldset><legend>What did you do? <small>Optional</small></legend><div className="chips">{actions.map(action =>
      <button key={action} type="button" className="choice" aria-pressed={behavior.includes(action)} onClick={() => set('behavior',
        behavior.includes(action) ? behavior.filter(item => item !== action) : [...behavior, action])}>{action}</button>)}</div></fieldset>
    <button type="button" className="text-button details-button" aria-expanded={details} onClick={() => set('details', !details)}><Plus size={17} />{details ? 'Hide optional details' : 'Add a note, accomplishment or progress'}</button>
    {details && <div className="form-stack optional-fields">
      <label>Optional note<textarea rows={2} value={note} onChange={event => set('note', event.target.value)} /></label>
      <label>Accomplishment<input value={win} onChange={event => set('win', event.target.value)} /></label>
      {(category.metric === 'Percentage' || category.metric === 'Numerical target') && <label>{category.metric === 'Percentage' ? 'Updated progress (%)' : 'Updated value'}
        <input type="number" step="any" min={category.metric === 'Percentage' ? 0 : undefined} max={category.metric === 'Percentage' ? 100 : undefined} value={value} onChange={event => set('value', event.target.value)} /></label>}
    </div>}
    <div className="form-actions">
      {onDelete && <button type="button" className="button danger" onClick={onDelete}><Trash2 size={17} /> Delete check-in</button>}
      <button className="button primary" disabled={outcome === null || mood === null}><Check size={18} /> {entry ? 'Save changes' : 'Save check-in'}</button>
    </div>
  </form>
}

export function CheckPage({ data, date, onDate, onSelect, onRest }: { data: Data; date: string; onDate: (date: string) => void; onSelect: (id: string) => void; onRest: () => void }) {
  const set = data.categories.filter(c => !c.archived || data.entries.some(e => e.category === c.id && e.date === date))
  const checkIns = data.entries.filter(e => e.date === date)
  const rest = data.rest.includes(date)
  return <>
    <header className="page-head"><div><div className="date-kicker">Daily practice</div><h1>Check <em>in.</em></h1><p>Capture what you did and how it felt.</p></div></header>
    <div className="toolbar"><label className="date-control">Check-in date<input type="date" max={day()} value={date} required onChange={event => event.target.value && onDate(event.target.value)} /></label>
      <button className="button secondary" aria-pressed={rest} onClick={onRest}>{rest ? 'Remove planned rest' : 'Mark planned rest'}</button></div>
    <div className="panel check-select"><Section title="Choose a category" description={checkIns.length + ' logged for ' + friendly(date)} />
      {set.length ? <div className="check-list">{set.map(category => {
        const entry = checkIns.find(item => item.category === category.id)
        return <button key={category.id} className="record-row check-option" style={hue(category.color)} onClick={() => onSelect(category.id)}>
          <span className="category-icon"><Icon name={category.icon} /></span>
          <div><b>{category.name}</b><small>{entry ? outcomes[entry.outcome] + ' · ' + moods[entry.mood].name : category.next || 'Ready for a check-in'}</small></div>
          {entry ? <Pencil size={17} /> : <ChevronRight size={17} />}
        </button>
      })}</div> : <Empty>Create a category before checking in.</Empty>}
    </div>
  </>
}
