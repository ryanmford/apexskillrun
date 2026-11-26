/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef, useContext, forwardRef, useImperativeHandle } from "react";
import { Plus, Minus, Satellite, Map as MapIcon } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

import { trackEvent, cn, getSkillRating, getSkillTierConfig } from "../lib/asr-utils";
import { getMapboxTileUrls } from "../lib/mapbox";
import { ThemeContext } from "../theme-context";
import { useAppStore } from "../store/useAppStore";
import { SkillData } from "../types";

export interface ASRMapProps {
  challenges?: SkillData[];
  totalSkills?: number;
  searchQuery?: string;
  onSkillClick?: (skill: SkillData) => void;
  onPinClick?: (skill: SkillData) => void;
  onBoundsChange?: (bounds: { north: number; south: number; east: number; west: number }) => void;
  onMapClick?: () => void;
  theme?: string | null;
  className?: string;
  hideControls?: boolean;
  isSidebarOpen?: boolean;
}

const MERCATOR_BOUNDS: L.LatLngBoundsExpression = [
  [-85.05112878, -179.9999],
  [85.05112878, 179.9999],
];

export const ASRMap = forwardRef(({
  challenges = [],
  totalSkills = 0,
  searchQuery = "",
  onSkillClick,
  onPinClick,
  onBoundsChange,
  onMapClick,
  theme: propTheme,
  className,
  hideControls = false,
  isSidebarOpen = true,
}: ASRMapProps, ref: any) => {
  const contextTheme = useContext(ThemeContext);
  const theme = propTheme || contextTheme;
  const isDark = theme === "dark";

  const activeSkillId = useAppStore(s => s.activeSkillId);
  const activeSkillIdRef = useRef(activeSkillId);
  useEffect(() => {
    activeSkillIdRef.current = activeSkillId;
  }, [activeSkillId]);

  const isSidebarOpenRef = useRef(isSidebarOpen);
  useEffect(() => {
    isSidebarOpenRef.current = isSidebarOpen;
  }, [isSidebarOpen]);

  const isLocating = useAppStore(s => s.isMapLocating);
  const setIsLocating = useAppStore(s => s.setIsMapLocating);
  const mapReady = useAppStore(s => s.isMapReady);
  const setMapReady = useAppStore(s => s.setIsMapReady);
  const userLocation = useAppStore(s => s.userLocation);
  const setUserLocation = useAppStore(s => s.setUserLocation);
  const setMapViewport = useAppStore(s => s.setMapViewport);
  const mapLayerMode = useAppStore(s => s.mapLayerMode);
  const setMapLayerMode = useAppStore(s => s.setMapLayerMode);
  const setSkillSortMode = useAppStore(s => s.setSkillSortMode);
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const tileLayersRef = useRef<{ light?: L.TileLayer; dark?: L.TileLayer; satellite?: L.TileLayer }>({});
  const activeTileLayerRef = useRef<L.TileLayer | null>(null);
  const layerSwapCleanupRef = useRef<(() => void) | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const skillDataRef = useRef<Map<string, SkillData>>(new Map());
  const skillCoordsRef = useRef<Map<string, [number, number]>>(new Map());
  const userMarkerRef = useRef<L.Marker | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const locateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headingDegRef = useRef<number | null>(null);
  const orientationListenerRef = useRef<((e: DeviceOrientationEvent) => void) | null>(null);
  const hoveredMarkerIdRef = useRef<string | null>(null);
  const prevActiveIdRef = useRef<string | null>(null);
  const prevIsDarkRenderedRef = useRef<boolean | null>(null);
  const prevUserLocRenderedRef = useRef<[number, number] | null>(null);
  const isDarkRef = useRef(isDark);
  isDarkRef.current = isDark;

  const getDesktopPanelOffset = React.useCallback(() => {
    if (window.innerWidth < 768 || !isSidebarOpenRef.current) return 0;
    return window.innerWidth >= 1024 ? 450 : 400;
  }, []);

  const fitMapToSkills = React.useCallback(() => {
    if (!mapReady || !mapRef.current || !challenges) return;

    const bounds = L.latLngBounds([]);
    let validCoordsCount = 0;
    let lastValidCoord: [number, number] | null = null;

    challenges.forEach((c: any) => {
      if (c.parsedCoords && !c.isDivider) {
        bounds.extend(c.parsedCoords);
        validCoordsCount++;
        lastValidCoord = c.parsedCoords;
      }
    });

    if (validCoordsCount === 1 && lastValidCoord) {
      const isDesktop = window.innerWidth >= 768;
      const panelWidth = getDesktopPanelOffset();
      const pt = mapRef.current.project(lastValidCoord, 16);
      if (isDesktop) pt.x -= panelWidth / 2;
      else pt.y += window.innerHeight * 0.15; // Offset for mobile bottom drawer
      const targetLatLng = mapRef.current.unproject(pt, 16);
      mapRef.current.flyTo(targetLatLng, 16, { duration: 1.5 });
    } else if (validCoordsCount > 1) {
      if (bounds.isValid()) {
        const isDesktop = window.innerWidth >= 768;
        const panelWidth = getDesktopPanelOffset();
        const spanMeters = bounds.getNorthEast().distanceTo(bounds.getSouthWest());
        const targetMaxZoom = spanMeters < 80 ? 20 : spanMeters < 300 ? 18 : 15;
        mapRef.current.fitBounds(bounds, {
          paddingTopLeft: isDesktop ? [panelWidth + (panelWidth > 0 ? 16 : 50), 50] : [16, 50],
          paddingBottomRight: isDesktop ? [50, 50] : [16, window.innerHeight * 0.3 + 50],
          maxZoom: targetMaxZoom,
          duration: 1.5,
        });
      }
    } else {
      const isMobile = window.innerWidth < 768;
      const defaultCenter: L.LatLngTuple = isMobile ? [28, -100] : [15, -90];
      const defaultZoom = isMobile ? 2 : 3;
      mapRef.current.flyTo(defaultCenter, defaultZoom, { duration: 1.5 });
    }
  }, [challenges, mapReady, getDesktopPanelOffset]);

  const resetViewToDefault = React.useCallback(() => {
    if (!mapReady || !mapRef.current) return;
    setMapViewport(null);
    const isMobile = window.innerWidth < 768;
    const defaultCenter: L.LatLngTuple = isMobile ? [28, -100] : [15, -90];
    const defaultZoom = isMobile ? 2 : 3;
    mapRef.current.stop();
    mapRef.current.flyTo(defaultCenter, defaultZoom, { duration: 1.0 });
  }, [mapReady, setMapViewport]);

  const frameSkillAndUser = React.useCallback((skillCoords: [number, number]) => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    map.stop();
    const currentLoc = useAppStore.getState().userLocation;
    const isDesktop = window.innerWidth >= 768;
    const panelWidth = getDesktopPanelOffset();

    if (currentLoc) {
      const bounds = L.latLngBounds([currentLoc, skillCoords]);
      const distMeters = L.latLng(currentLoc).distanceTo(skillCoords);
      map.fitBounds(bounds, {
        paddingTopLeft: isDesktop ? [panelWidth + 48, 64] : [36, 64],
        paddingBottomRight: isDesktop ? [64, 64] : [36, window.innerHeight * 0.35 + 48],
        maxZoom: distMeters < 120 ? 19 : 16,
        duration: 1.25,
      });
    } else {
      const pt = map.project(skillCoords, 18);
      if (isDesktop) pt.x -= panelWidth / 2;
      else pt.y += window.innerHeight * 0.18;
      map.flyTo(map.unproject(pt, 18), 18, { duration: 1.25 });
    }
  }, [mapReady, getDesktopPanelOffset]);

  const applyHeadingToDom = React.useCallback((deg: number | null) => {
    const el = userMarkerRef.current?.getElement();
    if (!el) return;
    const wrap = el.querySelector(".asr-location-heading-wrap") as HTMLElement | null;
    if (!wrap) return;
    if (deg === null || Number.isNaN(deg)) {
      wrap.style.opacity = "0";
    } else {
      wrap.style.opacity = "1";
      wrap.style.transform = `rotate3d(0, 0, 1, ${deg.toFixed(1)}deg)`;
    }
  }, []);

  const createUserLocationIcon = React.useCallback((currentIsDark: boolean) => {
    const h = headingDegRef.current;
    const headingStyle = h !== null && !Number.isNaN(h)
      ? `opacity: 1; transform: rotate3d(0, 0, 1, ${h.toFixed(1)}deg);`
      : `opacity: 0;`;

    return L.divIcon({
      html: `
        <div class="asr-location-puck">
          <div class="asr-location-heading-wrap" style="${headingStyle}">
            <svg class="asr-location-heading-cone" viewBox="0 0 80 80" fill="none">
              <defs>
                <radialGradient id="asrHeadingBeamGrad" cx="40" cy="40" r="36" gradientUnits="userSpaceOnUse">
                  <stop offset="18%" stop-color="#4285F4" stop-opacity="0.55" />
                  <stop offset="100%" stop-color="#4285F4" stop-opacity="0" />
                </radialGradient>
              </defs>
              <path d="M40 40 L21 6 A39 39 0 0 1 59 6 Z" fill="url(#asrHeadingBeamGrad)" />
            </svg>
          </div>
          <div class="asr-location-halo"></div>
          <div class="asr-location-pulse-ring"></div>
          <div class="asr-location-base ${currentIsDark ? "asr-location-base--dark" : ""}">
            <div class="asr-location-core"></div>
          </div>
        </div>
      `,
      className: "asr-user-location-marker",
      iconSize: [80, 80],
      iconAnchor: [40, 40],
    });
  }, []);

  const startCompassTracking = React.useCallback(() => {
    if (orientationListenerRef.current || typeof window === "undefined") return;

    const attachListener = () => {
      if (orientationListenerRef.current) return;
      const handler = (event: DeviceOrientationEvent & { webkitCompassHeading?: number }) => {
        let heading: number | null = null;
        if (typeof event.webkitCompassHeading === "number" && event.webkitCompassHeading >= 0) {
          heading = event.webkitCompassHeading;
        } else if (event.absolute && typeof event.alpha === "number") {
          heading = (360 - event.alpha) % 360;
        } else if (typeof event.alpha === "number") {
          heading = (360 - event.alpha) % 360;
        }
        if (heading !== null && !Number.isNaN(heading)) {
          headingDegRef.current = heading;
          applyHeadingToDom(heading);
        }
      };
      orientationListenerRef.current = handler;
      window.addEventListener("deviceorientationabsolute" as any, handler as any, true);
      window.addEventListener("deviceorientation", handler, true);
    };

    const DevOrient = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent;
    if (DevOrient && typeof DevOrient.requestPermission === "function") {
      DevOrient.requestPermission()
        .then((state) => {
          if (state === "granted") attachListener();
        })
        .catch(() => {
          // Compass permission optional; location dot still works without beam
        });
    } else {
      attachListener();
    }
  }, [applyHeadingToDom]);

  const upsertUserMarker = React.useCallback((latitude: number, longitude: number) => {
    if (!mapRef.current) return;
    if (userMarkerRef.current && mapRef.current.hasLayer(userMarkerRef.current)) {
      userMarkerRef.current.setLatLng([latitude, longitude]);
      applyHeadingToDom(headingDegRef.current);
    } else {
      userMarkerRef.current = L.marker([latitude, longitude], {
        icon: createUserLocationIcon(isDarkRef.current),
        pane: "userLocationPane",
        interactive: false,
      }).addTo(mapRef.current);
    }
  }, [createUserLocationIcon, applyHeadingToDom]);

  const startLocationWatch = React.useCallback(() => {
    if (watchIdRef.current !== null || !navigator.geolocation) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (watchPos) => {
        const nextLoc: [number, number] = [watchPos.coords.latitude, watchPos.coords.longitude];
        setUserLocation(nextLoc);
        upsertUserMarker(nextLoc[0], nextLoc[1]);
        if (typeof watchPos.coords.heading === "number" && !Number.isNaN(watchPos.coords.heading) && watchPos.coords.heading >= 0) {
          headingDegRef.current = watchPos.coords.heading;
          applyHeadingToDom(watchPos.coords.heading);
        }
      },
      () => {
        // Keep last known position marker on transient GPS dropouts
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
  }, [setUserLocation, upsertUserMarker, applyHeadingToDom]);

  const flyToLocation = React.useCallback((latitude: number, longitude: number) => {
    const map = mapRef.current;
    if (!map) return;
    map.stop();
    const currentZoom = map.getZoom();
    const distMeters = map.getCenter().distanceTo([latitude, longitude]);
    const targetZoom =
      currentZoom < 14
        ? 14
        : distMeters < 300 && currentZoom < 18
          ? Math.min(currentZoom + 1, 18)
          : currentZoom;
    const duration = distMeters < 50 && targetZoom === currentZoom ? 0.35 : 1.2;
    map.flyTo([latitude, longitude], targetZoom, { duration });
  }, []);

  const handleFindMe = React.useCallback(() => {
    if (!mapRef.current || !navigator.geolocation) return;
    trackEvent("map_find_me_click", { status: "requested" });
    startCompassTracking();

    // If we already have a session location fix, respond instantaneously on click
    const knownLoc = useAppStore.getState().userLocation;
    const alreadyFlew = Boolean(knownLoc);
    if (knownLoc) {
      setSkillSortMode("nearest");
      upsertUserMarker(knownLoc[0], knownLoc[1]);
      flyToLocation(knownLoc[0], knownLoc[1]);
    }

    setIsLocating(true);
    if (locateTimeoutRef.current !== null) {
      clearTimeout(locateTimeoutRef.current);
    }
    locateTimeoutRef.current = setTimeout(() => {
      setIsLocating(false);
      locateTimeoutRef.current = null;
    }, 12000);

    const finishLocating = () => {
      if (locateTimeoutRef.current !== null) {
        clearTimeout(locateTimeoutRef.current);
        locateTimeoutRef.current = null;
      }
      setIsLocating(false);
    };

    const onPositionSuccess = (pos: GeolocationPosition) => {
      finishLocating();
      if (!mapRef.current) return;
      const { latitude, longitude } = pos.coords;
      const prevLoc = useAppStore.getState().userLocation;
      setUserLocation([latitude, longitude]);
      setSkillSortMode("nearest");
      upsertUserMarker(latitude, longitude);
      startLocationWatch();

      if (!alreadyFlew) {
        flyToLocation(latitude, longitude);
      } else if (prevLoc && L.latLng(prevLoc).distanceTo([latitude, longitude]) > 25) {
        mapRef.current.stop();
        mapRef.current.panTo([latitude, longitude], { animate: true, duration: 0.8 });
      }
      trackEvent("map_find_me_success");
    };

    navigator.geolocation.getCurrentPosition(
      onPositionSuccess,
      (err) => {
        // Code 1 = PERMISSION_DENIED; otherwise fall back to fast Wi-Fi/cached network location
        if (err.code === 1) {
          finishLocating();
          return;
        }
        navigator.geolocation.getCurrentPosition(
          onPositionSuccess,
          () => finishLocating(),
          { enableHighAccuracy: false, timeout: 7000, maximumAge: 120000 }
        );
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 10000 }
    );
  }, [setIsLocating, startCompassTracking, setSkillSortMode, upsertUserMarker, flyToLocation, setUserLocation, startLocationWatch]);

  // Expose methods to parent
  useImperativeHandle(
    ref,
    () => ({
      locateUser: handleFindMe,
      resetView: resetViewToDefault,
      fitToChallenges: fitMapToSkills,
      frameSkillAndUser,
      frameCourseAndUser: frameSkillAndUser,
    }),
    [handleFindMe, resetViewToDefault, fitMapToSkills, frameSkillAndUser]
  );

  const onSkillClickRef = useRef(onSkillClick);
  const onPinClickRef = useRef(onPinClick);
  const onBoundsChangeRef = useRef(onBoundsChange);
  const onMapClickRef = useRef(onMapClick);

  useEffect(() => { onSkillClickRef.current = onSkillClick; }, [onSkillClick]);
  useEffect(() => { onPinClickRef.current = onPinClick; }, [onPinClick]);
  useEffect(() => { onBoundsChangeRef.current = onBoundsChange; }, [onBoundsChange]);
  useEffect(() => { onMapClickRef.current = onMapClick; }, [onMapClick]);

  // Map Initialization
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const isMobile = window.innerWidth < 768;
    // Set map to focus on Americas and Hawaii on mobile, keep original for desktop
    const defaultCenter: L.LatLngTuple = isMobile ? [28, -100] : [15, -90];
    const defaultZoom = isMobile ? 2 : 3;
    const savedViewport = useAppStore.getState().mapViewport;
    const initialCenter: L.LatLngTuple = savedViewport ? savedViewport.center : defaultCenter;
    const initialZoom = savedViewport ? savedViewport.zoom : defaultZoom;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
      minZoom: 2,
      maxZoom: 21,
      maxBounds: [
        [-90, -180],
        [90, 180],
      ],
      maxBoundsViscosity: 1.0,
      worldCopyJump: false,
      dragging: true,
      touchZoom: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      boxZoom: true,
      keyboard: true,
    }).setView(initialCenter, initialZoom);

    // Dedicated pane above marker/cluster panes (z-index 600) so clusters never bury the user dot
    const userPane = map.createPane("userLocationPane");
    userPane.style.zIndex = "650";
    userPane.style.pointerEvents = "none";

    const { light: lightTileUrl, dark: darkTileUrl, satellite: satelliteUrl } = getMapboxTileUrls();

    const lightLayer = L.tileLayer(lightTileUrl, {
      maxZoom: 21,
      maxNativeZoom: 19,
      noWrap: true,
      bounds: MERCATOR_BOUNDS,
    });

    const darkLayer = L.tileLayer(darkTileUrl, {
      maxZoom: 21,
      maxNativeZoom: 19,
      noWrap: true,
      bounds: MERCATOR_BOUNDS,
    });

    const satelliteLayer = L.tileLayer(satelliteUrl, {
      maxZoom: 21,
      maxNativeZoom: 19,
      noWrap: true,
      bounds: MERCATOR_BOUNDS,
    });

    // Only attach the active theme/mode's tile layer so we never fetch 2x retina tiles simultaneously
    const initialLayerMode = useAppStore.getState().mapLayerMode;
    const initialLayer =
      initialLayerMode === "satellite"
        ? satelliteLayer
        : isDarkRef.current
          ? darkLayer
          : lightLayer;
    initialLayer.addTo(map);
    activeTileLayerRef.current = initialLayer;
    tileLayersRef.current = { light: lightLayer, dark: darkLayer, satellite: satelliteLayer };

    const getClusterIcon = (cluster: any) => {
      const count = cluster.getChildCount();
      const childMarkers = typeof cluster.getAllChildMarkers === "function" ? cluster.getAllChildMarkers() : [];
      let minR = Infinity;
      let maxR = -Infinity;
      const tierHexSet = new Set<string>();

      for (let i = 0; i < childMarkers.length; i++) {
        const r = Number((childMarkers[i] as any)?._skillRating || 0);
        if (r > 0) {
          if (r < minR) minR = r;
          if (r > maxR) maxR = r;
          tierHexSet.add(getSkillTierConfig(r).pinHex);
        }
      }

      const uniqueHexes = Array.from(tierHexSet);
      let gradientStyle = "linear-gradient(90deg, #52525b, #a1a1aa, #f4f4f5, #a1a1aa, #52525b)";
      if (uniqueHexes.length === 1) {
        const c = uniqueHexes[0];
        gradientStyle = `linear-gradient(90deg, ${c}, ${c}cc, #ffffff, ${c}cc, ${c})`;
      } else if (uniqueHexes.length > 1) {
        const stops = [...uniqueHexes, uniqueHexes[0]].join(", ");
        gradientStyle = `linear-gradient(90deg, ${stops})`;
      }

      const currentIsDark = isDarkRef.current;
      const outerShadow = currentIsDark ? 'shadow-[0_4px_12px_rgba(0,0,0,0.6)]' : 'shadow-[0_4px_12px_rgba(0,0,0,0.2)]';
      const innerSurface = currentIsDark 
        ? 'bg-zinc-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-1px_2px_rgba(0,0,0,0.8)]' 
        : 'bg-white shadow-[inset_0_2px_3px_rgba(255,255,255,1),inset_0_-1px_2px_rgba(0,0,0,0.1)]';
      const textColor = currentIsDark ? 'text-white' : 'text-zinc-900';
      const tooltipClasses = currentIsDark
        ? 'bg-zinc-950/95 text-white border-white/20 shadow-[0_4px_20px_rgba(0,0,0,0.85)]'
        : 'bg-white/95 text-zinc-950 border-black/15 shadow-[0_4px_16px_rgba(0,0,0,0.15)]';

      let clusterHoverHtml = "";
      if (minR <= maxR) {
        const rangeLabel = minR === maxR ? `LVL ${minR}` : `LVL ${minR}–${maxR}`;
        clusterHoverHtml = `
          <div class="absolute bottom-[54px] left-1/2 -translate-x-1/2 pointer-events-none opacity-0 pointer-fine:group-hover:opacity-100 transition-all duration-200 ease-out translate-y-1 pointer-fine:group-hover:translate-y-0 scale-95 pointer-fine:group-hover:scale-100 z-50 whitespace-nowrap">
            <div class="relative flex items-center px-2.5 py-1 rounded-full border backdrop-blur-md ${tooltipClasses}">
              <span class="text-[10px] font-mono font-black tracking-widest uppercase select-none leading-none">
                ${rangeLabel}
              </span>
            </div>
          </div>
        `;
      }

      return L.divIcon({
        html: `
          <div class="relative flex items-center justify-center w-full h-full transition-transform duration-300 pointer-fine:hover:scale-110 group cursor-pointer ${outerShadow} rounded-full">
            ${clusterHoverHtml}
            <div class="absolute inset-0 rounded-full z-0 animate-border-shift blur-[4px] opacity-60" style="background: ${gradientStyle}; background-size: 200% 100%;"></div>
            <div class="absolute inset-0 rounded-full z-0 animate-border-shift opacity-90" style="background: ${gradientStyle}; background-size: 200% 100%;"></div>
            <div class="absolute inset-[1.5px] rounded-full z-10 transition-colors ${innerSurface}"></div>
            <div class="absolute inset-[3px] rounded-full z-10 transition-colors shadow-[inset_0_0_10px_rgba(255,255,255,0.1)]"></div>
            <span class="relative z-20 ${textColor} font-black text-xs sm:text-sm tracking-tighter drop-shadow-md">
               ${count}
            </span>
          </div>
        `,
        className: "bg-transparent",
        iconSize: [50, 50],
      });
    };

    const clusterGroup = L.markerClusterGroup({
      chunkedLoading: true,
      chunkInterval: 100,
      chunkDelay: 16,
      // Tighter dynamic radius as user zooms in so nearby spots separate naturally
      maxClusterRadius: (zoom: number) => (zoom >= 17 ? 16 : zoom >= 15 ? 28 : zoom >= 12 ? 38 : 48),
      // At zoom 18+, dissolve all clusters so every pin sits directly on its true starting coordinate
      disableClusteringAtZoom: 18,
      showCoverageOnHover: false,
      // Never displace pins into synthetic spiderfy circles away from their real coordinates
      spiderfyOnMaxZoom: false,
      zoomToBoundsOnClick: false,
      iconCreateFunction: getClusterIcon,
    });

    clusterGroup.on("clusterclick", (e: any) => {
      if (e.originalEvent) {
        (e.originalEvent as any)._markerClicked = true;
      }
      const cluster = e.layer;
      if (!cluster || !mapRef.current) return;

      const m = mapRef.current;
      const bounds: L.LatLngBounds = cluster.getBounds();
      const isDesktop = window.innerWidth >= 768;
      const panelWidth = getDesktopPanelOffset();
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      const spanMeters = ne.distanceTo(sw);

      // If all challenges in this cluster are in the same plaza/park (<120m span),
      // jump straight to unclustered precision view (zoom 18-20) accounting for sidebar/bottom sheet padding
      if (spanMeters < 2) {
        const targetZoom = Math.max(m.getZoom() + 2, 20);
        const center = cluster.getLatLng();
        const pt = m.project(center, targetZoom);
        if (isDesktop) pt.x -= panelWidth / 2;
        else pt.y += window.innerHeight * 0.18;
        m.flyTo(m.unproject(pt, targetZoom), targetZoom, { duration: 0.9 });
      } else {
        const targetMaxZoom = spanMeters < 45 ? 20 : spanMeters < 140 ? 19 : 18;
        m.fitBounds(bounds, {
          paddingTopLeft: isDesktop ? [panelWidth + (panelWidth > 0 ? 44 : 56), 56] : [36, 56],
          paddingBottomRight: isDesktop ? [56, 56] : [36, window.innerHeight * 0.32 + 48],
          maxZoom: targetMaxZoom,
          duration: 0.95,
        });
      }
    });

    map.addLayer(clusterGroup);
    clusterGroupRef.current = clusterGroup;

    mapRef.current = map;
    setMapReady(true);

    return () => {
      if (locateTimeoutRef.current !== null) {
        clearTimeout(locateTimeoutRef.current);
        locateTimeoutRef.current = null;
      }
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (orientationListenerRef.current) {
        window.removeEventListener("deviceorientation", orientationListenerRef.current, true);
        window.removeEventListener("deviceorientationabsolute" as any, orientationListenerRef.current as any, true);
        orientationListenerRef.current = null;
      }
      if (layerSwapCleanupRef.current) {
        layerSwapCleanupRef.current();
        layerSwapCleanupRef.current = null;
      }
      activeTileLayerRef.current = null;
      setIsLocating(false);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      clusterGroupRef.current = null;
      tileLayersRef.current = {};
      markersRef.current.clear();
      skillDataRef.current.clear();
      skillCoordsRef.current.clear();
      userMarkerRef.current = null;
      hoveredMarkerIdRef.current = null;
      prevActiveIdRef.current = null;
      prevIsDarkRenderedRef.current = null;
      prevUserLocRenderedRef.current = null;
      setMapReady(false);
    };
  }, [setMapReady, setIsLocating, getDesktopPanelOffset]); // Send once on mount

  // Map Event Handlers
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    
    const handleMapClick = (e: any) => {
      if ((e.originalEvent as any)._markerClicked) return;
      if (onMapClickRef.current) {
        onMapClickRef.current();
      }
    };
    
    const triggerBounds = () => {
      const center = map.getCenter();
      setMapViewport({
        center: [center.lat, center.lng],
        zoom: map.getZoom(),
      });
      if (onBoundsChangeRef.current) {
         const bounds = map.getBounds();
         onBoundsChangeRef.current({
            north: bounds.getNorth(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            west: bounds.getWest()
         });
      }
    };

    const clearHoveredZIndex = () => {
      const hoveredId = hoveredMarkerIdRef.current;
      if (!hoveredId) return;
      hoveredMarkerIdRef.current = null;
      const hoveredMarker = markersRef.current.get(hoveredId);
      if (hoveredMarker) {
        hoveredMarker.setZIndexOffset(activeSkillIdRef.current === hoveredId ? 1000 : 0);
      }
    };

    map.on('click', handleMapClick);
    map.on('moveend', triggerBounds);
    map.on('dragstart', clearHoveredZIndex);
    map.on('zoomstart', clearHoveredZIndex);
    triggerBounds();

    return () => {
      map.off('click', handleMapClick);
      map.off('moveend', triggerBounds);
      map.off('dragstart', clearHoveredZIndex);
      map.off('zoomstart', clearHoveredZIndex);
    };
  }, [mapReady, setMapViewport]);

  // ResizeObserver for Container
  useEffect(() => {
    if (!mapReady || !mapContainerRef.current || !mapRef.current) return;

    let rafId: number | null = null;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === mapContainerRef.current) {
          if (rafId !== null) cancelAnimationFrame(rafId);
          rafId = requestAnimationFrame(() => {
            rafId = null;
            if (mapRef.current) {
              mapRef.current.invalidateSize();
            }
          });
        }
      }
    });

    observer.observe(mapContainerRef.current);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [mapReady]);

  // Solve Leaflet Gray Tiles bug when map mounts or views transition
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const timer = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [mapReady]);

  // Theme & Satellite synchronization for Tiles (only active layer remains mounted; wait for incoming tiles before removing previous layer)
  useEffect(() => {
    const map = mapRef.current;
    const { light, dark, satellite } = tileLayersRef.current;
    if (!mapReady || !map || !light || !dark || !satellite) return;

    const nextLayer =
      mapLayerMode === "satellite"
        ? satellite
        : isDark
          ? dark
          : light;

    const prevLayer = activeTileLayerRef.current;
    if (prevLayer === nextLayer && map.hasLayer(nextLayer)) {
      return;
    }

    if (layerSwapCleanupRef.current) {
      layerSwapCleanupRef.current();
      layerSwapCleanupRef.current = null;
    }

    const allLayers = [light, dark, satellite];
    allLayers.forEach((layer) => {
      if (layer !== nextLayer && layer !== prevLayer && map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    });

    if (!map.hasLayer(nextLayer)) {
      nextLayer.addTo(map);
    }
    nextLayer.bringToFront();
    activeTileLayerRef.current = nextLayer;

    if (prevLayer && prevLayer !== nextLayer && map.hasLayer(prevLayer)) {
      let cleaned = false;
      const removePrev = () => {
        if (cleaned) return;
        cleaned = true;
        nextLayer.off("load", removePrev);
        clearTimeout(fallbackTimer);
        if (mapRef.current && mapRef.current.hasLayer(prevLayer) && activeTileLayerRef.current !== prevLayer) {
          mapRef.current.removeLayer(prevLayer);
        }
      };

      const fallbackTimer = setTimeout(removePrev, 800);
      nextLayer.once("load", removePrev);
      layerSwapCleanupRef.current = () => {
        cleaned = true;
        nextLayer.off("load", removePrev);
        clearTimeout(fallbackTimer);
      };
    }
  }, [isDark, mapLayerMode, mapReady]);

  // Helpers for hover feature
  const getSkillDisplayName = (fullName: string): string => {
    if (!fullName) return "";
    const trimmed = fullName.trim();
    const match = trimmed.match(/^(.*?)(?:\s+SKILL[\s_-]*RUN|\s+SKILLRUN|\s+CHALLENGE)/i);
    if (match && match[1].trim()) {
      return match[1].trim();
    }
    const fallbackMatch = trimmed.match(/^(.*?)(?:SKILL[\s_-]*RUN|SKILLRUN)/i);
    if (fallbackMatch && fallbackMatch[1].trim()) {
      return fallbackMatch[1].trim();
    }
    return trimmed;
  };

  const escapeHtml = (str: string): string => {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  // Helper to create marker icon with 1-100 difficulty rating stamped inside, ground-truth coordinate dot, and live distance badge
  const createPinIcon = (skillOrName: SkillData | string, isActive: boolean, coords?: [number, number] | null) => {
    const skillName = typeof skillOrName === "string" ? skillOrName : (skillOrName?.name || "");
    const skillObj = typeof skillOrName === "string" ? skillDataRef.current.get(skillOrName) : skillOrName;
    const ratingVal = getSkillRating(skillObj);
    const ratingInt = Math.round(ratingVal);
    const tierCfg = getSkillTierConfig(ratingInt);
    const hasRating = ratingInt > 0;

    const currentIsDark = isDarkRef.current;
    const outerShadow = currentIsDark ? 'shadow-[0_4px_12px_rgba(0,0,0,0.7)]' : 'shadow-[0_4px_12px_rgba(0,0,0,0.25)]';
    const innerSurface = currentIsDark 
      ? 'bg-zinc-950 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),inset_0_-1px_2px_rgba(0,0,0,0.9)]' 
      : 'bg-white shadow-[inset_0_2px_3px_rgba(255,255,255,1),inset_0_-1px_2px_rgba(0,0,0,0.12)]';

    const dotClasses = currentIsDark 
      ? 'bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)]'
      : 'bg-zinc-900 shadow-[0_0_12px_rgba(0,0,0,0.3)]';

    const stemClasses = currentIsDark
      ? 'from-white/85 to-white/40'
      : 'from-zinc-900/75 to-zinc-900/35';

    const tooltipClasses = currentIsDark
      ? 'bg-zinc-950/95 text-white border-white/20 shadow-[0_4px_20px_rgba(0,0,0,0.85)]'
      : 'bg-white/95 text-zinc-950 border-black/15 shadow-[0_4px_16px_rgba(0,0,0,0.15)]';

    const activeOuterClasses = isActive
      ? 'scale-[1.35] z-[1000] brightness-110'
      : 'pointer-fine:hover:scale-[1.15] active:scale-95 drop-shadow-lg';
    
    const shortName = getSkillDisplayName(skillName);
    const escapedShortName = escapeHtml(shortName);

    const currentLoc = useAppStore.getState().userLocation;
    const resolvedCoords = coords || skillObj?.parsedCoords || skillCoordsRef.current.get(skillName);
    let distBadgeHtml = "";
    if (currentLoc && resolvedCoords) {
      const km = L.latLng(currentLoc).distanceTo(resolvedCoords) / 1000;
      distBadgeHtml = `<span class="ml-1.5 pl-1.5 border-l ${currentIsDark ? 'border-white/20 text-blue-400' : 'border-black/15 text-blue-600'} tabular-nums">${km.toFixed(2)} KM</span>`;
    }

    const ratingBadgeHtml = hasRating
      ? `<span class="ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-mono font-black leading-none" style="background-color: ${tierCfg.pinHex}22; color: ${tierCfg.pinHex}; border: 1px solid ${tierCfg.pinHex}66;">${ratingInt}</span>`
      : "";

    const hoverPillHtml = escapedShortName
      ? `<div class="absolute bottom-[42px] left-1/2 -translate-x-1/2 pointer-events-none opacity-0 pointer-fine:group-hover:opacity-100 transition-all duration-200 ease-out translate-y-1 pointer-fine:group-hover:translate-y-0 scale-95 pointer-fine:group-hover:scale-100 z-50 whitespace-nowrap">
           <div class="relative flex items-center px-2.5 py-1 rounded-full border backdrop-blur-md ${tooltipClasses}">
             <span class="text-[10px] sm:text-[11px] font-mono font-black tracking-widest uppercase select-none leading-none flex items-center">
               ${escapedShortName}${distBadgeHtml}
             </span>
             ${ratingBadgeHtml}
           </div>
         </div>`
      : "";

    const ringStyle = hasRating
      ? `border: 2px solid ${tierCfg.pinHex}; box-shadow: 0 0 ${isActive ? '14px' : '6px'} ${tierCfg.pinHex}${isActive ? 'aa' : '55'};`
      : "";

    const anchorDotStyle = hasRating
      ? `background-color: ${tierCfg.pinHex}; box-shadow: 0 0 6px ${tierCfg.pinHex};`
      : currentIsDark
        ? "background-color: #ffffff; box-shadow: 0 0 6px rgba(255,255,255,0.9);"
        : "background-color: #18181b; box-shadow: 0 0 6px rgba(0,0,0,0.4);";

    const pinTextColor = currentIsDark ? "text-white" : "text-zinc-950";
    const innerContentHtml = hasRating
      ? `<span class="relative z-20 font-mono font-black text-[10px] tracking-tighter leading-none select-none ${pinTextColor}">${ratingInt}</span>`
      : `<div class="relative z-20 w-1.5 h-1.5 rounded-full ${dotClasses} ${isActive ? 'scale-125' : 'pointer-fine:group-hover:scale-125'} transition-all"></div>`;

    return L.divIcon({
      html: `
        <div class="asr-pin relative flex flex-col items-center justify-center group transition-all duration-300 cursor-pointer ${activeOuterClasses}" style="width: 44px; height: 44px; transform-origin: 22px 39px;">
          ${hoverPillHtml}
          <div class="absolute inset-0 bg-transparent"></div>
          <div class="relative flex flex-col items-center mt-1">
            <div class="relative w-7 h-7 rounded-full flex items-center justify-center ${outerShadow}" style="${ringStyle}">
              ${!hasRating ? `
                <div class="absolute inset-0 rounded-full animate-border-shift neon-gradient-base blur-[4px] opacity-50 z-0"></div>
                <div class="absolute inset-0 rounded-full animate-border-shift neon-gradient-base opacity-90 z-0"></div>
              ` : ''}
              <div class="absolute inset-[1.5px] rounded-full z-10 transition-colors ${innerSurface}"></div>
              ${innerContentHtml}
            </div>
            <div class="w-[1.5px] h-[6px] bg-gradient-to-b ${stemClasses}"></div>
            <div class="w-[5px] h-[5px] rounded-full border ${currentIsDark ? 'border-black/80' : 'border-white/90'}" style="${anchorDotStyle}"></div>
          </div>
        </div>
      `,
      className: "bg-transparent",
      iconSize: [44, 44],
      iconAnchor: [22, 39],
    });
  };

  // Marker Syncing
  useEffect(() => {
    if (!mapReady || !clusterGroupRef.current) return;
    
    const currentSkillIds = new Set(challenges.map((c: SkillData) => c.name));
    
    // Remove markers that are no longer in `challenges`
    const markersToRemove: L.Marker[] = [];
    for (const [id, marker] of markersRef.current.entries()) {
       if (!currentSkillIds.has(id)) {
          markersToRemove.push(marker);
          markersRef.current.delete(id);
          skillDataRef.current.delete(id);
          skillCoordsRef.current.delete(id);
       }
    }

    if (markersToRemove.length > 0) {
       clusterGroupRef.current.removeLayers(markersToRemove);
    }

    // Group identical coordinates (< 0.15m apart, 6 decimal places) so exact duplicate takeoff blocks
    // get a sub-meter micro-fan (±0.6m) rather than burying pins completely underneath one another
    const coordGroups = new Map<string, string[]>();
    challenges.forEach((c: SkillData & { parsedCoords?: [number, number] }) => {
      if (!c.parsedCoords || !c.name) return;
      const key = `${c.parsedCoords[0].toFixed(6)},${c.parsedCoords[1].toFixed(6)}`;
      const bucket = coordGroups.get(key);
      if (bucket) {
        bucket.push(c.name);
      } else {
        coordGroups.set(key, [c.name]);
      }
    });

    const resolveDisplayCoords = (c: SkillData & { parsedCoords?: [number, number] }): [number, number] => {
      const base = c.parsedCoords!;
      const key = `${base[0].toFixed(6)},${base[1].toFixed(6)}`;
      const siblings = coordGroups.get(key);
      if (!siblings || siblings.length <= 1) return base;
      const idx = siblings.indexOf(c.name);
      if (idx <= 0) return base;
      // Sub-meter ring (~0.65m radius) around the shared takeoff block so all pins remain visible & clickable at zoom 20-21
      const angle = (2 * Math.PI * idx) / siblings.length;
      const radiusLat = 0.000006; // ~0.65 meters
      const cosLat = Math.max(0.2, Math.cos((base[0] * Math.PI) / 180));
      const radiusLng = radiusLat / cosLat;
      return [
        base[0] + radiusLat * Math.sin(angle),
        base[1] + radiusLng * Math.cos(angle),
      ];
    };

    // Add or update markers without blowing up the whole cluster.
    const newMarkers: L.Marker[] = [];
    let hasMarkerMutated = markersToRemove.length > 0;

    challenges.forEach((c: SkillData & { parsedCoords?: [number, number] }) => {
      const id = c.name;
      if (!c.parsedCoords) return;

      const displayCoords = resolveDisplayCoords(c);
      const prevCoords = skillCoordsRef.current.get(id);
      skillDataRef.current.set(id, c);
      skillCoordsRef.current.set(id, displayCoords);
      const isActive = activeSkillIdRef.current === id;

      if (!markersRef.current.has(id)) {
        const marker = L.marker(displayCoords, {
          icon: createPinIcon(c, isActive, c.parsedCoords),
          keyboard: false,
          zIndexOffset: isActive ? 1000 : 0,
        });
        (marker as any)._skillRating = Math.round(getSkillRating(c));

        marker.on("mouseover", () => {
          hoveredMarkerIdRef.current = id;
          marker.setZIndexOffset(10000);
        });

        marker.on("mouseout", () => {
          if (hoveredMarkerIdRef.current === id) {
            hoveredMarkerIdRef.current = null;
          }
          const isCurrentActive = activeSkillIdRef.current === id;
          marker.setZIndexOffset(isCurrentActive ? 1000 : 0);
        });

        marker.on("click", (e) => {
          (e.originalEvent as any)._markerClicked = true;
          if (hoveredMarkerIdRef.current === id) {
            hoveredMarkerIdRef.current = null;
          }
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
          if (!mapRef.current) return;

          const latestSkill = skillDataRef.current.get(id) || c;
          const coords = skillCoordsRef.current.get(id) || latestSkill.parsedCoords || c.parsedCoords!;

          // Intelligent Panning (preserve micro-zoom if already zoomed in, otherwise frame at zoom 16+)
          const currentZoom = Math.max(mapRef.current.getZoom(), 16);
          const pt = mapRef.current.project(coords, currentZoom);
          const isDesktop = window.innerWidth >= 768;

          if (!isDesktop) {
            const targetLatLng = mapRef.current.unproject({ x: pt.x, y: pt.y + window.innerHeight * 0.22 }, currentZoom);
            mapRef.current.flyTo(targetLatLng, currentZoom, { duration: 0.85 });
          } else {
            const panelWidth = getDesktopPanelOffset();
            const targetLatLng = mapRef.current.unproject({ x: pt.x - panelWidth / 2, y: pt.y }, currentZoom);
            mapRef.current.flyTo(targetLatLng, currentZoom, { duration: 0.85 });
          }

          if (onPinClickRef.current) onPinClickRef.current(latestSkill);
          else if (onSkillClickRef.current) onSkillClickRef.current(latestSkill);
        });

        markersRef.current.set(id, marker);
        newMarkers.push(marker);
      } else {
        const existingMarker = markersRef.current.get(id);
        if (existingMarker) {
          const nextRating = Math.round(getSkillRating(c));
          const prevRating = (existingMarker as any)._skillRating;
          if (prevRating !== nextRating) {
            (existingMarker as any)._skillRating = nextRating;
            existingMarker.setIcon(createPinIcon(c, isActive, c.parsedCoords));
            hasMarkerMutated = true;
          }
          if (prevCoords && (prevCoords[0] !== displayCoords[0] || prevCoords[1] !== displayCoords[1])) {
            existingMarker.setLatLng(displayCoords);
            hasMarkerMutated = true;
          }
        }
      }
    });

    if (newMarkers.length > 0) {
      clusterGroupRef.current.addLayers(newMarkers);
      hasMarkerMutated = true;
    }
    if (hasMarkerMutated) {
      clusterGroupRef.current.refreshClusters();
    }
  }, [challenges, mapReady, getDesktopPanelOffset]);

  // Active Pin State, Theme, AND User Location updates (re-render icons with live distance badge)
  useEffect(() => {
    if (!mapReady) return;

    const themeChanged = prevIsDarkRenderedRef.current !== null && prevIsDarkRenderedRef.current !== isDark;
    const prevLoc = prevUserLocRenderedRef.current;
    const locChanged =
      (prevLoc === null && userLocation !== null) ||
      (prevLoc !== null && userLocation === null) ||
      (prevLoc !== null && userLocation !== null && (prevLoc[0] !== userLocation[0] || prevLoc[1] !== userLocation[1]));
    const prevActiveId = prevActiveIdRef.current;

    if (themeChanged || locChanged) {
      for (const [id, marker] of markersRef.current.entries()) {
        const isActive = activeSkillId === id;
        const skillObj = skillDataRef.current.get(id) || id;
        const trueCoords = typeof skillObj !== "string" ? skillObj.parsedCoords : skillCoordsRef.current.get(id);
        marker.setIcon(createPinIcon(skillObj, isActive, trueCoords));
        marker.setZIndexOffset(isActive ? 1000 : 0);
      }
      if (themeChanged) {
        clusterGroupRef.current?.refreshClusters();
      }
    } else if (prevActiveId !== activeSkillId) {
      if (prevActiveId) {
        const prevMarker = markersRef.current.get(prevActiveId);
        if (prevMarker) {
          const prevSkillObj = skillDataRef.current.get(prevActiveId) || prevActiveId;
          const prevTrueCoords = typeof prevSkillObj !== "string" ? prevSkillObj.parsedCoords : skillCoordsRef.current.get(prevActiveId);
          prevMarker.setIcon(createPinIcon(prevSkillObj, false, prevTrueCoords));
          prevMarker.setZIndexOffset(hoveredMarkerIdRef.current === prevActiveId ? 10000 : 0);
        }
      }
      if (activeSkillId) {
        const nextMarker = markersRef.current.get(activeSkillId);
        if (nextMarker) {
          const nextSkillObj = skillDataRef.current.get(activeSkillId) || activeSkillId;
          const nextTrueCoords = typeof nextSkillObj !== "string" ? nextSkillObj.parsedCoords : skillCoordsRef.current.get(activeSkillId);
          nextMarker.setIcon(createPinIcon(nextSkillObj, true, nextTrueCoords));
          nextMarker.setZIndexOffset(1000);
        }
      }
    }

    prevIsDarkRenderedRef.current = isDark;
    prevUserLocRenderedRef.current = userLocation;
    prevActiveIdRef.current = activeSkillId;
  }, [activeSkillId, isDark, mapReady, userLocation]);

  // Restore & sync user location marker whenever map mounts (e.g. returning from another app tab) or location updates
  useEffect(() => {
    if (!mapReady || !mapRef.current || !userLocation) return;
    upsertUserMarker(userLocation[0], userLocation[1]);
    startLocationWatch();
  }, [mapReady, userLocation, upsertUserMarker, startLocationWatch]);

  // Recover cleanly when returning from a backgrounded browser tab
  useEffect(() => {
    if (!mapReady) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && mapRef.current) {
        mapRef.current.invalidateSize();
        const savedLoc = useAppStore.getState().userLocation;
        if (savedLoc) {
          upsertUserMarker(savedLoc[0], savedLoc[1]);
          if (userMarkerRef.current) {
            userMarkerRef.current.setIcon(createUserLocationIcon(isDarkRef.current));
          }
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [mapReady, upsertUserMarker, createUserLocationIcon]);

  // User Marker theming
  useEffect(() => {
    if (userMarkerRef.current && mapRef.current?.hasLayer(userMarkerRef.current)) {
      userMarkerRef.current.setIcon(createUserLocationIcon(isDark));
    }
  }, [isDark, createUserLocationIcon]);

  const prevSearchQueryRef = useRef(searchQuery);

  // CAMERA DIRECTOR: Automatic Map Framing
  useEffect(() => {
    if (!mapReady || !mapRef.current || !challenges) return;

    const activeSkillsCount = challenges.filter((c: any) => c && !c.isDivider).length;
    const isFiltered = activeSkillsCount < totalSkills * 0.95 && activeSkillsCount > 0;
    
    // If we're showing all challenges (or near all), we don't force recenter.
    // Let the user stay where they are reading the map.
    if (!isFiltered || !searchQuery) {
      prevSearchQueryRef.current = searchQuery;
      return;
    }

    // Only recenter if the actual search query caused this filtering change
    // Don't recenter just because the user toggled the "All Time" / "Open" flag
    if (searchQuery === prevSearchQueryRef.current) {
      return;
    }
    prevSearchQueryRef.current = searchQuery;

    fitMapToSkills();
  }, [challenges, totalSkills, mapReady, searchQuery, fitMapToSkills]);

  const handleToggleLayerMode = React.useCallback(() => {
    const nextMode = mapLayerMode === "satellite" ? "street" : "satellite";
    setMapLayerMode(nextMode);
    trackEvent("map_layer_toggle", { mode: nextMode });
  }, [mapLayerMode, setMapLayerMode]);

  const handleZoomIn = React.useCallback(() => mapRef.current?.zoomIn(), []);
  const handleZoomOut = React.useCallback(() => mapRef.current?.zoomOut(), []);

  return (
    <div
      id="asr-map-container"
      className={cn(
        "relative w-full overflow-hidden shadow-2xl transition-colors duration-500 [&_.leaflet-container]:!bg-transparent",
        mapLayerMode === "satellite"
          ? "bg-[#050505]"
          : isDark
            ? "bg-[#191a1a] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
            : "bg-[#cad2d3]",
        className || "h-[60vh] sm:h-[75vh] min-h-[500px] rounded-[2.5rem] sm:rounded-[3.5rem] border border-slate-200 dark:border-zinc-800"
      )}
    >
      <div ref={mapContainerRef} className="absolute inset-0 z-[10]" />

      {/* Map Controls - Top Right */}
      <div className="absolute top-4 right-2 sm:right-4 z-[40] flex flex-col gap-3 pointer-events-none">
        {/* Locate Me & Layer Toggle Buttons */}
        {!hideControls && (
          <>
            <button
              onClick={handleFindMe}
              title="Find my location"
              aria-label="Find my location"
              className={cn(
                "pointer-events-auto p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full border transition-all active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
                isDark
                  ? "bg-black border-zinc-800 text-white hover:bg-zinc-900 focus-visible:ring-offset-[#030303] shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
                  : "bg-white border-slate-200 text-black shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:bg-slate-50 theme-focus"
              )}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 22 22"
                fill="none"
                aria-hidden="true"
                className="shrink-0"
              >
                <circle
                  cx="11"
                  cy="11"
                  r="10"
                  className={cn(
                    isDark ? "fill-blue-500/25" : "fill-blue-500/20",
                    isLocating && "animate-pulse"
                  )}
                />
                <circle
                  cx="11"
                  cy="11"
                  r="6.5"
                  className="fill-white"
                  stroke="rgba(37, 99, 235, 0.2)"
                  strokeWidth="0.5"
                />
                <circle
                  cx="11"
                  cy="11"
                  r="4.75"
                  className={cn(
                    "fill-blue-500 transition-transform duration-200 origin-center",
                    isLocating && "scale-90"
                  )}
                />
              </svg>
            </button>

            {/* Satellite / Street Geometry Toggle */}
            <button
              onClick={handleToggleLayerMode}
              title={mapLayerMode === "satellite" ? "Switch to Street Map" : "Switch to Satellite Imagery"}
              aria-label={mapLayerMode === "satellite" ? "Switch to Street Map" : "Switch to Satellite Imagery"}
              aria-pressed={mapLayerMode === "satellite"}
              className={cn(
                "pointer-events-auto p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full border transition-all active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
                mapLayerMode === "satellite"
                  ? "bg-blue-600 border-blue-400 text-white shadow-[0_0_16px_rgba(59,130,246,0.5)]"
                  : isDark
                    ? "bg-black border-zinc-800 text-white hover:bg-zinc-900 focus-visible:ring-offset-[#030303] shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
                    : "bg-white border-slate-200 text-black shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:bg-slate-50 theme-focus"
              )}
            >
              {mapLayerMode === "satellite" ? (
                <MapIcon size={18} strokeWidth={2.5} />
              ) : (
                <Satellite size={18} strokeWidth={2.25} />
              )}
            </button>
          </>
        )}

        {/* Zoom Controls (Desktop Only) */}
        <div className={cn(
          "pointer-events-auto relative flex flex-col items-center p-0.5 rounded-[2rem] transition-all duration-300 group hidden md:flex",
          isDark ? "shadow-[0_4px_12px_rgba(0,0,0,0.6)]" : "shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
        )}>
          <div className="absolute inset-0 rounded-[2rem] pointer-events-none">
            <div className="absolute inset-0 rounded-[2rem] neon-gradient-base animate-border-shift blur-[6px] opacity-0 group-hover:opacity-40 transition-opacity duration-300" />
            <div className="absolute inset-0 rounded-[2rem] neon-gradient-base animate-border-shift opacity-50 group-hover:opacity-90 transition-opacity duration-300" />
            <div className={cn(
              "absolute inset-[1.5px] rounded-[2rem] z-10 transition-colors",
              isDark ? "bg-zinc-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-1px_2px_rgba(0,0,0,0.8)]" : "bg-white shadow-[inset_0_2px_3px_rgba(255,255,255,1),inset_0_-1px_2px_rgba(0,0,0,0.1)]"
            )} />
          </div>

          <button
            onClick={handleZoomIn}
            className={cn(
              "relative z-20 p-2.5 rounded-t-full transition-all active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              isDark ? "text-white hover:bg-white/10" : "text-zinc-900 hover:bg-black/5"
            )}
          >
            <Plus size={18} strokeWidth={2.5}/>
          </button>
          <div className={cn("relative z-20 w-4 h-px my-0.5", isDark ? "bg-white/10" : "bg-black/10")} />
          <button
            onClick={handleZoomOut}
            className={cn(
              "relative z-20 p-2.5 rounded-b-full transition-all active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              isDark ? "text-white hover:bg-white/10" : "text-zinc-900 hover:bg-black/5"
            )}
          >
            <Minus size={18} strokeWidth={2.5}/>
          </button>
        </div>
      </div>
    </div>
  );
});
