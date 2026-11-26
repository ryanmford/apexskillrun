import express from "express";
import { createServer as createViteServer } from "vite";
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { getPageMeta } from './src/meta-injector.ts';
import { getMapboxStaticImageUrl } from './src/lib/mapbox.ts';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import crypto from 'crypto';

class OgImageCache {
  private cache = new Map<string, Buffer>();
  private readonly maxKeys = 500;

  get(title: string, desc: string): Buffer | null {
    const key = this.hash(title, desc);
    if (this.cache.has(key)) {
      const buffer = this.cache.get(key)!;
      // Refresh key order (LRU behavior)
      this.cache.delete(key);
      this.cache.set(key, buffer);
      return buffer;
    }
    return null;
  }

  set(title: string, desc: string, buffer: Buffer): void {
    const key = this.hash(title, desc);
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxKeys) {
      // LRU eviction: the Map.keys().next().value returns the oldest inserted element
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, buffer);
  }

  private hash(title: string, desc: string): string {
    return crypto
      .createHash('sha256')
      .update(`${title}||${desc}`)
      .digest('hex');
  }
}

const ogCache = new OgImageCache();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SPREADSHEET_ID = process.env.SPREADSHEET_ID || '19qI0mQJc4iW_tz-OycA1atgAM4qMzrS_diChMAbrobo';


function toCodePoint(unicodeSurrogates: string) {
  const r = [];
  let c = 0, p = 0, i = 0;
  while (i < unicodeSurrogates.length) {
    c = unicodeSurrogates.charCodeAt(i++);
    if (p) {
      r.push((65536 + ((p - 55296) << 10) + (c - 56320)).toString(16));
      p = 0;
    } else if (55296 <= c && c <= 56319) {
      p = c;
    } else {
      r.push(c.toString(16));
    }
  }
  return r.filter(cp => cp !== 'fe0f').join('-');
}

const MAX_MAP_IMAGE_CACHE_KEYS = 500;
const mapImageCache = new Map<string, string>();

const MAX_EMOJI_CACHE_KEYS = 200;
const emojiCache = new Map<string, string>();

let cachedFontData: Buffer | null = null;
async function getInterFontData(): Promise<Buffer> {
  if (cachedFontData) return cachedFontData;
  cachedFontData = await fs.readFile(
    path.join(
      process.cwd(),
      "node_modules",
      "@fontsource",
      "inter",
      "files",
      "inter-latin-700-normal.woff",
    ),
  );
  return cachedFontData;
}

async function getMapboxStaticImage(coords: [number, number] | null): Promise<string | null> {
  if (!coords || coords.length !== 2) return null;
  const [lat, lon] = coords;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const zoom = 13;
  const cacheKey = `${lat.toFixed(5)},${lon.toFixed(5)},${zoom}`;
  if (mapImageCache.has(cacheKey)) {
    const existing = mapImageCache.get(cacheKey)!;
    mapImageCache.delete(cacheKey);
    mapImageCache.set(cacheKey, existing);
    return existing;
  }

  try {
    const url = getMapboxStaticImageUrl(lat, lon, zoom, 1200, 630, true);
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const dataUri = `data:image/png;base64,${buffer.toString("base64")}`;
    if (mapImageCache.size >= MAX_MAP_IMAGE_CACHE_KEYS) {
      const oldestKey = mapImageCache.keys().next().value;
      if (oldestKey !== undefined) {
        mapImageCache.delete(oldestKey);
      }
    }
    mapImageCache.set(cacheKey, dataUri);
    return dataUri;
  } catch {
    return null;
  }
}

