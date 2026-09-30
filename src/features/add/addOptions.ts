import type { IconName } from '../../components/Icon';

export type AddMode = 'menu' | 'symptom' | 'food' | 'mood';

export const ADD_OPTIONS: { mode: Exclude<AddMode, 'menu'>; label: string; hint: string; icon: IconName; color: string }[] = [
  { mode: 'symptom', label: 'Symptom', hint: 'Flare-up, pain, skin', icon: 'bolt', color: 'var(--pink)' },
  { mode: 'food', label: 'Food', hint: 'What you ate, or a saved meal', icon: 'food', color: 'var(--yellow)' },
  { mode: 'mood', label: 'Mood & stress', hint: 'Mood, stress, anxiety', icon: 'smile', color: 'var(--lavender)' },
];
