/**
 * Offline Audio Lecture Caching Engine using CacheStorage API.
 * Enables students to pre-fetch audio lectures for offline playback.
 */

const AUDIO_CACHE_NAME = 'asala-audio-v1';

export async function isAudioCached(audioUrl: string): Promise<boolean> {
  if (typeof window === 'undefined' || !('caches' in window) || !audioUrl) return false;
  try {
    const cache = await caches.open(AUDIO_CACHE_NAME);
    const match = await cache.match(audioUrl);
    return !!match;
  } catch (err) {
    console.warn('Error checking audio cache:', err);
    return false;
  }
}

export async function cacheAudioLecture(audioUrl: string): Promise<boolean> {
  if (typeof window === 'undefined' || !('caches' in window) || !audioUrl) return false;
  try {
    const cache = await caches.open(AUDIO_CACHE_NAME);
    const response = await fetch(audioUrl);
    if (response.ok) {
      await cache.put(audioUrl, response.clone());
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Error pre-fetching audio lecture:', err);
    return false;
  }
}

export async function getCachedAudioObjectUrl(audioUrl: string): Promise<string | null> {
  if (typeof window === 'undefined' || !('caches' in window) || !audioUrl) return null;
  try {
    const cache = await caches.open(AUDIO_CACHE_NAME);
    const response = await cache.match(audioUrl);
    if (response) {
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    }
    return null;
  } catch (err) {
    console.warn('Error reading cached audio blob:', err);
    return null;
  }
}

export async function evictAudioCache(audioUrl: string): Promise<boolean> {
  if (typeof window === 'undefined' || !('caches' in window) || !audioUrl) return false;
  try {
    const cache = await caches.open(AUDIO_CACHE_NAME);
    return await cache.delete(audioUrl);
  } catch (err) {
    console.warn('Error evicting audio cache:', err);
    return false;
  }
}
