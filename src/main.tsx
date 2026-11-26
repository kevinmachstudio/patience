import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { CalendarDays, ChartNoAxesCombined, Check, FlaskConical, House, LayoutGrid, Plus, Settings2, Sprout, Timer } from 'lucide-react'
import { Home } from './home'
import { Categories, CategoryDetail, CategoryForm, CheckForm, CheckPage } from './edit'
import { Insights, Timeline } from './insights'
import { Dialog, Journal, PauseFlow, remaining, Settings } from './dialogs'
import { active, badges, day, earned, initial, type Category, type Data } from './model'
import { clearDrafts } from './draft'
import { load, save } from './storage'
import { Empty } from './ui'
import './style.css'

const tabs = [
  { id: 'home', text: 'Home', icon: House },
  { id: 'categories', text: 'Categories', icon: LayoutGrid },
  { id: 'check', text: 'Check-in', icon: Plus },
  { id: 'insights', text: 'Insights', icon: ChartNoAxesCombined },
  { id: 'timeline', text: 'Timeline', icon: CalendarDays },
] as const
type Tab = typeof tabs[number]['id']
type Modal = { name: 'settings' | 'pause' | 'journal' | 'create' } | { name: 'detail' | 'edit' | 'delete'; category: string } | { name: 'check'; category: string; date: string; from?: 'detail' }

