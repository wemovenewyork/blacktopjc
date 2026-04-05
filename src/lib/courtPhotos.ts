// Curated basketball court photos from Unsplash
// Each URL is a direct Unsplash CDN link to a basketball court photo

const COURT_PHOTO_POOL = [
  // Outdoor asphalt courts — urban/NYC vibe
  'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=75&fit=crop',
  'https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=800&q=75&fit=crop',
  'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&q=75&fit=crop',
  'https://images.unsplash.com/photo-1519861531473-9200262188bf?w=800&q=75&fit=crop',
  'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=800&q=75&fit=crop',
  'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=800&q=75&fit=crop',
  'https://images.unsplash.com/photo-1534482421-64566f976cfa?w=800&q=75&fit=crop',
  'https://images.unsplash.com/photo-1533740566848-5f7d3e04e3d7?w=800&q=75&fit=crop',
];

// Known Jersey City courts mapped to specific photos
const JC_COURT_MAP: Record<string, string> = {
  'pershing field': 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=75&fit=crop',
  'hamilton park': 'https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=800&q=75&fit=crop',
  'berry lane park': 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&q=75&fit=crop',
  'marion park': 'https://images.unsplash.com/photo-1519861531473-9200262188bf?w=800&q=75&fit=crop',
  'van vorst park': 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=800&q=75&fit=crop',
  'west side park': 'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=800&q=75&fit=crop',
  'lincoln park': 'https://images.unsplash.com/photo-1534482421-64566f976cfa?w=800&q=75&fit=crop',
  'caven point': 'https://images.unsplash.com/photo-1533740566848-5f7d3e04e3d7?w=800&q=75&fit=crop',
};

export function getCourtPhoto(courtName: string): string {
  const key = courtName.toLowerCase().trim();

  // Check exact or partial match
  for (const [mapKey, url] of Object.entries(JC_COURT_MAP)) {
    if (key.includes(mapKey) || mapKey.includes(key)) {
      return url;
    }
  }

  // Deterministic fallback based on name hash
  let hash = 0;
  for (let i = 0; i < courtName.length; i++) {
    hash = courtName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COURT_PHOTO_POOL[Math.abs(hash) % COURT_PHOTO_POOL.length];
}
