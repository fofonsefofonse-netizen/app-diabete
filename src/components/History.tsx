import React, { useState, useMemo } from 'react';
import { Trash2, Download, History as HistoryIcon } from 'lucide-react';
import type { Meal } from '../App';
import type { GlycemicIndex } from '../lib/gemini';
import { CATEGORY_CONFIG } from '../lib/categories';

interface HistoryProps {
  meals: Meal[];
  dailyGoal: number;
  onDeleteMeal: (id: string) => void;
}

const GI_COLORS: Record<GlycemicIndex, string> = {
  'Bas':   '#10B981',
  'Moyen': '#F59E0B',
  'Élevé': '#EF4444',
};

function groupByDay(meals: Meal[]) {
  const groups: Record<string, Meal[]> = {};
  for (const meal of meals) {
    const day = new Date(meal.date).toLocaleDateString('fr-FR');
    if (!groups[day]) groups[day] = [];
    groups[day].push(meal);
  }
  return Object.entries(groups); // already ordered by first occurrence (recent first)
}

function exportCSV(meals: Meal[], dailyGoal: number) {
  // ── Détail des repas ──
  const detailHeader = 'Date,Heure,Catégorie,Glucides (g),Index Glycémique,Détails\n';
  const detailRows = meals.map(m => {
    const d       = new Date(m.date);
    const csvField = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const date  = d.toLocaleDateString('fr-FR');
    const time  = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return `${csvField(date)},${csvField(time)},${csvField(m.category ?? '')},${m.carbs},${csvField(m.glycemicIndex ?? '')},${csvField(m.details)}`;
  }).join('\n');

  // ── Résumé journalier ──
  const groups = groupByDay(meals);
  const summaryHeader = '\n\nRésumé journalier\nDate,Total Glucides (g),Nombre de repas,Objectif (g),Statut\n';
  const summaryRows = groups.map(([day, dayMeals]) => {
    const total  = dayMeals.reduce((acc, m) => acc + m.carbs, 0);
    const status = total > dailyGoal ? 'Dépassé' : total > dailyGoal * 0.9 ? 'Proche' : 'OK';
    return `${day},${total},${dayMeals.length},${dailyGoal},${status}`;
  }).join('\n');

  const csv  = detailHeader + detailRows + summaryHeader + summaryRows;
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `carbtracker_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const History: React.FC<HistoryProps> = ({ meals, dailyGoal, onDeleteMeal }) => {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  if (meals.length === 0) {
    return (
      <div className="glass-panel animate-fade-in" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
        <HistoryIcon size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem', display: 'block', opacity: 0.5 }} />
        <h2 style={{ color: 'var(--primary)' }}>Historique</h2>
        <p style={{ color: 'var(--text-muted)' }}>Aucun repas enregistré pour l'instant.</p>
      </div>
    );
  }

  const groups = useMemo(() => groupByDay(meals), [meals]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} className="animate-fade-in">

      {/* ── En-tête + export ── */}
      <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ color: 'var(--primary)', margin: 0 }}>Historique</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>
            {meals.length} repas · {groups.length} jour{groups.length > 1 ? 's' : ''}
          </p>
        </div>
        <button
          className="btn"
          style={{ gap: '0.375rem', fontSize: '0.875rem' }}
          onClick={() => exportCSV(meals, dailyGoal)}
        >
          <Download size={16} /> CSV
        </button>
      </div>

      {/* ── Groupes par jour ── */}
      {groups.map(([day, dayMeals]) => {
        const dayTotal  = dayMeals.reduce((acc, m) => acc + m.carbs, 0);
        const isToday   = day === new Date().toLocaleDateString('fr-FR');
        const overGoal  = dayTotal > dailyGoal;
        const nearGoal  = dayTotal > dailyGoal * 0.9;
        const dayColor  = overGoal ? '#EF4444' : nearGoal ? '#F59E0B' : 'var(--primary)';

        return (
          <div key={day} className="glass-panel" style={{ padding: '1.25rem' }}>
            {/* En-tête du jour */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                  {isToday ? "Aujourd'hui" : day}
                </span>
                {isToday && (
                  <span style={{
                    marginLeft: '0.5rem', fontSize: '0.7rem', fontWeight: 600,
                    background: 'rgba(16,185,129,0.15)', color: 'var(--primary)',
                    padding: '1px 7px', borderRadius: '10px',
                  }}>
                    Aujourd'hui
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {dayMeals.length} repas
                </span>
                <span style={{
                  fontWeight: 800, fontSize: '1rem', color: dayColor,
                  background: `${dayColor}18`, padding: '2px 10px', borderRadius: '14px',
                }}>
                  {dayTotal}g
                </span>
              </div>
            </div>

            {/* Liste des repas */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {dayMeals.map((meal, idx) => {
                const catCfg = meal.category ? CATEGORY_CONFIG[meal.category] : null;
                const giColor = meal.glycemicIndex ? GI_COLORS[meal.glycemicIndex] : undefined;
                const isLast = idx === dayMeals.length - 1;
                const isConfirming = confirmDelete === meal.id;

                return (
                  <div
                    key={meal.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.625rem 0',
                      borderBottom: isLast ? 'none' : '1px solid var(--glass-border)',
                    }}
                  >
                    {/* Emoji catégorie */}
                    {catCfg && (
                      <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{catCfg.emoji}</span>
                    )}

                    {/* Contenu */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: 600, fontSize: '0.85rem',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {meal.details.length > 42 ? meal.details.substring(0, 42) + '…' : meal.details}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '2px', flexWrap: 'wrap' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                          {new Date(meal.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {catCfg && (
                          <span style={{ fontSize: '0.68rem', fontWeight: 600, color: catCfg.color }}>
                            {catCfg.label}
                          </span>
                        )}
                        {meal.glycemicIndex && (
                          <span style={{
                            padding: '0 5px', borderRadius: '8px', fontSize: '0.63rem', fontWeight: 700,
                            background: `${giColor}20`, color: giColor, border: `1px solid ${giColor}44`,
                          }}>
                            IG {meal.glycemicIndex}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Glucides + supprimer */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                      <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.9rem' }}>
                        {meal.carbs}g
                      </span>

                      {isConfirming ? (
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button
                            className="btn btn-danger"
                            style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                            onClick={() => { onDeleteMeal(meal.id); setConfirmDelete(null); }}
                          >
                            Oui
                          </button>
                          <button
                            className="btn"
                            style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                            onClick={() => setConfirmDelete(null)}
                          >
                            Non
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(meal.id)}
                          style={{
                            background: 'transparent', border: 'none', cursor: 'pointer',
                            color: 'var(--text-muted)', padding: '0.25rem',
                            borderRadius: 'var(--radius-sm)', transition: 'var(--transition)',
                            display: 'flex', alignItems: 'center',
                          }}
                          title="Supprimer ce repas"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default History;
