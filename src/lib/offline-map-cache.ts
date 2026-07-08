const MAP_CACHE_NAME = "map-assets";
const CACHE_READY_KEY = "yourroute:citu-map-cache:v1";
const MAPTILER_KEY = "B6m4DQknxd9wZ70DnDV4";

const TILE_COORDS = [
  [12, 3457, 1930],
  [13, 6914, 3860],
  [13, 6915, 3860],
  [14, 13829, 7720],
  [14, 13830, 7720],
  [14, 13829, 7721],
  [14, 13830, 7721],
] as const;

const FONT_STACKS = [
  "Roboto Regular",
  "Roboto Medium",
  "Roboto Condensed Italic",
] as const;

const GLYPH_RANGES = ["0-255", "256-511"] as const;

const TILE_JSON_URL = `https://api.maptiler.com/tiles/v3-openmaptiles/tiles.json?key=${MAPTILER_KEY}`;
const SPRITE_BASE_URL =
  "https://maputnik.github.io/osm-liberty/sprites/osm-liberty";
const GLYPH_BASE_URL = "https://orangemug.github.io/font-glyphs/glyphs";

const OFFLINE_MAP_ASSET_URLS = [
  TILE_JSON_URL,
  `${SPRITE_BASE_URL}.json`,
  `${SPRITE_BASE_URL}.png`,
  `${SPRITE_BASE_URL}@2x.json`,
  `${SPRITE_BASE_URL}@2x.png`,
  ...TILE_COORDS.map(
    ([z, x, y]) =>
      `https://api.maptiler.com/tiles/v3-openmaptiles/${z}/${x}/${y}.pbf?key=${MAPTILER_KEY}`,
  ),
  ...FONT_STACKS.flatMap((fontStack) =>
    GLYPH_RANGES.map(
      (range) =>
        `${GLYPH_BASE_URL}/${encodeURIComponent(fontStack)}/${range}.pbf`,
    ),
  ),
];

export async function preloadOfflineMapAssets() {
  try {
    if (
      typeof window === "undefined" ||
      !navigator.onLine ||
      !("caches" in window)
    ) {
      return;
    }

    if (window.localStorage.getItem(CACHE_READY_KEY) === "ready") {
      return;
    }

    const cache = await window.caches.open(MAP_CACHE_NAME);
    const results = await Promise.allSettled(
      OFFLINE_MAP_ASSET_URLS.map(async (url) => {
        const request = new Request(url, { mode: "cors" });
        const cached = await cache.match(request);
        if (cached) return;

        const response = await fetch(request);
        if (!response.ok && response.type !== "opaque") {
          throw new Error(`Unable to cache ${url}`);
        }

        await cache.put(request, response);
      }),
    );

    const cachedCount = results.filter(
      (result) => result.status === "fulfilled",
    ).length;

    if (cachedCount === OFFLINE_MAP_ASSET_URLS.length) {
      window.localStorage.setItem(CACHE_READY_KEY, "ready");
    }
  } catch {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(CACHE_READY_KEY);
    }
  }
}
