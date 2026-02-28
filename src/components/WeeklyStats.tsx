import React from 'react';
import { TrendingUp, TrendingDown, Minus, BarChart2 } from 'lucide-react';
import type { Meal } from '../App';

interface WeeklyStatsProps {
  meals: Meal[];
  dailyGoal: number;
}

const DAY_NAMES = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

interface DayData {
  date: Date;
  label: string;
  totalCarbs: number;
  mealCount: number;
  isToday: boolean;
}

function getLast7Days(meals: Meal[]): DayData[] {
  const today = new Date();
  const days: DayData[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toLocaleDateString();
    const dayMeals = meals.filter(m => new Date(m.date).toLocaleDateString() === dateStr);
    days.push({
      date,
      label: DAY_NAMES[date.getDay()],
      totalCarbs: dayMeals.reduce((acc, m) => acc + m.carbs, 0),
      mealCount: dayMeals.length,
      isToday: i === 0,
    });
  }
  return days;
}

const WeeklyStats: React.FC<WeeklyStatsProps> = ({ meals, dailyGoal }) => {
  const days = getLast7Days(meals);
  const activeDays = days.filter(d => d.totalCarbs > 0);
  const totalCarbs  = activeDays.reduce((acc, d) => acc + d.totalCarbs, 0);
  const avgCarbs    = activeDays.length > 0 ? Math.round(totalCarbs / activeDays.length) : 0;
  const maxDay      = activeDays.length > 0 ? activeDays.reduce((a, b) => a.totalCarbs > b.totalCarbs ? a : b) : null;
  const minDay      = activeDays.length > 1 ? activeDays.reduce((a, b) => a.totalCarbs < b.totalCarbs ? a : b) : null;

  // Chart dimensions
  const CHART_W    = 280;
  const CHART_H    = 130;
  const BAR_COUNT  = 7;
  const BAR_SLOT   = CHART_W / BAR_COUNT;
  const BAR_W      = BAR_SLOT * 0.55;
  const maxVal     = Math.max(...days.map(d => d.totalCarbs), dailyGoal) * 1.18;

  const barColor = (carbs: number) => {
    if (carbs === 0)              return 'var(--glass-border)';
    if (carbs > dailyGoal)        return '#EF4444';
    if (carbs > dailyGoal * 0.85) return '#F59E0B';
    return 'var(--primary)';
  };

  const goalY = CHART_H - (dailyGoal / maxVal) * CHART_H;

  // Trend: compare last 3 days vs previous 4 days avg
  const last3Avg = days.slice(4).filter(d => d.totalCarbs > 0).reduce((a, b, _, arr) => a + b.totalCarbs / arr.length, 0);
  const prev4Avg = days.slice(0, 4).filter(d => d.totalCarbs > 0).reduce((a, b, _, arr) => a + b.totalCarbs / arr.length, 0);
  const trend = prev4Avg === 0 ? 'stable' : last3Avg > prev4Avg * 1.05 ? 'up' : last3Avg < prev4Avg * 0.95 ? 'down' : 'stable';

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? '#EF4444' : trend === 'down' ? '#10B981' : '#F59E0B';
  const trendLabel = trend === 'up' ? 'En hausse' : trend === 'down' ? 'En baisse' : 'Stable';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }} className="animate-fade-in">

      {/* ── Titre ── */}
      <div className="glass-panel" style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <BarChart2 style={{ color: 'var(--primary)' }} />
          <h2 style={{ color: 'var(--primary)', margin: 0 }}>Statistiques 7 jours</h2>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
          Évolution de votre consommation de glucides
        </p>
      </div>

      {/* ── Graphique en barres ── */}
      <div className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '0.9rem' }}>Glucides quotidiens</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span style={{ width: '16px', height: '2px', background: 'var(--primary)', display: 'inline-block', opacity: 0.6 }} />
            Objectif {dailyGoal}g
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <svg
            viewBox={`0 0 ${CHART_W} ${CHART_H + 28}`}
            style={{ width: '100%', maxWidth: '100%', minWidth: '260px', display: 'block' }}
          >
            {/* Ligne d'objectif */}
            {maxVal > 0 && (
              <line
                x1="0" y1={goalY}
                x2={CHART_W} y2={goalY}
                stroke="var(--primary)" strokeDasharray="5,3" strokeWidth="1.5" opacity="0.55"
              />
            )}

            {/* Barres */}
            {days.map((day, i) => {
              const barH = maxVal > 0 && day.totalCarbs > 0
                ? Math.max(4, (day.totalCarbs / maxVal) * CHART_H)
                : 2;
              const x = i * BAR_SLOT + (BAR_SLOT - BAR_W) / 2;
              const y = CHART_H - barH;
              const color = barColor(day.totalCarbs);

              return (
                <g key={i}>
                  {/* Fond (quand 0) */}
                  {day.totalCarbs === 0 && (
                    <rect
                      x={x} y={CHART_H - 2} width={BAR_W} height={2}
                      fill="var(--glass-border)" rx="2"
                    />
                  )}
                  {/* Barre */}
                  <rect
                    x={x} y={y} width={BAR_W} height={barH}
                    fill={color} rx="4"
                    opacity={day.isToday ? 1 : 0.75}
                  />
                  {/* Mise en avant du jour actuel */}
                  {day.isToday && (
                    <rect
                      x={x - 2} y={y - 2} width={BAR_W + 4} height={barH + 2}
                      fill="none" stroke={color} strokeWidth="1.5" rx="5" opacity="0.5"
                    />
                  )}
                  {/* Valeur au-dessus */}
                  {day.totalCarbs > 0 && (
                    <text
                      x={x + BAR_W / 2} y={y - 5}
                      textAnchor="middle"
                      fill={color}
                      fontSize="8"
                      fontWeight="700"
                      fontFamily="Outfit, sans-serif"
                    >
                      {day.totalCarbs}
                    </text>
                  )}
                  {/* Label du jour */}
                  <text
                    x={x + BAR_W / 2} y={CHART_H + 16}
                    textAnchor="middle"
                    fill={day.isToday ? 'var(--primary)' : 'var(--text-muted)'}
                    fontSize="9"
                    fontWeight={day.isToday ? '700' : '500'}
                    fontFamily="Outfit, sans-serif"
                  >
                    {day.isToday ? 'Auj.' : day.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* ── Métriques ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>

        <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)' }}>
            {avgCarbs}g
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '2px' }}>
            Moyenne journalière
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
            <TrendIcon size={20} style={{ color: trendColor }} />
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: trendColor }}>
              {trendLabel}
            </span>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '2px' }}>
            Tendance 7 jours
          </div>
        </div>

        {activeDays.length > 0 && maxDay && (
          <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#EF4444' }}>
              {maxDay.totalCarbs}g
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '2px' }}>
              Jour le plus chargé
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '1px' }}>
              {maxDay.label} {maxDay.date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
            </div>
          </div>
        )}

        {activeDays.length > 1 && minDay && (
          <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary)' }}>
              {minDay.totalCarbs}g
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '2px' }}>
              Meilleur jour
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '1px' }}>
              {minDay.label} {minDay.date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
            </div>
          </div>
        )}

      </div>

      {/* ── Jours dans l'objectif ── */}
      {activeDays.length > 0 && (
        <div className="glass-panel" style={{ textAlign: 'center' }}>
          {(() => {
            const inGoal = activeDays.filter(d => d.totalCarbs <= dailyGoal).length;
            const pct    = Math.round((inGoal / activeDays.length) * 100);
            const color  = pct >= 70 ? 'var(--primary)' : pct >= 40 ? '#F59E0B' : '#EF4444';
            return (
              <>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color }}>{pct}%</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  des jours dans l'objectif ({inGoal}/{activeDays.length})
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Message si pas de données */}
      {activeDays.length === 0 && (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>
            Aucune donnée pour les 7 derniers jours.<br />
            Commencez à scanner vos repas pour voir vos statistiques !
          </p>
        </div>
      )}

    </div>
  );
};

export default WeeklyStats;