function getOgImageSvg(
  title: string,
  desc: string,
  _type?: string,
  stats?: { value: string; label: string }[],
  mapImageDataUri?: string | null,
) {
  const hasStats = Boolean(stats && stats.length > 0);
  const statCount = stats ? stats.length : 0;
  const isSingleStat = statCount === 1;
  const isGridStats = statCount > 2;

  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        height: '100%',
        width: '100%',
        flexDirection: 'column',
        backgroundColor: '#09090b',
        color: '#ffffff',
        fontFamily: 'Inter',
        padding: '60px 80px',
        position: 'relative',
        overflow: 'hidden',
      },
      children: [
        ...(mapImageDataUri
          ? [
              {
                type: 'img',
                props: {
                  src: mapImageDataUri,
                  width: 1200,
                  height: 630,
                  style: {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: 1200,
                    height: 630,
                    objectFit: 'cover',
                    opacity: 0.55,
                  },
                },
              },
              {
                type: 'div',
                props: {
                  style: {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: 1200,
                    height: 630,
                    backgroundImage:
                      'linear-gradient(to right, rgba(9, 9, 11, 0.82) 0%, rgba(9, 9, 11, 0.45) 45%, rgba(9, 9, 11, 0.18) 100%)',
                  },
                },
              },
              {
                type: 'div',
                props: {
                  style: {
                    position: 'absolute',
                    right: 22,
                    bottom: 14,
                    fontSize: 15,
                    fontWeight: 700,
                    color: 'rgba(255, 255, 255, 0.42)',
                    letterSpacing: '0.01em',
                  },
                  children: '© Mapbox © OpenStreetMap',
                },
              },
            ]
          : []),
        {
          type: 'div',
          props: {
            style: {
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              height: '100%',
              width: '100%',
            },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                  },
                  children: [
                    {
                      type: 'div',
                      props: {
                        style: {
                          fontSize: 36,
                          fontWeight: 700,
                          color: '#ffffff',
                          letterSpacing: '0.05em',
                          textTransform: 'uppercase',
                        },
                        children: 'APEX SKILL RUN',
                      },
                    },
                  ],
                },
              },
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                    width: '100%',
                  },
                  children: [
                    {
                      type: 'div',
                      props: {
                        style: {
                          display: 'flex',
                          flexDirection: 'column',
                          maxWidth: hasStats ? (isSingleStat ? '830px' : '660px') : '1040px',
                        },
                        children: [
                          {
                            type: 'div',
                            props: {
                              style: {
                                fontSize: hasStats
                                  ? title.length > 26
                                    ? 58
                                    : title.length > 20
                                      ? 64
                                      : 72
                                  : 96,
                                fontWeight: 700,
                                marginBottom: '22px',
                                lineHeight: 1.08,
                                color: '#ffffff',
                                letterSpacing: '-0.04em',
                                textTransform: 'uppercase',
                              },
                              children: title,
                            },
                          },
                          {
                            type: 'div',
                            props: {
                              style: {
                                display: 'flex',
                                alignItems: 'center',
                              },
                              children: [
                                {
                                  type: 'div',
                                  props: {
                                    style: {
                                      fontSize: hasStats ? 34 : 40,
                                      color: '#f4f4f5',
                                      lineHeight: 1.25,
                                      letterSpacing: '-0.02em',
                                      fontWeight: 700,
                                    },
                                    children: desc,
                                  },
                                },
                              ],
                            },
                          },
                        ],
                      },
                    },
                    hasStats && stats
                      ? {
                          type: 'div',
                          props: {
                            style: {
                              display: 'flex',
                              flexDirection: isGridStats ? 'row' : 'column',
                              flexWrap: isGridStats ? 'wrap' : 'nowrap',
                              alignItems: 'flex-end',
                              justifyContent: 'flex-end',
                              gap: isGridStats ? '0px' : '36px',
                              width: isGridStats ? '400px' : 'auto',
                            },
                            children: stats.map((stat, i) => ({
                              type: 'div',
                              props: {
                                style: {
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: isGridStats ? 'flex-start' : 'flex-end',
                                  textAlign: isGridStats ? 'left' : 'right',
                                  width: isGridStats ? '50%' : 'auto',
                                  marginBottom: isGridStats && i < 2 ? '32px' : '0px',
                                },
                                children: [
                                  {
                                    type: 'div',
                                    props: {
                                      style: {
                                        fontSize: isGridStats ? 64 : isSingleStat ? 128 : 100,
                                        fontWeight: 700,
                                        color: '#ffffff',
                                        lineHeight: 0.95,
                                        letterSpacing: '-0.05em',
                                      },
                                      children: stat.value,
                                    },
                                  },
                                  {
                                    type: 'div',
                                    props: {
                                      style: {
                                        fontSize: isGridStats ? 20 : isSingleStat ? 26 : 24,
                                        fontWeight: 700,
                                        color: '#e4e4e7',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.06em',
                                        marginTop: isGridStats ? '8px' : '14px',
                                      },
                                      children: stat.label,
                                    },
                                  },
                                ],
                              },
                            })),
                          },
                        }
                      : null,
                  ].filter(Boolean),
                },
              },
            ],
          },
        },
      ],
    },
  } as any;
}

