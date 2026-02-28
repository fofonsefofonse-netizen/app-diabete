import React from 'react';
import { Pizza } from 'lucide-react';
import type { Meal } from '../App';
import type { GlycemicIndex } from '../lib/gemini';
import { CATEGORY_CONFIG } from '../lib/categories';

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
  const percentage  = Math.min((totalCarbs / dailyGoal) * 100, 100);
  const gaugeColor  = percentage > 90 ? '#EF4444' : percentage > 75 ? '#F59E0B' : 'var(--primary)';
  const remaining   = Math.round(dailyGoal - totalCarbs);
  const mealCount   = recentMeals.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }} className="animate-fade-in">

      {/* ── Jauge circulaire ── */}
      <div className="glass-panel" style={{ textAlign: 'center' }}>
        <h2 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>Résumé du Jour</h2>

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
    </div>
  );
};

export default Dashboard;
