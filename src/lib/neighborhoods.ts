// Neighborhood identity colors — each JC neighborhood gets its own accent
export const NEIGHBORHOOD_COLORS: Record<string, string> = {
  'Downtown':        '#F5A623',   // orange  (primary brand)
  'Journal Square':  '#EF4444',   // red
  'Bergen-Lafayette':'#FFD700',   // gold
  'Greenville':      '#4CAF50',   // green
  'The Heights':     '#8B5CF6',   // purple
  'West Side':       '#F97316',   // deep orange
  'Bayonne':         '#2196F3',   // blue
  'Hoboken':         '#EC4899',   // pink
};

export function getNeighborhoodColor(neighborhood: string): string {
  if (!neighborhood) return '#F5A623';
  const key = Object.keys(NEIGHBORHOOD_COLORS).find(
    (k) => neighborhood.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(neighborhood.toLowerCase())
  );
  return key ? NEIGHBORHOOD_COLORS[key] : '#F5A623';
}

// Asphalt texture: a repeating dot-grid SVG as a data URI usable in web
export const ASPHALT_TEXTURE_URI =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Ccircle cx='1' cy='1' r='0.8' fill='rgba(255,255,255,0.04)'/%3E%3C/svg%3E";
