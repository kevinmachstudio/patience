import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Check, Download, FlaskConical, Moon, Sun, Timer, Upload, X, Zap } from 'lucide-react'
import { actions, day, moods, outcomes, uid, type Data, type Pause } from './model'
import { backup, csv, download } from './storage'
import { useDraft } from './draft'
import { Empty } from './ui'

export function Dialog({ title, children, onClose, large = false }: { title: string; children: ReactNode; onClose: () => void; large?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null)
  const label = useId()
  useEffect(() => {
    const dialog = ref.current!
    dialog.showModal()
    return () => dialog.close()
  }, [])
  return <dialog ref={ref} className={large ? 'dialog large-dialog' : 'dialog'} aria-labelledby={label}
    onCancel={event => { event.preventDefault(); onClose() }} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <div className="modal-inner"><header className="modal-head"><h2 id={label}>{title}</h2><button className="icon-button" aria-label="Close" onClick={onClose}><X size={23} /></button></header>
      {children}</div>
  </dialog>
}

const questions = [
  { label: 'What are you trying to rush?', options: ['A result', 'A decision', 'A timeline', 'A conversation', 'Something else'] },
  { label: 'What triggered the feeling?', options: ['Saw someone else’s progress', 'Hit a setback', 'Waiting on an outcome', 'Got new information', 'Something else'] },
  { label: 'What’s underneath the urgency?', options: ['Fear', 'Comparison', 'Boredom', 'Frustration', 'FOMO', 'Something else'] },
  { label: 'Has anything fundamentally changed?', options: ['Yes', 'No', 'I’m not sure'] },
  { label: 'Are you leaving a good plan because it’s taking longer?', options: ['Probably', 'My plan may need review', 'No', 'I’m not sure'] },
  { label: 'What action would your future self respect?', options: ['Stick with the plan', 'Wait for more information', 'Ask for perspective', 'Write down the trade-offs', 'Take one small step'] },
]
const timers = [['10 minutes', 10], ['1 hour', 60], ['24 hours', 1440], ['72 hours', 4320]] as const

