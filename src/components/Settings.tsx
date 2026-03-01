import React, { useState } from 'react';
import { KeyRound, ShieldCheck, Trash2, Target, Sun, Moon, Monitor, Syringe, Bell } from 'lucide-react';
import type { ThemeMode, InsulinSettings } from '../App';

interface SettingsProps {
  apiKey: string | null;
  setApiKey: (key: string | null) => void;
  dailyGoal: number;
  onSaveDailyGoal: (goal: number) => void;
  themeMode: ThemeMode;
  onSaveTheme: (mode: ThemeMode) => void;
  insulinSettings: InsulinSettings;
  onSaveInsulinSettings: (settings: InsulinSettings) => void;
  notificationsEnabled: boolean;
  onSaveNotifications: (enabled: boolean) => void;
}

const Settings: React.FC<SettingsProps> = ({
  apiKey, setApiKey,
  dailyGoal, onSaveDailyGoal,
  themeMode, onSaveTheme,
  insulinSettings, onSaveInsulinSettings,
  notificationsEnabled, onSaveNotifications,
}) => {
  const [inputValue, setInputValue]         = useState(apiKey || '');
  const [isSaved, setIsSaved]               = useState(false);
  const [goalInput, setGoalInput]           = useState(dailyGoal.toString());
  const [isGoalSaved, setIsGoalSaved]       = useState(false);

  // Insulin local state
  const [insulinEnabled, setInsulinEnabled]           = useState(insulinSettings.enabled);
  const [insulinRatio, setInsulinRatio]               = useState(insulinSettings.insulinRatio.toString());
  const [correctionFactor, setCorrectionFactor]       = useState(insulinSettings.correctionFactor.toString());
  const [targetGlucose, setTargetGlucose]             = useState(insulinSettings.targetGlucose.toString());
  const [isInsulinSaved, setIsInsulinSaved]           = useState(false);

  const handleSave = () => {
    if (inputValue.trim().length > 0) {
      localStorage.setItem('gemini_api_key', inputValue.trim());
      setApiKey(inputValue.trim());
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    }
  };

  const handleClear = () => {
    localStorage.removeItem('gemini_api_key');
    setApiKey(null);
    setInputValue('');
  };

  const handleSaveGoal = () => {
    const val = parseInt(goalInput, 10);
    if (!isNaN(val) && val >= 10) {
      onSaveDailyGoal(val);
      setIsGoalSaved(true);
      setTimeout(() => setIsGoalSaved(false), 3000);
    }
  };

  const handleSaveInsulin = () => {
    const ratio  = parseFloat(insulinRatio);
    const factor = parseFloat(correctionFactor);
    const target = parseFloat(targetGlucose);
    if (isNaN(ratio) || ratio <= 0 || isNaN(factor) || factor <= 0 || isNaN(target)) return;
    onSaveInsulinSettings({
      enabled: insulinEnabled,
      insulinRatio: ratio,
      correctionFactor: factor,
      targetGlucose: target,
    });
    setIsInsulinSaved(true);
    setTimeout(() => setIsInsulinSaved(false), 3000);
  };

  const goalValue   = parseInt(goalInput, 10);
  const isGoalValid = !isNaN(goalValue) && goalValue >= 10;

  const themeOptions: { mode: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'light',  label: 'Clair',   icon: <Sun  size={16} /> },
    { mode: 'system', label: 'Auto',    icon: <Monitor size={16} /> },
    { mode: 'dark',   label: 'Sombre',  icon: <Moon size={16} /> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="animate-fade-in">

      {/* ── Thème ── */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sun style={{ color: 'var(--primary)' }} />
          <h3 style={{ margin: 0 }}>Thème de l'interface</h3>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {themeOptions.map(({ mode, label, icon }) => (
            <button
              key={mode}
              className={`btn${themeMode === mode ? ' btn-primary' : ''}`}
              style={{ flex: 1, gap: '0.375rem' }}
              onClick={() => onSaveTheme(mode)}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Confidentialité ── */}
      <div className="glass-panel" style={{ textAlign: 'center' }}>
        <ShieldCheck size={48} style={{ color: 'var(--primary)', margin: '0 auto 0.75rem', display: 'block' }} />
        <h2 style={{ color: 'var(--primary)' }}>Confidentialité</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Cette application fonctionne directement sur votre appareil. Aucune photo ni donnée personnelle n'est
          envoyée à nos serveurs. L'analyse s'effectue via l'API Google Gemini avec votre propre clé.
        </p>
      </div>

      {/* ── Quota journalier ── */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Target style={{ color: 'var(--primary)' }} />
          <h3 style={{ margin: 0 }}>Quota Journalier</h3>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
          Objectif de glucides par jour en grammes (selon les recommandations de votre médecin).
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <input
            type="number"
            className="input-base"
            value={goalInput}
            onChange={e => setGoalInput(e.target.value)}
            min="10" max="600" step="5"
            style={{ flex: 1 }}
          />
          <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', fontWeight: 500 }}>g / jour</span>
        </div>
        <button className="btn btn-primary" onClick={handleSaveGoal} disabled={!isGoalValid}>
          {isGoalSaved ? '✓ Objectif enregistré !' : "Définir l'objectif"}
        </button>
      </div>

      {/* ── Calculateur d'insuline ── */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Syringe style={{ color: 'var(--primary)' }} />
            <h3 style={{ margin: 0 }}>Calculateur d'insuline</h3>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={insulinEnabled}
              onChange={e => setInsulinEnabled(e.target.checked)}
            />
            <span className="toggle-slider" />
          </label>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
          Calculez votre dose d'insuline après chaque repas. Consultez votre médecin pour configurer ces valeurs.
        </p>

        {insulinEnabled && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div>
              <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.375rem' }}>
                Ratio glucides / insuline (g par unité)
              </label>
              <input
                type="number"
                className="input-base"
                value={insulinRatio}
                onChange={e => setInsulinRatio(e.target.value)}
                min="1" max="50" step="0.5"
                placeholder="Ex: 10"
              />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                1 unité pour X g de glucides (ex: 10 → 1u pour 10g)
              </p>
            </div>

            <div>
              <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.375rem' }}>
                Facteur de correction (mmol/L par unité)
              </label>
              <input
                type="number"
                className="input-base"
                value={correctionFactor}
                onChange={e => setCorrectionFactor(e.target.value)}
                min="0.5" max="10" step="0.1"
                placeholder="Ex: 2.0"
              />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                Baisse de glycémie par unité (ex: 2.0 mmol/L)
              </p>
            </div>

            <div>
              <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.375rem' }}>
                Glycémie cible (mmol/L)
              </label>
              <input
                type="number"
                className="input-base"
                value={targetGlucose}
                onChange={e => setTargetGlucose(e.target.value)}
                min="3" max="10" step="0.1"
                placeholder="Ex: 5.5"
              />
            </div>
          </div>
        )}

        <button className="btn btn-primary" onClick={handleSaveInsulin}>
          {isInsulinSaved ? '✓ Paramètres sauvegardés !' : 'Sauvegarder'}
        </button>
      </div>

      {/* ── Rappels repas ── */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bell style={{ color: 'var(--primary)' }} />
            <h3 style={{ margin: 0 }}>Rappels repas</h3>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={notificationsEnabled}
              onChange={e => onSaveNotifications(e.target.checked)}
            />
            <span className="toggle-slider" />
          </label>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
          Recevez une notification si aucun repas n'a été enregistré depuis 4h.
          {!('Notification' in window) && (
            <span style={{ color: '#F59E0B', display: 'block', marginTop: '0.375rem' }}>
              ⚠️ Les notifications ne sont pas supportées sur ce navigateur.
            </span>
          )}
        </p>
        {notificationsEnabled && (
          <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            ✅ Rappels activés — vous serez alerté 4h après votre dernier repas enregistré.
          </div>
        )}
      </div>

      {/* ── Clé API ── */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <KeyRound style={{ color: 'var(--primary)' }} />
          <h3 style={{ margin: 0 }}>Clé d'API Gemini</h3>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
          Obtenez une clé gratuite sur{' '}
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noreferrer"
            style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 700 }}
          >
            Google AI Studio
          </a>.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <label htmlFor="apiKey" style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Votre clé secrète :
          </label>
          <input
            id="apiKey"
            type="password"
            className="input-base"
            placeholder="AIzaSy..."
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={handleSave}
            disabled={inputValue.trim().length === 0}
          >
            {isSaved ? '✓ Enregistrée !' : 'Sauvegarder'}
          </button>
          {apiKey && (
            <button className="btn btn-danger" onClick={handleClear} title="Supprimer la clé">
              <Trash2 size={20} />
            </button>
          )}
        </div>
      </div>

    </div>
  );
};

export default Settings;
