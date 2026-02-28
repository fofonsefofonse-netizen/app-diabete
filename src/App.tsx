import { useState, useEffect, lazy, Suspense } from 'react';
import { Home, Camera, History as HistoryIcon, Settings as SettingsIcon, BarChart2 } from 'lucide-react';
import { ToastContext } from './contexts/ToastContext';
import { useToast } from './hooks/useToast';
import ToastContainer from './components/ToastContainer';
import ErrorBoundary from './components/ErrorBoundary';
import Settings from './components/Settings';
import Dashboard from './components/Dashboard';
import type { GlycemicIndex } from './lib/gemini';
import type { MealCategory } from './lib/categories';
import './App.css';

// Lazy-load les vues non critiques
const Scanner     = lazy(() => import('./components/Scanner'));
const HistoryView = lazy(() => import('./components/History'));
const WeeklyStats = lazy(() => import('./components/WeeklyStats'));

export type { MealCategory };
export type ThemeMode = 'system' | 'light' | 'dark';

export interface InsulinSettings {
  enabled: boolean;
  insulinRatio: number;
  correctionFactor: number;
  targetGlucose: number;
}

const DEFAULT_INSULIN: InsulinSettings = {
  enabled: false,
  insulinRatio: 10,
  correctionFactor: 2.0,
  targetGlucose: 5.5,
};

export interface Meal {
  id: string;
  date: string;
  carbs: number;
  details: string;
  glycemicIndex?: GlycemicIndex;
  category?: MealCategory;
}

type View = 'dashboard' | 'scanner' | 'history' | 'stats' | 'settings';

const ViewFallback = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '3rem' }}>
    <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--primary)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
  </div>
);

function App() {
  const [currentView, setCurrentView]         = useState<View>('dashboard');
  const [apiKey, setApiKey]                   = useState<string | null>(null);
  const [meals, setMeals]                     = useState<Meal[]>([]);
  const [dailyGoal, setDailyGoal]             = useState<number>(250);
  const [themeMode, setThemeMode]             = useState<ThemeMode>('system');
  const [insulinSettings, setInsulinSettings] = useState<InsulinSettings>(DEFAULT_INSULIN);

  const { toasts, addToast, removeToast } = useToast();

  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) setApiKey(storedKey);
    else setCurrentView('settings');

    const storedMeals = localStorage.getItem('carbtracker_meals');
    if (storedMeals) {
      try { setMeals(JSON.parse(storedMeals)); }
      catch { /* données corrompues, on repart à zéro */ }
    }

    const storedGoal = localStorage.getItem('carbtracker_daily_goal');
    if (storedGoal) {
      const parsed = parseInt(storedGoal, 10);
      if (!isNaN(parsed) && parsed > 0) setDailyGoal(parsed);
    }

    const storedTheme = localStorage.getItem('carbtracker_theme') as ThemeMode;
    if (storedTheme) setThemeMode(storedTheme);

    const storedInsulin = localStorage.getItem('carbtracker_insulin');
    if (storedInsulin) {
      try { setInsulinSettings(JSON.parse(storedInsulin)); }
      catch { /* ignorer */ }
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (themeMode === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', themeMode);
  }, [themeMode]);

  const saveMeals = (newMeals: Meal[]) => {
    setMeals(newMeals);
    localStorage.setItem('carbtracker_meals', JSON.stringify(newMeals));
  };

  const handleSaveDailyGoal = (goal: number) => {
    setDailyGoal(goal);
    localStorage.setItem('carbtracker_daily_goal', goal.toString());
  };

  const handleSaveTheme = (mode: ThemeMode) => {
    setThemeMode(mode);
    localStorage.setItem('carbtracker_theme', mode);
  };

  const handleSaveInsulinSettings = (settings: InsulinSettings) => {
    setInsulinSettings(settings);
    localStorage.setItem('carbtracker_insulin', JSON.stringify(settings));
  };

  const handleScanResult = (
    carbs: number, details: string,
    glycemicIndex: GlycemicIndex, category: MealCategory,
  ) => {
    const newMeal: Meal = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      carbs, details, glycemicIndex, category,
    };
    saveMeals([newMeal, ...meals]);
    addToast(`Repas sauvegardé — ${carbs}g de glucides`, 'success');
    setCurrentView('dashboard');
  };

  const handleDeleteMeal = (id: string) => {
    saveMeals(meals.filter(m => m.id !== id));
    addToast('Repas supprimé', 'info');
  };

  const today       = new Date().toLocaleDateString();
  const todayMeals  = meals.filter(m => new Date(m.date).toLocaleDateString() === today);
  const todayCarbs  = todayMeals.reduce((acc, m) => acc + m.carbs, 0);

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard totalCarbs={todayCarbs} dailyGoal={dailyGoal} recentMeals={todayMeals} />;
      case 'scanner':
        return (
          <Suspense fallback={<ViewFallback />}>
            <Scanner apiKey={apiKey} onScanResult={handleScanResult} insulinSettings={insulinSettings} />
          </Suspense>
        );
      case 'history':
        return (
          <Suspense fallback={<ViewFallback />}>
            <HistoryView meals={meals} dailyGoal={dailyGoal} onDeleteMeal={handleDeleteMeal} />
          </Suspense>
        );
      case 'stats':
        return (
          <Suspense fallback={<ViewFallback />}>
            <WeeklyStats meals={meals} dailyGoal={dailyGoal} />
          </Suspense>
        );
      case 'settings':
        return (
          <Settings
            apiKey={apiKey} setApiKey={setApiKey}
            dailyGoal={dailyGoal} onSaveDailyGoal={handleSaveDailyGoal}
            themeMode={themeMode} onSaveTheme={handleSaveTheme}
            insulinSettings={insulinSettings} onSaveInsulinSettings={handleSaveInsulinSettings}
          />
        );
      default:
        return null;
    }
  };

  const navItems: { view: View; icon: React.ReactNode; label: string; isMain?: boolean }[] = [
    { view: 'dashboard', icon: <Home size={20} />,       label: 'Accueil' },
    { view: 'history',   icon: <HistoryIcon size={20} />, label: 'Historique' },
    { view: 'scanner',   icon: <Camera size={24} />,      label: 'Scanner', isMain: true },
    { view: 'stats',     icon: <BarChart2 size={20} />,   label: 'Stats' },
    { view: 'settings',  icon: <SettingsIcon size={20} />, label: 'Réglages' },
  ];

  return (
    <ToastContext.Provider value={addToast}>
      <ErrorBoundary>
        <div className="container">
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem' }}>
            <div>
              <h1 style={{ color: 'var(--primary)', margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>CarbTracker</h1>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.875rem' }}>Votre assistant glucides</p>
            </div>
            {!apiKey && currentView !== 'settings' && (
              <button className="btn btn-primary" onClick={() => setCurrentView('settings')}>
                Ajouter Clé API
              </button>
            )}
          </header>

          <main style={{ flex: 1, paddingBottom: '6rem' }}>
            {renderView()}
          </main>

          <nav className="bottom-nav glass-panel">
            {navItems.map(({ view, icon, label, isMain }) => (
              <button
                key={view}
                onClick={() => setCurrentView(view)}
                className={`nav-btn${isMain ? ' nav-btn-main' : ''}${currentView === view && !isMain ? ' nav-btn-active' : ''}`}
                aria-label={label}
              >
                {icon}
                {!isMain && <span className="nav-label">{label}</span>}
              </button>
            ))}
          </nav>
        </div>

        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </ErrorBoundary>
    </ToastContext.Provider>
  );
}

export default App;
