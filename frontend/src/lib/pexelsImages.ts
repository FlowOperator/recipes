const PEXELS_API_KEY = import.meta.env.VITE_PEXELS_API_KEY;

// Simple in-memory cache to avoid refetching the same search term
const imageCache = new Map<string, string>();

/**
 * Fetches a relevant food photo URL from Pexels based on the recipe name.
 * Returns a small/medium image URL suitable for cards and detail views.
 * Falls back to null if Pexels is unavailable or returns no results.
 */
export async function getPexelsImageUrl(recipeName: string): Promise<string | null> {
  if (!PEXELS_API_KEY) return null;

  const searchTerm = recipeName.trim().toLowerCase();
  if (!searchTerm) return null;

  // Check cache first
  if (imageCache.has(searchTerm)) {
    return imageCache.get(searchTerm)!;
  }

  try {
    const query = encodeURIComponent(searchTerm + ' food');
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${query}&per_page=1&orientation=landscape`,
      { headers: { Authorization: PEXELS_API_KEY } }
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (data.photos && data.photos.length > 0) {
      const url = data.photos[0].src.medium as string;
      imageCache.set(searchTerm, url);
      return url;
    }

    // No results for specific name — try a broader food search
    imageCache.set(searchTerm, '');
    return null;
  } catch {
    return null;
  }
}
