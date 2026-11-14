/*!
 * Chess
 * Copyright (c) Cliff Pyles
 * Released under the MIT License: https://opensource.org/license/mit
 * Original: https://codepen.io/editor/cliffpyles/pen/01a19e25-e438-75a3-a372-c9c67de14514
 */

// Intended use: data-agnostic helpers: resolving importmap names, keeping large downloads in local storage, reading saved values safely, and small math.

// -----------------------------------------------------------------------------
// Importmap
// -----------------------------------------------------------------------------
export const resolveImport = (specifier: string): string =>
  (import.meta as unknown as { resolve: (name: string) => string }).resolve(
    specifier
  );

// -----------------------------------------------------------------------------
// Large downloads: fetched once, then read back from the Cache API
// -----------------------------------------------------------------------------
let cacheName = "pen-assets";
export const useCacheNamed = (name: string): void => {
  cacheName = name;
  const family = name.replace(/\d+$/, "");
  if (!("caches" in globalThis)) return;
  void caches
    .keys()
    .then((names) =>
      names
        .filter((old) => old.startsWith(family) && old !== name)
        .forEach((old) => void caches.delete(old))
    )
    .catch(() => undefined);
};

const openCache = async (): Promise<Cache | null> => {
  try {
    return "caches" in globalThis ? await caches.open(cacheName) : null;
  } catch {
    return null;
  }
};

const readWithProgress = async (
  response: Response,
  onProgress?: (loaded: number, total: number) => void
): Promise<Blob> => {
  const total = Number(response.headers.get("content-length") ?? 0);
  if (!response.body || !onProgress) return response.blob();
  const reader = response.body.getReader();
  const pump = async (
    chunks: Uint8Array<ArrayBuffer>[],
    loaded: number
  ): Promise<Uint8Array<ArrayBuffer>[]> => {
    const { done, value } = await reader.read();
    if (done || !value) return chunks;
    onProgress(loaded + value.length, total);
    return pump(
      [...chunks, value as Uint8Array<ArrayBuffer>],
      loaded + value.length
    );
  };
  return new Blob(await pump([], 0), {
    type: response.headers.get("content-type") ?? ""
  });
};

export const cachedBlob = async (
  url: string,
  onProgress?: (loaded: number, total: number) => void
): Promise<Blob> => {
  const cache = await openCache();
  const hit = await cache?.match(url);
  if (hit) {
    const blob = await hit.blob();
    onProgress?.(blob.size, blob.size);
    return blob;
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const blob = await readWithProgress(response, onProgress);
  await cache
    ?.put(url, new Response(blob, { headers: { "content-type": blob.type } }))
    .catch(() => undefined);
  return blob;
};

// -----------------------------------------------------------------------------
// Saved values
// -----------------------------------------------------------------------------
export const readSaved = (key: string): unknown => {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? undefined : JSON.parse(raw);
  } catch {
    return undefined;
  }
};

export const writeSaved = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private windows can refuse storage; play continues unsaved.
  }
};

// -----------------------------------------------------------------------------
// Math and timing
// -----------------------------------------------------------------------------
export const clamp = (value: number, low: number, high: number): number =>
  Math.min(high, Math.max(low, value));
export const pause = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
export const seeded = (seed: number): number => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
export const prefersReducedMotion = (): boolean =>
  typeof matchMedia === "function" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;
export const formatClock = (seconds: number): string => {
  const whole = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
};
