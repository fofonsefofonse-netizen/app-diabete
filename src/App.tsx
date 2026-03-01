import { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react';
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

// ── Validation des données localStorage ──────────────────────────────────────
const VALID_THEMES: ThemeMode[] = ['system', 'light', 'dark'];

function isValidMeal(m: unknown): m is Meal {
  if (typeof m !== 'object' || m === null) return false;
  const meal = m as Record<string, unknown>;
  return (
    typeof meal.id === 'string' && meal.id.length > 0 &&
    typeof meal.date === 'string' && !isNaN(Date.parse(meal.date)) &&
    typeof meal.carbs === 'number' && isFinite(meal.carbs) &&
    meal.carbs >= 0 && meal.carbs <= 2000 &&
    typeof meal.details === 'string'
  );
}

function isValidInsulinSettings(s: unknown): s is InsulinSettings {
  if (typeof s !== 'object' || s === null) return false;
  const ins = s as Record<string, unknown>;
  return (
    typeof ins.enabled === 'boolean' &&
    typeof ins.insulinRatio === 'number' && ins.insulinRatio > 0 &&
    typeof ins.correctionFactor === 'number' && ins.correctionFactor > 0 &&
    typeof ins.targetGlucose === 'number' && ins.targetGlucose > 0
  );
}

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
  const [currentView, setCurrentView]               = useState<View>('dashboard');
  const [apiKey, setApiKey]                         = useState<string | null>(null);
  const [meals, setMeals]                           = useState<Meal[]>([]);
  const [dailyGoal, setDailyGoal]                   = useState<number>(250);
  const [themeMode, setThemeMode]                   = useState<ThemeMode>('system');
  const [insulinSettings, setInsulinSettings]       = useState<InsulinSettings>(DEFAULT_INSULIN);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const notifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { toasts, addToast, removeToast } = useToast();

  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) setApiKey(storedKey);
    else setCurrentView('settings');

    const storedMeals = localStorage.getItem('carbtracker_meals');
    if (storedMeals) {
      try {
        const parsed: unknown = JSON.parse(storedMeals);
        if (Array.isArray(parsed)) {
          setMeals(parsed.filter(isValidMeal));
        }
      } catch { /* données corrompues, on repart à zéro */ }
    }

    const storedGoal = localStorage.getItem('carbtracker_daily_goal');
    if (storedGoal) {
      const parsed = parseInt(storedGoal, 10);
      if (!isNaN(parsed) && parsed > 0) setDailyGoal(parsed);
    }

    const storedTheme = localStorage.getItem('carbtracker_theme');
    if (storedTheme && (VALID_THEMES as string[]).includes(storedTheme)) {
      setThemeMode(storedTheme as ThemeMode);
    }

    const storedInsulin = localStorage.getItem('carbtracker_insulin');
    if (storedInsulin) {
      try {
        const parsed: unknown = JSON.parse(storedInsulin);
        if (isValidInsulinSettings(parsed)) setInsulinSettings(parsed);
      } catch { /* ignorer */ }
    }

    const storedNotif = localStorage.getItem('carbtracker_notifications');
    if (storedNotif === 'true') setNotificationsEnabled(true);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (themeMode === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', themeMode);
  }, [themeMode]);

  // ── Timer de rappel 4h (fallback pour quand l'app est ouverte) ────────────
  useEffect(() => {
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
    if (!notificationsEnabled || !('Notification' in window) || Notification.permission !== 'granted') return;
    const lastMeal = meals[0];
    if (!lastMeal) return;
    const elapsed    = Date.now() - new Date(lastMeal.date).getTime();
    const remaining  = 4 * 60 * 60 * 1000 - elapsed;
    if (remaining <= 0) return; // déjà dépassé, pas de spam
    notifTimerRef.current = setTimeout(() => {
      if (Notification.permission === 'granted') {
        new Notification('CarbTracker', {
          body: '⏰ Pas de repas depuis 4h. Pensez à noter votre prochain repas !',
          icon: '/icon.svg',
          tag: 'meal-reminder',
        });
      }
    }, remaining);
    return () => { if (notifTimerRef.current) clearTimeout(notifTimerRef.current); };
  }, [meals, notificationsEnabled]);

  const saveMeals = useCallback((newMeals: Meal[]) => {
    setMeals(newMeals);
    localStorage.setItem('carbtracker_meals', JSON.stringify(newMeals));
  }, []);

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

  const handleSaveNotifications = useCallback(async (enabled: boolean) => {
    if (enabled && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        addToast('Permission refusée. Activez les notifications dans les paramètres du navigateur.', 'warning');
        return;
      }
      // Tenter le Periodic Background Sync (Chrome Android installé)
      if ('serviceWorker' in navigator) {
        try {
          const reg = await navigator.serviceWorker.ready;
          if ('periodicSync' in reg) {
            await (reg as any).periodicSync.register('meal-reminder', { minInterval: 60 * 60 * 1000 });
          }
        } catch { /* Non supporté sur ce navigateur — le setTimeout dans l'app prend le relais */ }
      }
      addToast('Rappels activés ✓', 'success');
    }
    setNotificationsEnabled(enabled);
    localStorage.setItem('carbtracker_notifications', enabled ? 'true' : 'false');
  }, [addToast]);

  const handleScanResult = useCallback((
    carbs: number, details: string,
    glycemicIndex: GlycemicIndex, category: MealCategory,
  ) => {
    const newMeal: Meal = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      carbs, details, glycemicIndex, category,
    };
    const updated = [newMeal, ...meals];
    saveMeals(updated);
    addToast(`Repas sauvegardé — ${carbs}g de glucides`, 'success');
    setCurrentView('dashboard');
    // Notifier le service worker du dernier repas (pour les rappels background)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then(reg => reg.active?.postMessage({ type: 'MEAL_SAVED', timestamp: Date.now() }))
        .catch(() => {});
    }
  }, [saveMeals, meals, addToast]);

  const handleDeleteMeal = useCallback((id: string) => {
    saveMeals(meals.filter(m => m.id !== id));
    addToast('Repas supprimé', 'info');
  }, [saveMeals, meals, addToast]);

  const handleEditMeal = useCallback((
    id: string,
    updates: Partial<Pick<Meal, 'carbs' | 'details' | 'category' | 'glycemicIndex'>>,
  ) => {
    saveMeals(meals.map(m => m.id === id ? { ...m, ...updates } : m));
    addToast('Repas modifié', 'success');
  }, [saveMeals, meals, addToast]);

  const today      = new Date().toLocaleDateString();
  const todayMeals = useMemo(
    () => meals.filter(m => new Date(m.date).toLocaleDateString() === today),
    [meals, today],
  );
  const todayCarbs = useMemo(
    () => todayMeals.reduce((acc, m) => acc + m.carbs, 0),
    [todayMeals],
  );

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
            <HistoryView meals={meals} dailyGoal={dailyGoal} onDeleteMeal={handleDeleteMeal} onEditMeal={handleEditMeal} />
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
            notificationsEnabled={notificationsEnabled} onSaveNotifications={handleSaveNotifications}
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
