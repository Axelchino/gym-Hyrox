import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';

// Eager load: Layout and Auth (critical for initial render)
import { Layout } from './components/layout/Layout';
import { Auth } from './pages/Auth';

// Lazy load: All page components (code-split into separate chunks)
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Dashboard1 = lazy(() => import('./pages/Dashboard1'));
const WorkoutLogger = lazy(() => import('./pages/WorkoutLogger'));
const Program = lazy(() => import('./pages/Program'));
const Hyrox = lazy(() => import('./pages/Hyrox'));
const HyroxAdmin = lazy(() => import('./pages/HyroxAdmin'));
const Analytics = lazy(() => import('./pages/Analytics'));
const ExerciseLibrary = lazy(() => import('./pages/ExerciseLibrary'));
const Profile = lazy(() => import('./pages/Profile'));
const UXDemo = lazy(() => import('./pages/UXDemo'));
const ThreeModesDemo = lazy(() => import('./pages/ThreeModesDemo'));
const ThemeDemo = lazy(() => import('./pages/ThemeDemo'));
const StreakTest = lazy(() => import('./pages/StreakTest'));

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="inline-block w-8 h-8 border-4 border-t-transparent border-purple-500 rounded-full animate-spin"></div>
        <p className="mt-4 text-sm text-muted">Loading...</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
            {/* Public route */}
            <Route path="/auth" element={<Auth />} />

            {/* UX Demo - accessible without auth */}
            <Route path="/ux-demo" element={<UXDemo />} />
            <Route path="/3-modes" element={<ThreeModesDemo />} />
            <Route path="/theme-demo" element={<ThemeDemo />} />
            <Route path="/streak-test" element={<StreakTest />} />
            <Route path="/dashboard1" element={<Dashboard1 />} />

            {/* Main routes - accessible to guests and authenticated users */}
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="workout" element={<WorkoutLogger />} />
              <Route path="program" element={<Program />} />
              <Route path="hyrox" element={<Hyrox />} />
              <Route path="hyrox/admin" element={<HyroxAdmin />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="exercises" element={<ExerciseLibrary />} />
              <Route path="profile" element={<Profile />} />
            </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
