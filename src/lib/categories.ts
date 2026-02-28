export type MealCategory = 'petit-déjeuner' | 'déjeuner' | 'dîner' | 'collation';

export const CATEGORY_CONFIG: Record<MealCategory, { label: string; color: string; emoji: string }> = {
  'petit-déjeuner': { label: 'Petit-déj.', color: '#F59E0B', emoji: '☕' },
  'déjeuner':       { label: 'Déjeuner',   color: '#3B82F6', emoji: '🍽️' },
  'dîner':          { label: 'Dîner',       color: '#8B5CF6', emoji: '🌙' },
  'collation':      { label: 'Collation',   color: '#EC4899', emoji: '🍎' },
};

export function detectCategory(date: Date): MealCategory {
  const hour = date.getHours();
  if (hour >= 5  && hour < 10) return 'petit-déjeuner';
  if (hour >= 10 && hour < 15) return 'déjeuner';
  if (hour >= 18 && hour < 23) return 'dîner';
  return 'collation';
}
