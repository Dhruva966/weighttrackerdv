import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, Dumbbell, HistoryIcon, LineChart, Plus, Search, Settings, Target } from 'lucide-react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Nav } from './components/Nav';
import { PRConfetti } from './components/PRConfetti';
import { SessionLauncher } from './components/SessionLauncher';
import { Toaster } from './components/Toaster';
import { useSupabaseBootstrap } from './hooks/useSupabaseBootstrap';
import { Calendar } from './pages/Calendar';
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
    <header className="sticky top-0 z-30 border-b border-border bg-bg/95 px-5 py-4 backdrop-blur-sm">
      <div className="mx-auto flex max-w-2xl items-center justify-between">
        <Link to="/" className="page-title text-[1.35rem]">
          Lift
        </Link>
        <div className="flex items-center gap-4">
          <Link className="text-link" to="/exercises">
            Library
          </Link>
          <Link className="text-link hidden min-[420px]:inline" to="/goals">
            Goals
          </Link>
          <Link className="icon-button" to="/exercises" aria-label="Search exercises">
            <Search size={18} />
          </Link>
          <Link className="icon-button hidden min-[420px]:grid" to="/goals" aria-label="Goals">
            <Target size={18} />
          </Link>
          <Link className="icon-button" to="/settings" aria-label="Settings">
            <Settings size={18} />
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
        className="mx-auto min-h-[calc(100vh-132px)] max-w-2xl overflow-x-hidden px-5 pb-28 pt-6"
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
          <Route path="/calendar" element={<Calendar />} />
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
  useSupabaseBootstrap();

  return (
    <div className="min-h-screen bg-bg font-serif text-fg antialiased">
      <Header />
      <AnimatedRoutes />
      <Link
        className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-5 z-30 grid h-14 w-14 place-items-center rounded-md border border-fg bg-fg text-bg shadow-soft md:hidden"
        to="/exercises/new"
        aria-label="New exercise"
      >
        <Plus size={22} />
      </Link>
      <Nav
        items={[
          { to: '/', label: 'Today', icon: Dumbbell },
          { to: '/exercises', label: 'Library', icon: Search },
          { to: '/progress', label: 'Progress', icon: LineChart },
          { to: '/calendar', label: 'Calendar', icon: CalendarDays },
          { to: '/history', label: 'History', icon: HistoryIcon },
        ]}
      />
      <PRConfetti />
      <Toaster />
    </div>
  );
}
