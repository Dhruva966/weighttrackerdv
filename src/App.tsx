import { AnimatePresence, motion } from 'framer-motion';
import { Dumbbell, HistoryIcon, LineChart, Plus, Search, Settings, Target } from 'lucide-react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Nav } from './components/Nav';
import { PRConfetti } from './components/PRConfetti';
import { SessionLauncher } from './components/SessionLauncher';
import { Toaster } from './components/Toaster';
import { ExerciseCreate } from './pages/ExerciseCreate';
import { ExerciseDetail } from './pages/ExerciseDetail';
import { ExerciseLibrary } from './pages/ExerciseLibrary';
import { Goals } from './pages/Goals';
import { History } from './pages/History';
import { HistorySession } from './pages/HistorySession';
import { Progress } from './pages/Progress';
import { Session } from './pages/Session';
import { SettingsPage } from './pages/Settings';
import { Today } from './pages/Today';

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-bg/90 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-lg font-extrabold tracking-normal text-fg">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-bg shadow-glow">
            <Dumbbell size={20} />
          </span>
          Lift
        </Link>
        <div className="flex items-center gap-2">
          <Link className="icon-button" to="/exercises" aria-label="Search exercises">
            <Search size={20} />
          </Link>
          <Link className="icon-button hidden min-[420px]:grid" to="/goals" aria-label="Goals">
            <Target size={20} />
          </Link>
          <Link className="icon-button" to="/settings" aria-label="Settings">
            <Settings size={20} />
          </Link>
        </div>
      </div>
    </header>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.main
        key={location.pathname}
        className="mx-auto min-h-[calc(100vh-132px)] max-w-5xl overflow-x-hidden px-4 pb-28 pt-5"
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
      >
        <Routes location={location}>
          <Route path="/" element={<Today />} />
          <Route path="/session/new" element={<SessionLauncher />} />
          <Route path="/session/:sessionId" element={<Session />} />
          <Route path="/exercises" element={<ExerciseLibrary />} />
          <Route path="/exercises/new" element={<ExerciseCreate />} />
          <Route path="/exercises/:slug" element={<ExerciseDetail />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/history" element={<History />} />
          <Route path="/history/:sessionId" element={<HistorySession />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </motion.main>
    </AnimatePresence>
  );
}

export function App() {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <Header />
      <AnimatedRoutes />
      <Link
        className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-4 z-30 grid h-14 w-14 place-items-center rounded-2xl bg-accent text-bg shadow-glow md:hidden"
        to="/exercises/new"
        aria-label="New exercise"
      >
        <Plus size={24} />
      </Link>
      <Nav
        items={[
          { to: '/', label: 'Today', icon: Dumbbell },
          { to: '/exercises', label: 'Library', icon: Search },
          { to: '/progress', label: 'Progress', icon: LineChart },
          { to: '/history', label: 'History', icon: HistoryIcon },
        ]}
      />
      <PRConfetti />
      <Toaster />
    </div>
  );
}
