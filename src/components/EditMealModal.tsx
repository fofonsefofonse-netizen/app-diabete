import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import type { Meal } from '../App';
import type { GlycemicIndex } from '../lib/gemini';
import { CATEGORY_CONFIG } from '../lib/categories';
import type { MealCategory } from '../lib/categories';

interface EditMealModalProps {
  meal: Meal;
  onSave: (id: string, updates: Partial<Pick<Meal, 'carbs' | 'details' | 'category' | 'glycemicIndex'>>) => void;
  onClose: () => void;
}

const CATEGORIES: MealCategory[] = ['petit-déjeuner', 'déjeuner', 'dîner', 'collation'];

const GI_OPTIONS: { value: GlycemicIndex; color: string }[] = [
  { value: 'Bas',   color: '#10B981' },
  { value: 'Moyen', color: '#F59E0B' },
  { value: 'Élevé', color: '#EF4444' },
];

const EditMealModal: React.FC<EditMealModalProps> = ({ meal, onSave, onClose }) => {
  const [carbs, setCarbs]       = useState(meal.carbs.toString());
  const [details, setDetails]   = useState(meal.details);
  const [category, setCategory] = useState<MealCategory | undefined>(meal.category);
  const [gi, setGi]             = useState<GlycemicIndex | undefined>(meal.glycemicIndex);

  const carbsNum = parseFloat(carbs);
  const isValid  = !isNaN(carbsNum) && carbsNum >= 0 && carbsNum <= 2000 && details.trim().length > 0;

  const handleSave = () => {
    if (!isValid) return;
    onSave(meal.id, {
      carbs: Math.round(carbsNum),
      details: details.trim().substring(0, 600),
      category,
      glycemicIndex: gi,
    });
    onClose();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '480px',
          background: 'var(--bg-color)',
          borderRadius: '20px 20px 0 0',
          padding: '1.5rem',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.18)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0, color: 'var(--primary)' }}>Modifier le repas</h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem', borderRadius: '8px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Glucides */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Glucides (g)
          </label>
          <input
            type="number"
            className="input-base"
            value={carbs}
            onChange={e => setCarbs(e.target.value)}
            min="0" max="2000" step="1"
            autoFocus
          />
        </div>

        {/* Détails */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Description
          </label>
          <textarea
            className="input-base"
            value={details}
            onChange={e => setDetails(e.target.value)}
            maxLength={600}
            style={{ minHeight: '80px', resize: 'vertical' }}
          />
        </div>

        {/* Catégorie */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Catégorie
          </label>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {CATEGORIES.map(cat => {
              const cfg = CATEGORY_CONFIG[cat];
              const isActive = cat === category;
              return (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  style={{
                    padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600,
                    cursor: 'pointer',
                    border: `1.5px solid ${isActive ? cfg.color : 'var(--glass-border)'}`,
                    background: isActive ? `${cfg.color}22` : 'transparent',
                    color: isActive ? cfg.color : 'var(--text-muted)',
                    transition: 'var(--transition)',
                  }}
                >
                  {cfg.emoji} {cfg.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Index glycémique */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Index Glycémique
          </label>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {GI_OPTIONS.map(({ value, color }) => {
              const isActive = gi === value;
              return (
                <button
                  key={value}
                  onClick={() => setGi(value)}
                  style={{
                    flex: 1, padding: '0.45rem', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 600,
                    cursor: 'pointer',
                    border: `1.5px solid ${isActive ? color : 'var(--glass-border)'}`,
                    background: isActive ? `${color}22` : 'transparent',
                    color: isActive ? color : 'var(--text-muted)',
                    transition: 'var(--transition)',
                  }}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn" style={{ flex: 1 }} onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave} disabled={!isValid}>
            <Save size={16} /> Sauvegarder
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditMealModal;
