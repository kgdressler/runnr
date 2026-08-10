import { HashRouter, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom'
import { AppProvider, useAppState } from './state/useAppState'
import Setup from './views/Setup'
import Today from './views/Today'

export default function App() {
  return (
    <AppProvider>
      {/* Hash routing keeps deep links working on GitHub Pages, which serves
          no fallback for unknown paths. */}
      <HashRouter>
        <Shell />
      </HashRouter>
    </AppProvider>
  )
}

function Shell() {
  const { active } = useAppState()
  const location = useLocation()

  // Without a plan there is nothing to show, so setup is the only destination.
  if (!active && location.pathname !== '/setup') {
    return <Navigate to="/setup" replace />
  }

  return (
    <div className="mx-auto min-h-dvh max-w-lg pb-24">
      <main className="p-5">
        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/week" element={<Placeholder name="This week" />} />
          <Route path="/season" element={<Placeholder name="Season" />} />
          <Route path="/history" element={<Placeholder name="History" />} />
          <Route path="/setup" element={<Setup />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {active && <TabBar />}
    </div>
  )
}

const TABS = [
  { to: '/', label: 'Today' },
  { to: '/week', label: 'Week' },
  { to: '/season', label: 'Season' },
  { to: '/setup', label: 'Plan' },
]

function TabBar() {
  return (
    <nav className="fixed inset-x-0 bottom-0 border-t border-neutral-200 bg-white/90 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
      <ul className="mx-auto flex max-w-lg">
        {TABS.map((tab) => (
          <li key={tab.to} className="flex-1">
            <NavLink
              to={tab.to}
              end={tab.to === '/'}
              className={({ isActive }) =>
                `block p-4 text-center text-sm font-medium transition ${
                  isActive
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-neutral-500 dark:text-neutral-400'
                }`
              }
            >
              {tab.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function Placeholder({ name }: { name: string }) {
  return (
    <div className="py-12 text-center">
      <p className="font-medium">{name}</p>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Coming in the next step.</p>
    </div>
  )
}
