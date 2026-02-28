import { useState, useEffect } from 'react';
import { Home, Camera, History as HistoryIcon, Settings as SettingsIcon, BarChart2 } from 'lucide-react';
import Settings from './components/Settings';
import Dashboard from './components/Dashboard';
import Scanner from './components/Scanner';
import HistoryView from './components/History';
import WeeklyStats from './components/WeeklyStats';
import type { GlycemicIndex } from './lib/gemini';
import type { MealCategory } from './lib/categories';
import './App.css';

export type { MealCategory };
export type ThemeMode = 'system' | 'light' | 'dark';

export interface InsulinSettings {
  enabled: boolean;
  insulinRatio: number;     // g de glucides par unité d'insuline
  correctionFactor: number; // mmol/L par unité de correction
  targetGlucose: number;    // glycémie cible en mmol/L
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

function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [dailyGoal, setDailyGoal] = useState<number>(250);
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');
  const [insulinSettings, setInsulinSettings] = useState<InsulinSettings>(DEFAULT_INSULIN);

  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) setApiKey(storedKey);
    else setCurrentView('settings');

    const storedMeals = localStorage.getItem('carbtracker_meals');
    if (storedMeals) {
      try { setMeals(JSON.parse(storedMeals)); }
      catch (e) { console.error("Impossible de lire l'historique", e); }
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
      catch (e) { console.error('Impossible de lire les paramètres insuline', e); }
    }
  }, []);

  // Applique le thème sur l'élément racine
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
    carbs: number,
    details: string,
    glycemicIndex: GlycemicIndex,
    category: MealCategory,
  ) => {
    const newMeal: Meal = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      carbs,
      details,
      glycemicIndex,
      category,
    };
    saveMeals([newMeal, ...meals]);
    setCurrentView('dashboard');
  };

  const handleDeleteMeal = (id: string) => {
    saveMeals(meals.filter(m => m.id !== id));
  };

  const today = new Date().toLocaleDateString();
  const todayMeals = meals.filter(m => new Date(m.date).toLocaleDateString() === today);
  const todayCarbs = todayMeals.reduce((acc, m) => acc + m.carbs, 0);

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard totalCarbs={todayCarbs} dailyGoal={dailyGoal} recentMeals={todayMeals} />;
      case 'scanner':
        return (
          <Scanner
            apiKey={apiKey}
            onScanResult={handleScanResult}
            insulinSettings={insulinSettings}
          />
        );
      case 'history':
        return (
          <HistoryView
            meals={meals}
            dailyGoal={dailyGoal}
            onDeleteMeal={handleDeleteMeal}
          />
        );
      case 'stats':
        return <WeeklyStats meals={meals} dailyGoal={dailyGoal} />;
      case 'settings':
        return (
          <Settings
            apiKey={apiKey}
            setApiKey={setApiKey}
            dailyGoal={dailyGoal}
            onSaveDailyGoal={handleSaveDailyGoal}
            themeMode={themeMode}
            onSaveTheme={handleSaveTheme}
            insulinSettings={insulinSettings}
            onSaveInsulinSettings={handleSaveInsulinSettings}
          />
        );
      default:
        return null;
    }
  };

  const navItems: { view: View; icon: React.ReactNode; label: string; isMain?: boolean }[] = [
    { view: 'dashboard', icon: <Home size={20} />, label: 'Accueil' },
    { view: 'history',   icon: <HistoryIcon size={20} />, label: 'Historique' },
    { view: 'scanner',   icon: <Camera size={24} />, label: 'Scanner', isMain: true },
    { view: 'stats',     icon: <BarChart2 size={20} />, label: 'Stats' },
    { view: 'settings',  icon: <SettingsIcon size={20} />, label: 'Réglages' },
  ];

  return (
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
          >
            {icon}
            {!isMain && <span className="nav-label">{label}</span>}
          </button>
        ))}
      </nav>
    </div>
  );
}

export default App;
