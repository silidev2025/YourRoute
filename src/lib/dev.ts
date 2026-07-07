type LngLat = [number, number];

function getCurrentUrl() {
  if (typeof window === "undefined") return null;
  return new URL(window.location.href);
}

function getBooleanParam(name: string) {
  const value = getCurrentUrl()?.searchParams.get(name);
  if (value === null || value === undefined) return false;
  if (value === "") return true;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function parseLngLat(value: string | null): LngLat | null {
  if (!value) return null;

  const [lng, lat, extra] = value.split(/[,\s]+/).map(Number);
  if (
    lng === undefined ||
    lat === undefined ||
    extra !== undefined ||
    !Number.isFinite(lng) ||
    !Number.isFinite(lat)
  ) {
    return null;
  }

  return [lng, lat];
}

export function getMockLocation(): LngLat | null {
  const url = getCurrentUrl();
  return parseLngLat(
    url?.searchParams.get("mockLocation") ??
      url?.searchParams.get("mock") ??
      null,
  );
}

export function isCaptureMode() {
  return getBooleanParam("captureMode") || getBooleanParam("pathCapture");
}
