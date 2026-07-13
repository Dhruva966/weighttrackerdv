import { Footprints, Home, Sparkles, User, Utensils } from 'lucide-react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { Nav } from './components/Nav';
import { PotOfGold } from './components/PotOfGold';
import { SessionLauncher } from './components/SessionLauncher';
import { Toaster } from './components/Toaster';
import { UniversalCommandBar } from './components/UniversalCommandBar';
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
import { useUiStore } from './stores/uiStore';

function Header() {
  const goldDays = useUiStore((state) => state.goldDays);

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-bg/85 px-5 py-3.5 backdrop-blur-md">
      <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
        <Link to="/" className="page-title text-[1.55rem] tracking-[-0.02em]">
          Aloo
        </Link>
        <div className="flex items-center gap-2">
          <p className="hidden text-xs text-fgMuted sm:block">{goldDays} days compounding</p>
          <Link className="icon-button" to="/you" aria-label="You and settings">
            <User size={18} strokeWidth={1.5} />
          </Link>
        </div>
      </div>
    </header>
  );
}

function GrowPage() {
  const goldDays = useUiStore((state) => state.goldDays);

  return (
    <div className="grid animate-rise gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Your pot of gold</h1>
          <p className="page-lead mt-3">
            Consistency fills the pot — meals, walks, lifts, and weigh-ins all compound.
          </p>
        </div>
        <PotOfGold days={goldDays} />
      </div>
      <History compact />
    </div>
  );
}

function MovePage() {
  return (
    <div className="grid animate-rise gap-4">
      <div>
        <h1 className="page-title">Move</h1>
        <p className="page-lead mt-3">
          Walks, lifts, or anything that counts as showing up. Log with the bar above, or open a session.
        </p>
      </div>
      <Log forcedType="workout" />
    </div>
  );
}

function EatPage() {
  return (
    <div className="grid animate-rise gap-4">
      <div>
        <h1 className="page-title">Eat</h1>
        <p className="page-lead mt-3">Log food in your words — type or voice in the bar above.</p>
      </div>
      <Log forcedType="meal" />
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Today />} />
      <Route path="/eat" element={<EatPage />} />
      <Route path="/move" element={<MovePage />} />
      <Route path="/grow" element={<GrowPage />} />
      <Route path="/you" element={<SettingsPage />} />
      <Route path="/log" element={<Navigate to="/eat" replace />} />
      <Route path="/log/meal/confirm" element={<MealConfirm />} />
      <Route path="/history" element={<Navigate to="/grow" replace />} />
      <Route path="/history/sessions" element={<WorkoutHistory />} />
      <Route path="/history/:sessionId" element={<HistorySession />} />
      <Route path="/session/new" element={<SessionLauncher />} />
      <Route path="/session/:sessionId" element={<Session />} />
      <Route path="/exercises" element={<ExerciseLibrary />} />
      <Route path="/exercises/new" element={<ExerciseCreate />} />
      <Route path="/exercises/:slug" element={<ExerciseDetail />} />
      <Route path="/goals" element={<Goals />} />
      <Route path="/settings" element={<Navigate to="/you" replace />} />
      <Route path="/onboarding" element={<Navigate to="/" replace />} />
      <Route path="/progress" element={<Navigate to="/grow" replace />} />
      <Route path="/calendar" element={<Navigate to="/grow" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  useSupabaseBootstrap();

  return (
    <div className="min-h-screen font-serif text-fg antialiased">
      <Header />
      <UniversalCommandBar />
      <main className="mx-auto min-h-[calc(100vh-180px)] max-w-xl overflow-x-hidden px-5 pb-32 pt-7">
        <AppRoutes />
      </main>
      <Nav
        items={[
          { to: '/', label: 'Today', icon: Home },
          { to: '/eat', label: 'Eat', icon: Utensils },
          { to: '/move', label: 'Move', icon: Footprints },
          { to: '/grow', label: 'Grow', icon: Sparkles },
          { to: '/you', label: 'You', icon: User },
        ]}
      />
      <Toaster />
    </div>
  );
}
