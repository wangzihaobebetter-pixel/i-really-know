import { useStore } from './store'
import Home from './components/Home'
import Quiz from './components/Quiz'
import Map from './components/Map'
import History from './components/History'
import Settings from './components/Settings'
import SessionDetail from './components/SessionDetail'

export default function App() {
  const view = useStore((s) => s.view)

  return (
    <div className="app">
      <div className="content">
        {view.name === 'home' && <Home />}
        {view.name === 'quiz' && <Quiz sessionId={view.sessionId} />}
        {view.name === 'map' && <Map sessionId={view.sessionId} />}
        {view.name === 'history' && <History />}
        {view.name === 'settings' && <Settings />}
        {view.name === 'session' && <SessionDetail sessionId={view.sessionId} />}
      </div>
      <nav className="tabbar">
        <Tab active={view.name === 'home'} onClick={() => useStore.getState().setView({ name: 'home' })} label="检验" icon="✎" />
        <Tab active={view.name === 'history'} onClick={() => useStore.getState().setView({ name: 'history' })} label="历史" icon="≡" />
        <Tab active={view.name === 'settings'} onClick={() => useStore.getState().setView({ name: 'settings' })} label="设置" icon="⚙" />
      </nav>
    </div>
  )
}

function Tab({
  active,
  onClick,
  label,
  icon
}: {
  active: boolean
  onClick: () => void
  label: string
  icon: string
}) {
  return (
    <button className={`tab ${active ? 'on' : ''}`} onClick={onClick}>
      <span className="tab-icon">{icon}</span>
      <span className="tab-label">{label}</span>
    </button>
  )
}