async function startServer() {
  const app = express();
  app.set('trust proxy', true);
  const PORT = 3000;

  // Set Service-Worker-Allowed header for service workers
  app.use((req, res, next) => {
    if (req.path.endsWith('service-worker.js') || req.path.endsWith('sw.js')) {
      res.setHeader('Service-Worker-Allowed', '/');
    }
    next();
  });

  // Proxy route for Google Sheets to avoid CORS
  app.get('/api/proxy-sheet', async (req, res) => {
    const { gid, cb } = req.query;
    if (!gid) return res.status(400).send('Missing gid');
    
    try {
      const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}&cb=${cb || Date.now()}`;
      
      let response;
      let retries = 3;
      while (retries > 0) {
        response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          }
        });
        if (response.ok) break;
        retries--;
        if (retries > 0) await new Promise(r => setTimeout(r, 1000));
      }
      
      if (!response || !response.ok) {
        const status = response ? response.status : 'Unknown';
        console.error(`Google Sheets final response: ${status}`);
        throw new Error(`Google Sheets responded with ${status}`);
      }
      
      const data = await response.text();
      res.header('Content-Type', 'text/csv');
      res.send(data);
    } catch (error) {
      console.error('Proxy Fetch Error:', error);
      res.status(500).send('Failed to fetch sheet data');
    }
  });

  // Generate Dynamic OG Images
  app.get('/api/og.png', async (req, res) => {
    try {
      let title = (req.query.title as string) || 'Apex Skill Run';
      let desc = (req.query.desc as string) || 'Global Parkour Leaderboards and Challenge Directory';
      
      const reqPath = req.query.path as string;
      const reqQuery = req.query.query as string;
      
      let type: any;
      let stats: { value: string; label: string }[] | undefined;
      let mapCoords: [number, number] | null = null;
      
      if (reqPath) {
        const searchParams = new URLSearchParams(reqQuery || "");
        const meta = await getPageMeta(reqPath, searchParams, false);
        title = meta.title?.toUpperCase() || title;
        desc = meta.description || desc;
        type = meta.ogType;
        stats = meta.ogStats?.map(s => ({
          value: s.value?.toUpperCase(),
          label: s.label?.toUpperCase(),
        }));
        mapCoords = meta.ogMapCoords || null;
      }

      const cacheDescKey = `v2||${desc}||${JSON.stringify(stats || null)}||${JSON.stringify(mapCoords)}`;
      const cachedBuffer = ogCache.get(title, cacheDescKey);
      if (cachedBuffer) {
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.send(cachedBuffer);
      }

      const [fontData, mapImageDataUri] = await Promise.all([
        getInterFontData(),
        mapCoords ? getMapboxStaticImage(mapCoords) : Promise.resolve(null),
      ]);

      const svg = await satori(
        getOgImageSvg(title, desc, type, stats, mapImageDataUri),
        {
          width: 1200,
          height: 630,
          fonts: [
            {
              name: 'Inter',
              data: fontData,
              weight: 700,
              style: 'normal',
            },
          ],
          loadAdditionalAsset: async (code, segment) => {
            if (code === 'emoji') {
              const cp = toCodePoint(segment);
              if (emojiCache.has(cp)) {
                return emojiCache.get(cp)!;
              }
              const url = `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/${cp}.svg`;
              try {
                const emojiRes = await fetch(url, { signal: AbortSignal.timeout(3000) });
                if (emojiRes.ok) {
                  const text = await emojiRes.text();
                  const dataUri = `data:image/svg+xml;base64,${Buffer.from(text).toString('base64')}`;
                  if (emojiCache.size >= MAX_EMOJI_CACHE_KEYS) {
                    const oldestKey = emojiCache.keys().next().value;
                    if (oldestKey !== undefined) {
                      emojiCache.delete(oldestKey);
                    }
                  }
                  emojiCache.set(cp, dataUri);
                  return dataUri;
                }
              } catch {
                // ignore
              }
            }
            return '';
          },
        },
      );

      const resvg = new Resvg(svg, {
        background: '#09090b',
        fitTo: { mode: 'width', value: 1200 },
      });

      const pngBuffer = resvg.render().asPng();
      ogCache.set(title, cacheDescKey, pngBuffer);

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(pngBuffer);
    } catch (error) {
      console.error('OG Image Error:', error);
      res.status(500).send('Failed to generate OG image');
    }
  });


  const STATIC_ASSET_REGEX = /\.(png|jpe?g|gif|webp|avif|svg|ico|css|js|mjs|map|woff2?|ttf|eot|mp4|webm|mov|m4v|mp3|wav|pdf|txt|xml|webmanifest)$/i;
  const escapeHtmlAttr = (str: string) =>
    String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom",
    });
    app.use(vite.middlewares);

    app.get('*', async (req, res, next) => {
      // Prevent returning HTML for missing static files (images, video, css, js)
      if (STATIC_ASSET_REGEX.test(req.path)) {
        return res.status(404).end();
      }
      try {
        const url = req.originalUrl;
        let template = await fs.readFile(path.join(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        
        const searchParams = new URLSearchParams(req.query as any);
        const meta = await getPageMeta(req.path, searchParams);
        const safeTitle = escapeHtmlAttr(meta.title);
        const safeDesc = escapeHtmlAttr(meta.description);
        
        const baseUrl = req.headers.host && req.headers.host.includes('localhost') ? 'http://localhost:3000' : 'https://' + (req.headers['x-forwarded-host'] || req.headers.host || 'apexskillrun.com');
        const currentUrl = escapeHtmlAttr(`${baseUrl}${req.originalUrl}`);
        const ogImageUrl = `${baseUrl}/api/og.png?path=${encodeURIComponent(req.path)}&query=${encodeURIComponent(searchParams.toString())}`;
        const escapedOgImageUrl = escapeHtmlAttr(ogImageUrl);
        template = template
          .replace(/<title>.*?<\/title>/s, `<title>${safeTitle}</title>`)
          .replace(/<meta name="title"[^>]*>/i, `<meta name="title" content="${safeTitle}">`)
          .replace(/<meta name="description"[^>]*>/i, `<meta name="description" content="${safeDesc}">`)
          .replace(/<meta property="og:title"[^>]*>/i, `<meta property="og:title" content="${safeTitle}">`)
          .replace(/<meta property="og:description"[^>]*>/i, `<meta property="og:description" content="${safeDesc}">`)
          .replace(/<meta property="og:url"[^>]*>/i, `<meta property="og:url" content="${currentUrl}">`)
          .replace(/<meta property="og:image"[^>]*>/i, `<meta property="og:image" content="${escapedOgImageUrl}">`)
          .replace(/<meta (?:name|property)="twitter:url"[^>]*>/i, `<meta name="twitter:url" content="${currentUrl}">`)
          .replace(/<meta (?:name|property)="twitter:title"[^>]*>/i, `<meta name="twitter:title" content="${safeTitle}">`)
          .replace(/<meta (?:name|property)="twitter:description"[^>]*>/i, `<meta name="twitter:description" content="${safeDesc}">`)
          .replace(/<meta (?:name|property)="twitter:image"[^>]*>/i, `<meta name="twitter:image" content="${escapedOgImageUrl}">`);
          
        if (meta.initialData) {
          template = template.replace('</head>', `
            <script>
              window.__INITIAL_DATA__ = ${JSON.stringify(meta.initialData).replace(/</g, '\\u003c')};
            </script>
          </head>
          `);
        }
        
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { index: false })); // Disable index fallback from static
    
    app.get('*', async (req, res, next) => {
      // Prevent returning HTML for missing static files (images, video, css, js)
      if (STATIC_ASSET_REGEX.test(req.path)) {
        return res.status(404).end();
      }
      try {
        let template = await fs.readFile(path.join(distPath, 'index.html'), 'utf-8');
        const searchParams = new URLSearchParams(req.query as any);
        const meta = await getPageMeta(req.path, searchParams);
        const safeTitle = escapeHtmlAttr(meta.title);
        const safeDesc = escapeHtmlAttr(meta.description);
        
        const baseUrl = req.headers.host && req.headers.host.includes('localhost') ? 'http://localhost:3000' : 'https://' + (req.headers['x-forwarded-host'] || req.headers.host || 'apexskillrun.com');
        const currentUrl = escapeHtmlAttr(`${baseUrl}${req.originalUrl}`);
        const ogImageUrl = `${baseUrl}/api/og.png?path=${encodeURIComponent(req.path)}&query=${encodeURIComponent(searchParams.toString())}`;
        const escapedOgImageUrl = escapeHtmlAttr(ogImageUrl);
        template = template
          .replace(/<title>.*?<\/title>/s, `<title>${safeTitle}</title>`)
          .replace(/<meta name="title"[^>]*>/i, `<meta name="title" content="${safeTitle}">`)
          .replace(/<meta name="description"[^>]*>/i, `<meta name="description" content="${safeDesc}">`)
          .replace(/<meta property="og:title"[^>]*>/i, `<meta property="og:title" content="${safeTitle}">`)
          .replace(/<meta property="og:description"[^>]*>/i, `<meta property="og:description" content="${safeDesc}">`)
          .replace(/<meta property="og:url"[^>]*>/i, `<meta property="og:url" content="${currentUrl}">`)
          .replace(/<meta property="og:image"[^>]*>/i, `<meta property="og:image" content="${escapedOgImageUrl}">`)
          .replace(/<meta (?:name|property)="twitter:url"[^>]*>/i, `<meta name="twitter:url" content="${currentUrl}">`)
          .replace(/<meta (?:name|property)="twitter:title"[^>]*>/i, `<meta name="twitter:title" content="${safeTitle}">`)
          .replace(/<meta (?:name|property)="twitter:description"[^>]*>/i, `<meta name="twitter:description" content="${safeDesc}">`)
          .replace(/<meta (?:name|property)="twitter:image"[^>]*>/i, `<meta name="twitter:image" content="${escapedOgImageUrl}">`);
          
        if (meta.initialData) {
          template = template.replace('</head>', `
            <script>
              window.__INITIAL_DATA__ = ${JSON.stringify(meta.initialData).replace(/</g, '\\u003c')};
            </script>
          </head>
          `);
        }
        
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        next(e);
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