function App() {
  const [profile, setProfile] = useState<'personal' | 'demo'>('personal')
  const [personal, setPersonal] = useState<Data | null>(null)
  const [sample, setSample] = useState<Data | null>(null)
  const [tab, setTab] = useState<Tab>('home')
  const [modal, setModal] = useState<Modal | null>(null)
  const [now, setNow] = useState(Date.now)
  const today = day(new Date(now))
  const [checkDate, setCheckDate] = useState(today)
  const [toast, setToast] = useState('')
  const [storageError, setStorageError] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [failedCheck, setFailedCheck] = useState<string | null>(null)
  const toastTimer = useRef<number>(0)
  const data = profile === 'personal' ? personal : sample
  const current = useRef({ personal, demo: sample })
  const setData = profile === 'personal' ? setPersonal : setSample
  const demo = profile === 'demo'

  useEffect(() => {
    void Promise.all([load('personal'), load('demo')]).then(([own, demoData]) => {
      current.current = { personal: own ?? initial(), demo: demoData ?? null }
      setPersonal(current.current.personal)
      setSample(current.current.demo)
      setLoaded(true)
      if (!own) void save('personal', current.current.personal!).catch(() => setStorageError(true))
    }).catch(() => {
      current.current.personal = initial()
      setPersonal(current.current.personal)
      setStorageError(true)
      setLoaded(true)
    })
    const timer = window.setInterval(() => setNow(Date.now()), 15000)
    const onVisible = () => setNow(Date.now())
    window.addEventListener('focus', onVisible)
    return () => { window.clearInterval(timer); window.clearTimeout(toastTimer.current); window.removeEventListener('focus', onVisible) }
  }, [])
  useEffect(() => {
    const root = document.documentElement
    const theme = data?.theme ?? 'system'
    root.dataset.theme = theme
    const dark = window.matchMedia('(prefers-color-scheme: dark)')
    const sync = () => document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' || theme === 'system' && dark.matches ? '#16131d' : '#faf8fc')
    sync()
    dark.addEventListener('change', sync)
    return () => dark.removeEventListener('change', sync)
  }, [data?.theme])

  function notify(text: string) {
    window.clearTimeout(toastTimer.current)
    setToast(text)
    toastTimer.current = window.setTimeout(() => setToast(''), 4200)
  }
  function update(transform: (previous: Data) => Data, message?: string) {
    const previous = current.current[profile]
    if (!previous) return
    const next = transform(previous)
    next.awards = earned(next)
    const newBadges = next.awards.filter(id => !previous.awards.includes(id))
    current.current[profile] = next
    setData(next)
    void save(profile, next).then(() => {
      setStorageError(false)
      if (!newBadges.length && message) notify(message)
      if (newBadges.length) notify('Badge earned · ' + badges.find(badge => badge.id === newBadges[0])?.label)
    }).catch(() => setStorageError(true))
  }

  function navigate(next: Tab) {
    if (tab !== next) window.scrollTo(0, 0)
    setModal(null)
    setTab(next)
    if (next === 'check') setCheckDate(today)
  }
  function openCheck(date: string, category?: string, from?: 'detail') {
    setCheckDate(date)
    if (category) {
      setFailedCheck(null)
      setModal({ name: 'check', date, category, from })
    } else {
      navigate('check')
      setCheckDate(date)
    }
  }
  function closeCheck() {
    if (modal?.name === 'check' && modal.from === 'detail') setModal({ name: 'detail', category: modal.category })
    else setModal(null)
  }
  const viewCategory = (category: string) => setModal({ name: 'detail', category })
  const showPause = () => { setNow(Date.now()); setModal({ name: 'pause' }) }
  const showJournal = () => { setNow(Date.now()); setModal({ name: 'journal' }) }
  const create = () => setModal({ name: 'create' })
  const toggleRest = (date: string) => update(previous => ({ ...previous, rest: previous.rest.includes(date) ? previous.rest.filter(item => item !== date) : [...previous.rest, date] }),
    data?.rest.includes(date) ? 'Planned rest removed' : 'Rest day planned')
  const upsertCategory = (category: Category, message?: string) => update(previous => ({
    ...previous, categories: previous.categories.some(item => item.id === category.id) ?
      previous.categories.map(item => item.id === category.id ? category : item) : [...previous.categories, category],
  }), message)
  function reorder(id: string, delta: number) {
    update(previous => {
      const categories = [...previous.categories]
      const index = categories.findIndex(category => category.id === id)
      const siblings = categories.filter(category => category.archived === categories[index]?.archived)
      const next = siblings[siblings.findIndex(category => category.id === id) + delta]
      if (!next || index < 0) return { ...previous }
      const nextIndex = categories.indexOf(next)
      ;[categories[index], categories[nextIndex]] = [categories[nextIndex], categories[index]]
      return { ...previous, categories }
    })
  }
  function toggleDemo() {
    if (!demo && !current.current.demo) {
      const generated = initial(true)
      current.current.demo = generated
      setSample(generated)
      void save('demo', generated).catch(() => setStorageError(true))
    }
    setProfile(demo ? 'personal' : 'demo')
    navigate('home')
  }

  if (!loaded || !data) return <div className="loading"><Sprout size={34} /> Patience</div>
  const selected = modal && 'category' in modal ? data.categories.find(category => category.id === modal.category) : undefined
  const pause = [...data.pauses].filter(pause => !pause.review).sort((a, b) => b.created - a.created)[0]
  const checkEntry = modal?.name === 'check' ? data.entries.find(entry => entry.category === modal.category && entry.date === modal.date) : undefined
  const activeAreas = active(data)

  return <>
    <header className="topbar"><div className="topbar-inner">
      <button className="brand" onClick={() => navigate('home')} aria-label="Patience home"><span className="brand-mark"><Sprout size={24} strokeWidth={1.9} /></span><span>patience<span className="brand-period">.</span><small>The art of becoming</small></span></button>
      <div className="top-actions">
        {demo ? <button className="button demo-button" onClick={toggleDemo}><FlaskConical size={17} /> Exit demo</button>
          : <button className="button demo-button" onClick={toggleDemo}><FlaskConical size={17} /> <span>Try demo</span></button>}
        <button className="icon-button settings-button" aria-label="Settings" onClick={() => setModal({ name: 'settings' })}><Settings2 size={21} /></button>
      </div>
    </div></header>

    <main className="site-main">
      {storageError && <div className="error" role="alert">Browser storage is unavailable. Export a JSON backup in settings to keep your changes.</div>}
      {pause && <button className="timer-strip" onClick={showJournal}><Timer size={20} /><span><b>{pause.until > now ? 'Cooling-off timer' : 'Ready to revisit your pause'}</b>
        <small>{pause.until > now ? remaining(pause.until, now) : 'Record whether waiting helped'}</small></span></button>}
      {tab === 'home' && <Home data={data} today={today} onCheck={() => navigate('check')} onPause={showPause} onCategories={() => navigate('categories')}
        onInsights={() => navigate('insights')} onCategory={viewCategory} onCreate={create} onRest={() => toggleRest(today)} />}
      {tab === 'categories' && <Categories data={data} onOpen={viewCategory} onCreate={create} onReorder={reorder} />}
      {tab === 'check' && <><CheckPage data={data} date={checkDate} onDate={setCheckDate} onSelect={id => openCheck(checkDate, id)} onRest={() => toggleRest(checkDate)} />
        {!activeAreas.length && <button className="button primary mt-5" onClick={create}><Plus size={18} /> New category</button>}</>}
      {tab === 'insights' && <Insights data={data} today={today} onDay={date => openCheck(date)} onCategory={viewCategory} />}
      {tab === 'timeline' && <Timeline data={data} today={today} onCheck={openCheck} onCategory={viewCategory} onPause={showJournal} onRest={toggleRest} />}
    </main>

    <nav className="dock" aria-label="Main navigation">{tabs.map(({ id, text, icon: Graphic }) =>
      <button key={id} aria-current={tab === id ? 'page' : undefined} className={id === 'check' ? 'nav-check' : ''} onClick={() => navigate(id)}>
        <span className="dock-icon"><Graphic size={id === 'check' ? 25 : 21} strokeWidth={id === 'check' ? 2.5 : 1.8} /></span><span>{text}</span>
      </button>)}</nav>

    <div aria-live="polite" className="toast-region">{toast && <div className="toast" key={toast}><Check size={18} />{toast}</div>}</div>

    {modal?.name === 'settings' && <Dialog key="settings" title="Settings" onClose={() => setModal(null)}>
      <Settings data={data} demo={demo} onDemo={toggleDemo} onTheme={theme => update(previous => ({ ...previous, theme }))} onImport={incoming => { clearDrafts(profile); update(() => incoming, 'Backup restored') }} />
    </Dialog>}
    {modal?.name === 'pause' && <Dialog key="pause" large title="Take a pause" onClose={() => setModal(null)}>
      <PauseFlow draftKey={profile + ':pause'} onJournal={showJournal} onSave={pause => {
        setNow(Date.now())
        update(previous => ({ ...previous, pauses: [...previous.pauses, pause] }), 'Cooling-off timer started')
        showJournal()
      }} />
    </Dialog>}
    {modal?.name === 'journal' && <Dialog key="journal" title="Cooling-off journal" onClose={() => setModal(null)}>
      <Journal data={data} now={now} onStart={showPause} onReview={(id, review) =>
        update(previous => ({ ...previous, pauses: previous.pauses.map(pause => pause.id === id ? { ...pause, review } : pause) }), 'Reflection saved')} />
    </Dialog>}
    {(modal?.name === 'create' || modal?.name === 'edit' && selected) && <Dialog key="category-form" title={modal.name === 'create' ? 'New category' : 'Edit category'}
      onClose={() => selected ? viewCategory(selected.id) : setModal(null)}>
      <CategoryForm category={selected} draftKey={profile + ':category:' + (selected?.id ?? 'new')} onCancel={() => selected ? viewCategory(selected.id) : setModal(null)}
        onSave={category => { upsertCategory(category, 'Category saved'); viewCategory(category.id) }} />
    </Dialog>}
    {modal?.name === 'detail' && selected && <Dialog key={'detail-' + selected.id} title={selected.name} onClose={() => setModal(null)}>
      <CategoryDetail data={data} category={selected} onCheck={id => openCheck(data.entries.find(entry => entry.id === id)?.date ?? today, selected.id, 'detail')}
        onEdit={() => setModal({ name: 'edit', category: selected.id })} onArchive={() => upsertCategory({ ...selected, archived: !selected.archived }, selected.archived ? 'Category restored' : 'Category archived')}
        onDelete={() => setModal({ name: 'delete', category: selected.id })} onUpdate={category => upsertCategory(category, 'Milestones updated')} />
    </Dialog>}
    {modal?.name === 'delete' && selected && <Dialog key="delete" title="Delete category?" onClose={() => viewCategory(selected.id)}>
      <p className="delete-description">This permanently deletes {selected.name}, its milestones, and its check-ins from this profile.</p>
      <div className="form-actions"><button className="button secondary" onClick={() => viewCategory(selected.id)}>Cancel</button>
        <button className="button danger" onClick={() => {
          update(previous => ({ ...previous, categories: previous.categories.filter(category => category.id !== selected.id),
            entries: previous.entries.filter(entry => entry.category !== selected.id) }), 'Category deleted')
          setModal(null)
        }}>Delete category</button></div>
    </Dialog>}
    {modal?.name === 'check' && selected && <Dialog key={'check-' + selected.id + modal.date} title={checkEntry ? 'Edit check-in' : 'Daily check-in'} onClose={closeCheck}>
      {modal.date < selected.start ? <Empty>This category started after the selected date.</Empty> :
        <CheckForm draftKey={profile + ':check:' + selected.id + ':' + modal.date} category={selected} entry={checkEntry} date={modal.date} onBack={closeCheck} onSave={entry => {
          update(previous => ({ ...previous, entries: [...previous.entries.filter(item => item.category !== entry.category || item.date !== entry.date), entry] }), 'Check-in saved')
          if (modal.from === 'detail') closeCheck()
          else { navigate('check'); setCheckDate(entry.date) }
        }} onDelete={checkEntry ? () => setFailedCheck(checkEntry.id) : undefined} />}
      {failedCheck && <div className="confirm-box"><p>Delete this check-in and its progress update?</p><div className="toolbar">
        <button className="button secondary" onClick={() => setFailedCheck(null)}>Keep check-in</button>
        <button className="button danger" onClick={() => {
          update(previous => ({ ...previous, entries: previous.entries.filter(entry => entry.id !== failedCheck) }), 'Check-in deleted')
          setFailedCheck(null)
          closeCheck()
        }}>Confirm deletion</button></div></div>}
    </Dialog>}
  </>
}

createRoot(document.getElementById('root')!).render(<App />)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.register(new URL('sw.js', document.baseURI)).catch(error => console.warn('Offline support could not start', error))
}
