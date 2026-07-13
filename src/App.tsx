import { BookOpen, History as HistoryIcon, Home, PenLine, Settings, Target } from 'lucide-react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { AskBar } from './components/AskBar';
import { Nav } from './components/Nav';
import { SessionLauncher } from './components/SessionLauncher';
import { Toaster } from './components/Toaster';
import { useSupabaseBootstrap } from './hooks/useSupabaseBootstrap';
import { ExerciseCreate } from './pages/ExerciseCreate';
import { ExerciseDetail } from './pages/ExerciseDetail';
import { ExerciseLibrary } from './pages/ExerciseLibrary';
import { Goals } from './pages/Goals';
import { History } from './pages/History';
import { HistorySession } from './pages/HistorySession';
import { Log } from './pages/Log';
import { MealConfirm } from './pages/MealConfirm';
import { Session } from './pages/Session';
import { SettingsPage } from './pages/Settings';
import { Today } from './pages/Today';
import { WorkoutHistory } from './pages/WorkoutHistory';

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/95 px-5 py-4 backdrop-blur-sm">
      <div className="mx-auto flex max-w-xl items-center justify-between">
        <Link to="/" className="page-title text-[1.5rem]">
          Lift
        </Link>
        <div className="flex items-center gap-2">
          <Link className="icon-button" to="/exercises" aria-label="Exercises">
            <BookOpen size={18} />
          </Link>
          <Link className="icon-button" to="/goals" aria-label="Goals">
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

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Today />} />
      <Route path="/log" element={<Log />} />
      <Route path="/log/meal/confirm" element={<MealConfirm />} />
      <Route path="/history" element={<History />} />
      <Route path="/history/sessions" element={<WorkoutHistory />} />
      <Route path="/history/:sessionId" element={<HistorySession />} />
      <Route path="/session/new" element={<SessionLauncher />} />
      <Route path="/session/:sessionId" element={<Session />} />
      <Route path="/exercises" element={<ExerciseLibrary />} />
      <Route path="/exercises/new" element={<ExerciseCreate />} />
      <Route path="/exercises/:slug" element={<ExerciseDetail />} />
      <Route path="/goals" element={<Goals />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/progress" element={<Navigate to="/history" replace />} />
      <Route path="/calendar" element={<Navigate to="/history" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  useSupabaseBootstrap();

  return (
    <div className="min-h-screen bg-bg font-serif text-fg antialiased">
      <Header />
      <AskBar />
      <main className="mx-auto min-h-[calc(100vh-180px)] max-w-xl overflow-x-hidden px-5 pb-28 pt-6">
        <AppRoutes />
      </main>
      <Nav
        items={[
          { to: '/', label: 'Today', icon: Home },
          { to: '/log', label: 'Log', icon: PenLine },
          { to: '/history', label: 'History', icon: HistoryIcon },
        ]}
      />
      <Toaster />
    </div>
  );
}
