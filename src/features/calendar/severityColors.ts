// Index 0 = no data; 1–5 = max symptom severity that day.
export const SEVERITY_COLORS = ['#ebe3d1', '#cfe6b3', '#f6dc5c', '#f7c38a', '#f4a7cf', '#e2557f'];

export function severityColor(severity: number | undefined): string {
  return SEVERITY_COLORS[severity ?? 0];
}