export function PauseFlow({ draftKey, onSave, onJournal }: { draftKey: string; onSave: (pause: Pause) => void; onJournal: () => void }) {
  const [{ stage, answers, duration }, change, clearDraft] = useDraft(draftKey, () => ({ stage: 0, answers: [] as string[], duration: 60 }))
  const last = stage === questions.length
  const question = questions[stage]
  return <div className="pause-flow">
    <div className="pause-symbol"><Zap size={30} /></div>
    <div className="step-track" aria-label={'Step ' + (stage + 1) + ' of 7'}>
      {Array.from({ length: 7 }, (_, index) => <i className={index <= stage ? 'done' : ''} key={index} />)}</div>
    <h3>{last ? 'Give it some time.' : question.label}</h3>
    {last && <p>Set a cooling-off period and come back to this decision when it ends.</p>}
    <div className="pause-choices">
      {last ? timers.map(([text, minutes]) => <button className="choice" key={minutes} aria-pressed={duration === minutes} onClick={() => change(previous => ({ ...previous, duration: minutes }))}><Timer size={19} /> {text}{duration === minutes && <Check size={18} />}</button>) :
        question.options.map(option => <button className="choice" key={option} onClick={() => {
          change(previous => ({ ...previous, stage: stage + 1,
            answers: [...answers.slice(0, stage), option, ...answers.slice(stage + 1)],
          }))
        }} aria-pressed={answers[stage] === option}>{option}<ArrowRight size={17} /></button>)}
    </div>
    <div className="form-actions">
      {stage > 0 ? <button className="button secondary" onClick={() => change(previous => ({ ...previous, stage: stage - 1 }))}><ArrowLeft size={18} /> Back</button>
        : <button className="button secondary" onClick={onJournal}>Cooling-off journal</button>}
      {last && <button className="button primary" onClick={() => {
        const created = Date.now()
        clearDraft()
        onSave({ id: uid(), created, until: created + duration * 60000, answers })
      }}><Timer size={19} /> Start timer</button>}
    </div>
  </div>
}
export function remaining(until: number, now: number) {
  const minutes = Math.max(0, Math.ceil((until - now) / 60000))
  const hours = Math.floor(minutes / 60)
  return (hours ? hours + 'h ' : '') + (minutes % 60) + 'm left'
}
const reviews = ['Waiting helped', 'I still feel the same', 'I learned something new', 'I acted before the timer ended']
export function Journal({ data, now, onReview, onStart }: { data: Data; now: number; onReview: (id: string, result: string) => void; onStart: () => void }) {
  return <div className="journal">
    {!data.pauses.length && <Empty>Your cooling-off sessions will appear here.</Empty>}
    {[...data.pauses].sort((a, b) => b.created - a.created).map(pause => <details className="journal-entry" key={pause.id} open={pause.until > now || undefined}>
      <summary><Timer size={19} /><span><b>{pause.answers[0]}</b><small>{new Date(pause.created).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</small></span>
        <strong>{pause.review ?? (pause.until > now ? remaining(pause.until, now) : 'Ready to revisit')}</strong></summary>
      <div className="journal-body"><dl>{pause.answers.map((answer, index) => <div key={index}><dt>{questions[index].label}</dt><dd>{answer}</dd></div>)}</dl>
        <fieldset><legend>Did waiting help?</legend><div className="chips">{reviews.map(review => <button key={review} className="choice" aria-pressed={pause.review === review}
          onClick={() => onReview(pause.id, review)}>{review}</button>)}</div></fieldset></div>
    </details>)}
    <button className="button primary" onClick={onStart}><Zap size={18} /> Start a new pause</button>
  </div>
}

function emitCsv(data: Data) {
  const names = new Map(data.categories.map(category => [category.id, category.name]))
  const rows = [...data.entries].sort((a, b) => a.date.localeCompare(b.date)).map(entry => [
    entry.date, names.get(entry.category) ?? '', outcomes[entry.outcome], moods[entry.mood].name,
    entry.mood * 25, ...actions.map(action => entry.actions.includes(action) ? 'Yes' : 'No'), entry.value ?? '', entry.accomplishment, entry.note,
  ])
  download('patience-check-ins-' + day() + '.csv', csv([['Date', 'Category', 'Progress outcome', 'Emotion',
    'Patience score', ...actions, 'Updated value', 'Accomplishment', 'Note'], ...rows]), 'text/csv;charset=utf-8')
}
export function Settings({ data, demo, onDemo, onTheme, onImport }: {
  data: Data; demo: boolean; onDemo: () => void; onTheme: (theme: Data['theme']) => void; onImport: (data: Data) => void;
}) {
  const [error, setError] = useState('')
  const [incoming, setIncoming] = useState<Data | null>(null)
  const file = useRef<HTMLInputElement>(null)
  return <div className="form-stack settings">
    <section><h3>Appearance</h3><div className="segmented">{(['system', 'light', 'dark'] as const).map(theme =>
      <button aria-pressed={data.theme === theme} onClick={() => onTheme(theme)} key={theme}>{theme === 'light' ? <Sun size={16} /> : theme === 'dark' ? <Moon size={16} /> : null}{theme[0].toUpperCase() + theme.slice(1)}</button>)}</div></section>
    <section><h3>Demo mode</h3><p>Explore sample goals and history in a separate profile.</p>
      <button className="button secondary" onClick={onDemo}><FlaskConical size={18} />{demo ? 'Return to my records' : 'Open demo mode'}</button></section>
    <section><h3>Backup and export</h3><p>Records are saved in this browser. Use a JSON backup to move your records between devices or sites.</p>
      <div className="toolbar">
        <button className="button secondary" onClick={() => download('patience-' + (demo ? 'demo-' : '') + day() + '.json', JSON.stringify(data, null, 2), 'application/json')}><Download size={18} /> Export JSON</button>
        <button className="button secondary" onClick={() => emitCsv(data)}><Download size={18} /> Export CSV</button>
        <button className="button secondary" onClick={() => file.current?.click()}><Upload size={18} /> Import JSON</button>
      </div>
      <input type="file" accept=".json,application/json" hidden ref={file} onChange={async event => {
        const source = event.currentTarget.files?.[0]
        event.currentTarget.value = ''
        if (!source) return
        setError('')
        setIncoming(null)
        try { setIncoming(backup(await source.text())) }
        catch { setError('Choose a valid Patience JSON backup.') }
      }} />
      {error && <p className="error" role="alert">{error}</p>}
      {incoming && <div className="confirm-box"><b>Replace the {demo ? 'demo' : 'personal'} profile?</b>
        <p>This backup contains {incoming.categories.length} categories and {incoming.entries.length} check-ins. A restore replaces the current profile.</p>
        <div className="toolbar"><button className="button secondary" onClick={() => setIncoming(null)}>Cancel</button><button className="button primary" onClick={() => {
          onImport(incoming)
          setIncoming(null)
        }}>Restore backup</button></div></div>}
    </section>
    <section><h3>Install Patience</h3><p>On iPhone, open Safari’s Share menu and select Add to Home Screen. On Android, open Chrome’s menu and choose Install app or Add to Home screen.</p></section>
  </div>
}
