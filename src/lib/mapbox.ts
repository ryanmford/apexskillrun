const DEFAULT_MAPBOX_PUBLIC_TOKEN_B64 =
  "cGsuZXlKMUlqb2lZWEJsZUcxdmRtVnRaVzUwSWl3aVlTSTZJbU50ZEdJMmMycHBOakE0TTJzeWVIQjRiM041ZDJ4dU5XY2lmUS5hdFAzRW55VmVzSFJsSnlVZldGUU5n";

export const DEFAULT_MAPBOX_LIGHT_STYLE = "mapbox/light-v11";
export const DEFAULT_MAPBOX_DARK_STYLE = "mapbox/dark-v11";
export const DEFAULT_MAPBOX_SATELLITE_STYLE = "mapbox/satellite-streets-v12";

function decodeBase64(b64: string): string {
  if (typeof atob === "function") {
    return atob(b64);
  }
  if (typeof Buffer !== "undefined") {
    return Buffer.from(b64, "base64").toString("utf8");
  }
  return "";
}

function readEnv(key: string): string | undefined {
  const metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> })?.env;
  if (metaEnv && typeof metaEnv[key] === "string" && metaEnv[key]) {
    return metaEnv[key];
  }
  if (typeof process !== "undefined" && process.env && process.env[key]) {
    return process.env[key];
  }
  return undefined;
}

export function getMapboxAccessToken(): string {
  return (
    readEnv("MAPBOX_ACCESS_TOKEN") ||
    readEnv("VITE_MAPBOX_ACCESS_TOKEN") ||
    readEnv("VITE_MAPBOX_TOKEN") ||
    decodeBase64(DEFAULT_MAPBOX_PUBLIC_TOKEN_B64)
  );
}

export function getMapboxStyles() {
  return {
    light: readEnv("VITE_MAPBOX_LIGHT_STYLE") || DEFAULT_MAPBOX_LIGHT_STYLE,
    dark: readEnv("VITE_MAPBOX_DARK_STYLE") || DEFAULT_MAPBOX_DARK_STYLE,
    satellite: DEFAULT_MAPBOX_SATELLITE_STYLE,
  };
}

export function getMapboxTileUrls() {
  const token = getMapboxAccessToken();
  const styles = getMapboxStyles();
  return {
    light: `https://api.mapbox.com/styles/v1/${styles.light}/tiles/256/{z}/{x}/{y}@2x?access_token=${token}`,
    dark: `https://api.mapbox.com/styles/v1/${styles.dark}/tiles/256/{z}/{x}/{y}@2x?access_token=${token}`,
    satellite: `https://api.mapbox.com/styles/v1/${styles.satellite}/tiles/256/{z}/{x}/{y}@2x?access_token=${token}`,
  };
}

export function getMapboxStaticImageUrl(
  lat: number,
  lon: number,
  zoom: number = 13,
  width: number = 1200,
  height: number = 630,
  retina: boolean = true,
): string {
  const token = getMapboxAccessToken();
  const { dark } = getMapboxStyles();
  const suffix = retina ? "@2x" : "";
  return `https://api.mapbox.com/styles/v1/${dark}/static/${lon.toFixed(5)},${lat.toFixed(5)},${zoom},0/${width}x${height}${suffix}?logo=false&attribution=false&access_token=${encodeURIComponent(token)}`;
}
