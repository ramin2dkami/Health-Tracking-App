export const ONBOARDING_GOALS = [
  { id: 'food-triggers', label: 'Find my food triggers' },
  { id: 'flare-ups', label: 'Understand my flare-ups' },
  { id: 'stress-mood', label: 'See how stress and mood affect me' },
  { id: 'what-helps', label: 'Spot what helps me feel better' },
  { id: 'weather', label: 'Check if weather plays a role' },
  { id: 'doctor', label: 'Keep a record for my doctor' },
];

export function goalLabel(id: string) {
  return ONBOARDING_GOALS.find((g) => g.id === id)?.label ?? id;
}

// Lowercase to match how food tags are stored.
export const COMMON_TRIGGERS = [
  'dairy',
  'gluten',
  'coffee',
  'alcohol',
  'onion',
  'garlic',
  'spicy food',
  'sugar',
  'fried food',
  'eggs',
  'soy',
  'beans',
];
