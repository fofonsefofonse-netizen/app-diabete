import React, { useRef } from 'react';
import { Pizza, Share2 } from 'lucide-react';
import type { Meal } from '../App';
import type { GlycemicIndex } from '../lib/gemini';
import { CATEGORY_CONFIG } from '../lib/categories';
import { shareReport, buildReportText } from '../lib/share';
import { useToastContext } from '../contexts/ToastContext';

interface DashboardProps {
  totalCarbs: number;
  dailyGoal: number;
  recentMeals: Meal[];
}

const GI_COLORS: Record<GlycemicIndex, string> = {
  'Bas':   '#10B981',
  'Moyen': '#F59E0B',
  'Élevé': '#EF4444',
};

const GIBadge: React.FC<{ gi?: GlycemicIndex }> = ({ gi }) => {
  if (!gi) return null;
  const color = GI_COLORS[gi];
  return (
    <span style={{
      padding: '1px 7px', borderRadius: '12px', fontSize: '0.63rem', fontWeight: 700,
      background: `${color}20`, color, border: `1px solid ${color}44`, whiteSpace: 'nowrap',
    }}>
      IG {gi}
    </span>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ totalCarbs, dailyGoal, recentMeals }) => {
  const addToast    = useToastContext();
  const reportRef   = useRef<HTMLDivElement>(null);
  const percentage  = Math.min((totalCarbs / dailyGoal) * 100, 100);
  const gaugeColor  = percentage > 90 ? '#EF4444' : percentage > 75 ? '#F59E0B' : '#10B981';
  const remaining   = Math.round(dailyGoal - totalCarbs);
  const mealCount   = recentMeals.length;

  const handleShare = async () => {
    if (recentMeals.length === 0) {
      addToast('Aucun repas à partager aujourd\'hui.', 'info');
      return;
    }
    const title = 'Mon rapport CarbTracker';
    const text  = buildReportText(totalCarbs, dailyGoal, recentMeals);
    try {
      const result = await shareReport(reportRef.current!, title, text);
      if (result === 'shared')     addToast('Rapport partagé !', 'success');
      else if (result === 'downloaded') addToast('Rapport téléchargé.', 'success');
      else                         addToast('Rapport copié dans le presse-papiers.', 'info');
    } catch {
      addToast('Impossible de partager le rapport.', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }} className="animate-fade-in">

      {/* ── Jauge circulaire ── */}
      <div className="glass-panel" style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h2 style={{ color: 'var(--primary)', margin: 0 }}>Résumé du Jour</h2>
          {recentMeals.length > 0 && (
            <button
              onClick={handleShare}
              className="btn"
              style={{ padding: '0.375rem 0.75rem', fontSize: '0.8rem', gap: '0.3rem' }}
              title="Partager le rapport journalier"
            >
              <Share2 size={15} /> Partager
            </button>
          )}
        </div>

        <div style={{ position: 'relative', width: '160px', height: '160px', margin: '0.75rem auto' }}>
          <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%' }}>
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none" stroke="var(--glass-border)" strokeWidth="3"
            />
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none" stroke={gaugeColor} strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${percentage}, 100`}
              style={{ transition: 'stroke-dasharray 1s ease-out, stroke 0.5s ease' }}
            />
          </svg>
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>
            <span style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>
              {Math.round(totalCarbs)}g
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              / {dailyGoal}g
            </span>
          </div>
        </div>

        <p style={{ color: 'var(--text-muted)', margin: '0 0 0.5rem', fontSize: '0.875rem' }}>
          {mealCount > 0 ? `${mealCount} repas enregistré${mealCount > 1 ? 's' : ''} aujourd'hui` : "Aucun repas aujourd'hui"}
        </p>

        {totalCarbs > 0 && (
          <div style={{
            display: 'inline-block', padding: '0.25rem 0.875rem',
            borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600,
            color: gaugeColor, background: `${gaugeColor}18`, border: `1px solid ${gaugeColor}33`,
          }}>
            {remaining > 0 ? `${remaining}g restants` : 'Quota journalier atteint !'}
          </div>
        )}
      </div>

      {/* ── Derniers repas ── */}
      <div className="glass-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Pizza style={{ color: 'var(--primary)' }} />
          <h3 style={{ margin: 0 }}>Derniers Repas</h3>
        </div>

        {recentMeals.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem 0' }}>
            <p>Aucun repas enregistré aujourd'hui.</p>
            <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
              Utilisez le scanner pour ajouter un repas.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {recentMeals.slice(0, 4).map(meal => {
              const catCfg = meal.category ? CATEGORY_CONFIG[meal.category] : null;
              return (
                <div
                  key={meal.id}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.625rem 0', borderBottom: '1px solid var(--glass-border)',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0, marginRight: '0.5rem' }}>
                    <div style={{
                      fontWeight: 600, fontSize: '0.875rem', marginBottom: '3px',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {catCfg && <span style={{ marginRight: '0.3rem' }}>{catCfg.emoji}</span>}
                      {meal.details.length > 35 ? meal.details.substring(0, 35) + '…' : meal.details}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.73rem' }}>
                      {new Date(meal.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {catCfg && (
                        <span style={{ marginLeft: '0.4rem', color: catCfg.color, fontWeight: 600 }}>
                          {catCfg.label}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <GIBadge gi={meal.glycemicIndex} />
                    <span style={{ color: 'var(--primary)', fontWeight: 700, whiteSpace: 'nowrap', fontSize: '0.9rem' }}>
                      {meal.carbs}g
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Div caché pour la capture PNG du rapport ── */}
      <div
        ref={reportRef}
        style={{
          position: 'absolute', left: '-9999px', top: 0,
          width: '360px', fontFamily: 'Outfit, system-ui, sans-serif',
          background: '#F8FAFC', padding: '1.5rem',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#10B981', margin: '0 auto 0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 900, color: 'white' }}>C</div>
          <h2 style={{ color: '#10B981', margin: '0 0 0.25rem', fontSize: '1.2rem' }}>CarbTracker</h2>
          <p style={{ color: '#64748B', fontSize: '0.8rem', margin: 0 }}>
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div style={{ textAlign: 'center', background: 'white', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#1E293B', lineHeight: 1 }}>{Math.round(totalCarbs)}g</div>
          <div style={{ color: '#64748B', fontSize: '0.8rem', marginTop: '4px' }}>/ {dailyGoal}g objectif</div>
          <div style={{ marginTop: '0.5rem', background: `${gaugeColor}18`, color: gaugeColor, padding: '3px 12px', borderRadius: '20px', display: 'inline-block', fontSize: '0.8rem', fontWeight: 600, border: `1px solid ${gaugeColor}33` }}>
            {remaining > 0 ? `${remaining}g restants` : 'Quota atteint !'}
          </div>
        </div>

        {recentMeals.length > 0 && (
          <div style={{ background: 'white', borderRadius: '12px', padding: '0.875rem', border: '1px solid #E2E8F0', marginBottom: '0.75rem' }}>
            <p style={{ color: '#64748B', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', margin: '0 0 0.5rem' }}>Repas du jour</p>
            {recentMeals.map((meal) => {
              const catCfg = meal.category ? CATEGORY_CONFIG[meal.category] : null;
              return (
                <div key={meal.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.375rem 0', borderBottom: '1px solid #F1F5F9' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#1E293B' }}>
                      {catCfg?.emoji} {meal.details.length > 35 ? meal.details.substring(0, 35) + '…' : meal.details}
                    </div>
                    <div style={{ color: '#94A3B8', fontSize: '0.68rem' }}>
                      {new Date(meal.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {catCfg && <span style={{ marginLeft: '0.4rem', color: catCfg.color }}>{catCfg.label}</span>}
                    </div>
                  </div>
                  <span style={{ color: '#10B981', fontWeight: 700, fontSize: '0.85rem' }}>{meal.carbs}g</span>
                </div>
              );
            })}
          </div>
        )}

        <p style={{ color: '#CBD5E1', fontSize: '0.65rem', textAlign: 'center', margin: 0 }}>Généré par CarbTracker</p>
      </div>
    </div>
  );
};

export default Dashboard;
