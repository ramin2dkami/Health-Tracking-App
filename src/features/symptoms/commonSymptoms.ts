export const COMMON_SYMPTOMS = [
  'Headache',
  'Bloating',
  'Fatigue',
  'Nausea',
  'Stomach pain',
  'Heartburn',
  'Diarrhea',
  'Constipation',
  'Rash',
  'Itchy skin',
  'Joint pain',
  'Brain fog',
  'Congestion',
  'Dizziness',
];

export function capitalize(name: string) {
  const clean = name.trim();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}
