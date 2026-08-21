import { BookOpen, Dumbbell, Home, Sparkles, User } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { AppLogo } from './components/AppLogo';
import { ErrorBoundary, RouteErrorFallback } from './components/ErrorBoundary';
import { LiftProgress } from './components/LiftProgress';
import { InteractiveGymCalendar } from './components/InteractiveGymCalendar';
import { Nav } from './components/Nav';
import { PotOfGold } from './components/PotOfGold';
import { SessionLauncher } from './components/SessionLauncher';
import { Toaster } from './components/Toaster';
import { useSupabaseBootstrap } from './hooks/useSupabaseBootstrap';
import { dailyQuoteForToday } from './lib/daily-quote';
import { syncPotOfGold } from './lib/sync-gold';
import { ExerciseCreate } from './pages/ExerciseCreate';
import { ExerciseDetail } from './pages/ExerciseDetail';
import { ExerciseEdit } from './pages/ExerciseEdit';
import { ExerciseLibrary } from './pages/ExerciseLibrary';
import { Goals } from './pages/Goals';
import { History } from './pages/History';
import { HistorySession } from './pages/HistorySession';
import { Move } from './pages/Move';
import { Session } from './pages/Session';
import { SettingsPage } from './pages/Settings';
import { TemplateEditorPage } from './pages/TemplateEditorPage';
import { Templates } from './pages/Templates';
import { Today } from './pages/Today';
import { WorkoutHistory } from './pages/WorkoutHistory';
import { useDiaryStore } from './stores/diaryStore';
import { useUiStore } from './stores/uiStore';
import { useWorkoutStore } from './stores/workoutStore';

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-bg/85 px-5 py-3.5 backdrop-blur-md">
      <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
        <Link to="/" className="page-title text-[1.55rem] tracking-[-0.02em]" aria-label="Lift home">
          <AppLogo size={30} />
        </Link>
        <Link className="icon-button" to="/you" aria-label="You and settings">
          <User size={18} strokeWidth={1.5} />
        </Link>
      </div>
    </header>
  );
}

function GrowPage() {
  const goldDays = useUiStore((state) => state.goldDays);
  const quote = useMemo(() => dailyQuoteForToday(), []);

  return (
    <div className="grid animate-rise gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Your pot of gold</h1>
          <blockquote className="page-lead mt-3">
            <p>“{quote.text}”</p>
            <footer className="mt-2 text-sm text-fgMuted">— {quote.attribution}</footer>
          </blockquote>
        </div>
        <PotOfGold days={goldDays} />
      </div>
      <InteractiveGymCalendar showMonthStats />
      <LiftProgress />
      <History compact showCalendar={false} gymOnly />
    </div>
  );
}

/**
 * Wrapper component for route-level error boundaries with navigation.
 */
function RouteWithErrorBoundary({ element }: { element: React.ReactElement }) {
  const navigate = useNavigate();
  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <RouteErrorFallback error={error} reset={reset} onNavigateHome={() => navigate('/move')} />
      )}
    >
      {element}
    </ErrorBoundary>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/move" replace />} />
      <Route path="/move" element={<RouteWithErrorBoundary element={<Move />} />} />
      <Route path="/today" element={<RouteWithErrorBoundary element={<Today />} />} />
      <Route path="/grow" element={<RouteWithErrorBoundary element={<GrowPage />} />} />
      <Route path="/you" element={<RouteWithErrorBoundary element={<SettingsPage />} />} />
      <Route path="/log" element={<Navigate to="/move" replace />} />
      <Route path="/history" element={<Navigate to="/grow" replace />} />
      <Route path="/history/sessions" element={<WorkoutHistory />} />
      <Route path="/history/:sessionId" element={<HistorySession />} />
      <Route path="/session/new" element={<SessionLauncher />} />
      <Route path="/session/:sessionId" element={<Session />} />
      <Route path="/templates" element={<Templates />} />
      <Route path="/templates/new" element={<TemplateEditorPage />} />
      <Route path="/templates/:templateId/edit" element={<TemplateEditorPage />} />
      <Route path="/exercises" element={<ExerciseLibrary />} />
      <Route path="/exercises/new" element={<ExerciseCreate />} />
      <Route path="/exercises/:slug/edit" element={<ExerciseEdit />} />
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

  useEffect(() => {
    syncPotOfGold();
    const unsubDiary = useDiaryStore.subscribe(() => {
      syncPotOfGold();
    });
    const unsubWorkout = useWorkoutStore.subscribe(() => {
      syncPotOfGold();
    });
    return () => {
      unsubDiary();
      unsubWorkout();
    };
  }, []);

  return (
    <div className="min-h-screen font-serif text-fg antialiased">
      <Header />
      <main className="mx-auto min-h-[calc(100vh-180px)] max-w-xl overflow-x-hidden px-5 pb-32 pt-7">
        <AppRoutes />
      </main>
      <Nav
        items={[
          { to: '/move', label: 'Move', icon: Dumbbell },
          { to: '/today', label: 'Today', icon: Home },
          { to: '/grow', label: 'Grow', icon: Sparkles },
          { to: '/exercises', label: 'Library', icon: BookOpen },
          { to: '/you', label: 'You', icon: User },
        ]}
      />
      <Toaster />
    </div>
  );
}
