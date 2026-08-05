import './footprints.css';
import { Icon } from '@iconify/react';
import type { ECharts, EChartsOption } from 'echarts';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface FootprintLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type?: string;
  color?: string;
  icon?: string;
}

export interface FootprintStay {
  startDate: string;
  endDate?: string;
  isPresent?: boolean;
  locationId: string;
  title: string;
  type?: string;
  description?: string;
}

export interface FootprintRoute {
  from: string;
  to: string;
  date?: string;
  transport?: string;
  label?: string;
  description?: string;
  images?: string[];
}

export interface FootprintsData {
  locations: FootprintLocation[];
  stays: FootprintStay[];
  routes: FootprintRoute[];
}

interface FootprintsMapProps {
  data: FootprintsData;
}

type RouteSegment = FootprintRoute & {
  index: number;
  fromLocation: FootprintLocation;
  toLocation: FootprintLocation;
};

const ROUTE_DURATION = 2100;
const ROUTE_EFFECT_PERIOD = 2.08;
const MAP_SWITCH_DURATION = 260;
const CHINA_CENTER: [number, number] = [104.2, 36.2];
const LOCATION_COLOR_PALETTE = [
  '#e11d48',
  '#2563eb',
  '#f59e0b',
  '#16a34a',
  '#7c3aed',
  '#0891b2',
  '#db2777',
  '#ea580c',
  '#4f46e5',
  '#059669',
  '#be123c',
];

const transportRunnerIconMap: Record<string, string> = {
  train: 'ri:train-line',
  highspeed: 'ri:train-wifi-line',
  flight: 'ri:plane-line',
  car: 'ri:car-line',
  walk: 'ri:walk-line',
  ship: 'ri:ship-line',
};

const labelPositionMap: Record<string, 'top' | 'right' | 'bottom' | 'left'> = {
  sanmenxia: 'top',
  luoyang: 'right',
  xian: 'left',
  beijing: 'top',
  tianjin: 'right',
  shijiazhuang: 'bottom',
  shanghai: 'right',
  hangzhou: 'bottom',
  nanjing: 'top',
};

const labelDistanceMap: Record<string, number> = {
  sanmenxia: 18,
  luoyang: 12,
  xian: 18,
  beijing: 12,
  tianjin: 16,
  shijiazhuang: 16,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getGeneratedLocationColor(index: number): string {
  return LOCATION_COLOR_PALETTE[index % LOCATION_COLOR_PALETTE.length];
}

function getDistance(from: FootprintLocation, to: FootprintLocation): number {
  return Math.hypot(to.lng - from.lng, to.lat - from.lat);
}

function getGeoView(route: RouteSegment | undefined, isOverview: boolean) {
  if (!route || isOverview) return { center: CHINA_CENTER, zoom: 1.18 };

  const distance = getDistance(route.fromLocation, route.toLocation);
  return {
    center: [(route.fromLocation.lng + route.toLocation.lng) / 2, (route.fromLocation.lat + route.toLocation.lat) / 2],
    zoom: clamp(9.5 / Math.max(distance, 0.55), 2.25, 7.2),
  };
}

function getTypeLabel(type?: string): string {
  const labelMap: Record<string, string> = {
    hometown: '故乡',
    home: '居住',
    internship: '实习',
    travel: '旅行',
    study: '学习',
    pass: '路过',
  };

  return type ? labelMap[type] || type : '足迹';
}

function getCurrentDateText(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const date = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${date}`;
}

function createRouteLine(segment: RouteSegment) {
  return {
    name: `${segment.fromLocation.name} -> ${segment.toLocation.name}`,
    coords: [
      [segment.fromLocation.lng, segment.fromLocation.lat],
      [segment.toLocation.lng, segment.toLocation.lat],
    ],
    lineStyle: {
      curveness: segment.transport === 'flight' ? 0.24 : 0.16,
    },
  };
}

export default function FootprintsMap({ data }: FootprintsMapProps) {
  const heroRef = useRef<HTMLElement | null>(null);
  const chartNodeRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ECharts | null>(null);
  const routeTimerRef = useRef<number | null>(null);
  const reduceMotion = useReducedMotion();
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState('');
  const [activeRouteIndex, setActiveRouteIndex] = useState(reduceMotion ? data.routes.length - 1 : 0);
  const [completedRouteCount, setCompletedRouteCount] = useState(reduceMotion ? data.routes.length : 0);
  const [activeLocationId, setActiveLocationId] = useState<string | undefined>(undefined);
  const [isMapSwitching, setIsMapSwitching] = useState(false);
  const [isPlaying, setIsPlaying] = useState(!reduceMotion);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isImmersive, setIsImmersive] = useState(true);

  const locationMap = useMemo(() => new Map(data.locations.map((location) => [location.id, location])), [data.locations]);
  const locationColorMap = useMemo(
    () => new Map(data.locations.map((location, index) => [location.id, location.color || getGeneratedLocationColor(index)])),
    [data.locations],
  );

  const routeSegments = useMemo(
    () =>
      data.routes
        .map((route, index) => {
          const fromLocation = locationMap.get(route.from);
          const toLocation = locationMap.get(route.to);
          if (!fromLocation || !toLocation) return null;

          return {
            ...route,
            index,
            fromLocation,
            toLocation,
          };
        })
        .filter((segment): segment is RouteSegment => Boolean(segment)),
    [data.routes, locationMap],
  );

  const activeRoute = routeSegments[Math.min(activeRouteIndex, routeSegments.length - 1)];
  const isOverview = reduceMotion || completedRouteCount >= routeSegments.length;
  const activeLocation = activeLocationId ? locationMap.get(activeLocationId) : undefined;
  const finalLocation = routeSegments.at(-1)?.toLocation;
  const activeRunnerIcon = activeRoute?.transport
    ? transportRunnerIconMap[activeRoute.transport] || 'ri:map-pin-line'
    : 'ri:map-pin-line';
  const currentDateText = useMemo(() => getCurrentDateText(), []);
  const isFullscreenView = isFullscreen || isImmersive;
  const visibleRouteSegments = isOverview ? routeSegments : activeRoute ? [activeRoute] : [];
  const progressPercent =
    routeSegments.length <= 1 || isOverview ? 100 : (activeRouteIndex / Math.max(routeSegments.length - 1, 1)) * 100;

  const clearRouteTimer = useCallback(() => {
    if (routeTimerRef.current === null) return;
    window.clearTimeout(routeTimerRef.current);
    routeTimerRef.current = null;
  }, []);

  const startPlayback = useCallback(() => {
    clearRouteTimer();

    if (reduceMotion || routeSegments.length === 0) {
      setIsPlaying(false);
      setActiveRouteIndex(routeSegments.length - 1);
      setCompletedRouteCount(routeSegments.length);
      setActiveLocationId(routeSegments.at(-1)?.to);
      return;
    }

    setIsPlaying(true);
    setActiveRouteIndex(0);
    setCompletedRouteCount(0);
    setActiveLocationId(routeSegments[0]?.from);
  }, [clearRouteTimer, reduceMotion, routeSegments]);

  const jumpToRoute = (index: number) => {
    const segment = routeSegments[index];
    if (!segment) return;

    clearRouteTimer();
    setIsPlaying(false);
    setActiveRouteIndex(index);
    setCompletedRouteCount(index);
    setActiveLocationId(segment.from);
  };

  const skipPlayback = () => {
    clearRouteTimer();
    setIsPlaying(false);
    setActiveRouteIndex(Math.max(routeSegments.length - 1, 0));
    setCompletedRouteCount(routeSegments.length);
    setActiveLocationId(routeSegments.at(-1)?.to);
  };

  const replayRoutes = () => {
    startPlayback();
  };

  const toggleFullscreen = async () => {
    if (!heroRef.current) return;

    if (document.fullscreenElement === heroRef.current) {
      await document.exitFullscreen();
      setIsImmersive(false);
    } else if (isImmersive) {
      setIsImmersive(false);
      window.setTimeout(() => chartRef.current?.resize(), 120);
    } else {
      await heroRef.current.requestFullscreen();
    }
  };

  useEffect(() => {
    let disposed = false;
    let cleanupResize: (() => void) | undefined;

    async function setupChart() {
      if (!chartNodeRef.current) return;

      try {
        const echarts = await import('echarts');
        const response = await fetch('/data/china.geojson');
        if (!response.ok) throw new Error(`GeoJSON request failed: ${response.status}`);
        const chinaGeoJson = await response.json();
        if (disposed || !chartNodeRef.current) return;

        echarts.registerMap('china-footprints', chinaGeoJson);
        chartRef.current = echarts.init(chartNodeRef.current, undefined, { renderer: 'canvas' });
        cleanupResize = () => chartRef.current?.resize();
        window.addEventListener('resize', cleanupResize);
        setMapReady(true);
        setMapError('');
      } catch (error) {
        if (disposed) return;
        console.error('[FootprintsMap] Failed to initialize ECharts map', error);
        setMapError('地图加载失败，请重启开发服务后刷新。');
      }
    }

    setupChart();

    return () => {
      disposed = true;
      if (cleanupResize) window.removeEventListener('resize', cleanupResize);
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    const syncFullscreenState = () => {
      const nextIsFullscreen = document.fullscreenElement === heroRef.current;
      setIsFullscreen(nextIsFullscreen);
      if (nextIsFullscreen) setIsImmersive(false);
      window.setTimeout(() => chartRef.current?.resize(), 120);
    };

    document.addEventListener('fullscreenchange', syncFullscreenState);

    return () => document.removeEventListener('fullscreenchange', syncFullscreenState);
  }, []);

  useEffect(() => {
    if (!isImmersive) return;
    window.setTimeout(() => chartRef.current?.resize(), 120);
  }, [isImmersive]);

  useEffect(() => {
    startPlayback();

    return clearRouteTimer;
  }, [clearRouteTimer, startPlayback]);

  useEffect(() => {
    if (reduceMotion || !isPlaying || routeSegments.length === 0) return;

    const segment = routeSegments[activeRouteIndex];
    if (!segment) return;

    clearRouteTimer();
    setActiveLocationId(segment.from);
    routeTimerRef.current = window.setTimeout(() => {
      routeTimerRef.current = null;
      setCompletedRouteCount(activeRouteIndex + 1);
      setActiveLocationId(segment.to);

      if (activeRouteIndex >= routeSegments.length - 1) {
        setIsPlaying(false);
      } else {
        setActiveRouteIndex((index) => index + 1);
      }
    }, ROUTE_DURATION);

    return clearRouteTimer;
  }, [activeRouteIndex, clearRouteTimer, isPlaying, reduceMotion, routeSegments]);

  useEffect(() => {
    if (activeRouteIndex < 0 || reduceMotion || isOverview) return;

    setIsMapSwitching(true);
    const timer = window.setTimeout(() => setIsMapSwitching(false), MAP_SWITCH_DURATION);

    return () => window.clearTimeout(timer);
  }, [activeRouteIndex, isOverview, reduceMotion]);

  useEffect(() => {
    if (!mapReady || !chartRef.current) return;

    const visibleLocationIds = new Set<string>();
    if (isOverview) {
      for (const location of data.locations) visibleLocationIds.add(location.id);
    } else if (activeRoute) {
      visibleLocationIds.add(activeRoute.from);
      visibleLocationIds.add(activeRoute.to);
      if (activeLocationId) visibleLocationIds.add(activeLocationId);
    }

    const view = getGeoView(activeRoute, isOverview);
    const points = data.locations
      .filter((location) => visibleLocationIds.has(location.id) && location.id !== activeLocationId)
      .map((location) => ({
        name: location.name,
        value: [location.lng, location.lat],
        label: {
          position: labelPositionMap[location.id] || 'right',
          distance: labelDistanceMap[location.id] || 10,
        },
        itemStyle: { color: locationColorMap.get(location.id) || '#ff6b9a' },
      }));
    const activePoint =
      activeLocation && visibleLocationIds.has(activeLocation.id)
        ? [
            {
              name: activeLocation.name,
              value: [activeLocation.lng, activeLocation.lat],
              label: {
                position: labelPositionMap[activeLocation.id] || 'top',
                distance: labelDistanceMap[activeLocation.id] || 10,
              },
              itemStyle: { color: locationColorMap.get(activeLocation.id) || '#ff6b9a' },
            },
          ]
        : [];
    const lineData = visibleRouteSegments.map(createRouteLine);

    const option: EChartsOption = {
      animationDurationUpdate: reduceMotion || !isOverview ? 0 : 980,
      animationEasingUpdate: 'cubicInOut',
      tooltip: {
        trigger: 'item',
        confine: true,
      },
      geo: {
        map: 'china-footprints',
        roam: false,
        center: view.center,
        zoom: view.zoom,
        aspectScale: 0.86,
        layoutCenter: ['52%', '54%'],
        layoutSize: '104%',
        silent: true,
        itemStyle: {
          areaColor: '#fff1f6',
          borderColor: '#f48aad',
          borderWidth: 1.1,
          shadowBlur: 14,
          shadowColor: 'rgba(218,112,138,0.16)',
        },
        emphasis: {
          disabled: true,
        },
      },
      series: [
        {
          name: '路线轨道',
          type: 'lines',
          coordinateSystem: 'geo',
          zlevel: 2,
          silent: true,
          data: lineData,
          lineStyle: {
            color: isOverview ? 'rgba(244,118,158,0.26)' : 'rgba(244,118,158,0.32)',
            width: isOverview ? 5 : 7,
            opacity: 1,
          },
        },
        {
          name: '足迹路线',
          type: 'lines',
          coordinateSystem: 'geo',
          zlevel: 3,
          silent: true,
          data: lineData,
          effect: {
            show: !isOverview && !reduceMotion,
            period: ROUTE_EFFECT_PERIOD,
            trailLength: 0.18,
            symbol: activeRoute?.transport === 'flight' ? 'triangle' : 'arrow',
            symbolSize: activeRoute?.transport === 'flight' ? 12 : 10,
            color: activeRoute?.transport === 'flight' ? '#55acd5' : '#ff5f93',
          },
          lineStyle: {
            color: activeRoute?.transport === 'flight' ? '#55acd5' : '#ff5f93',
            width: isOverview ? 2.4 : 3.2,
            opacity: 0.9,
            type: activeRoute?.transport === 'flight' ? 'dashed' : 'solid',
          },
        },
        {
          name: '城市',
          type: 'scatter',
          coordinateSystem: 'geo',
          zlevel: 4,
          symbolSize: isOverview ? 12 : 14,
          data: points,
          label: {
            show: true,
            formatter: '{b}',
            position: 'right',
            color: '#1f2937',
            fontSize: isOverview ? 13 : 15,
            fontWeight: 800,
            textBorderColor: '#fff',
            textBorderWidth: 4,
          },
          labelLayout: {
            hideOverlap: true,
          },
          itemStyle: {
            borderColor: '#fff',
            borderWidth: 3,
            shadowBlur: 10,
            shadowColor: 'rgba(244,95,147,0.34)',
          },
        },
        {
          name: '当前',
          type: 'effectScatter',
          coordinateSystem: 'geo',
          zlevel: 5,
          data: activePoint,
          symbolSize: 18,
          rippleEffect: {
            brushType: 'stroke',
            scale: 5.2,
            period: 2.4,
            number: 3,
          },
          label: {
            show: true,
            formatter: '{b}',
            position: 'top',
            color: '#111827',
            fontSize: 18,
            fontWeight: 900,
            textBorderColor: '#fff',
            textBorderWidth: 5,
          },
          labelLayout: {
            hideOverlap: true,
          },
          itemStyle: {
            borderColor: '#fff',
            borderWidth: 4,
            shadowBlur: 20,
            shadowColor: 'rgba(244,95,147,0.6)',
          },
        },
      ],
    };

    chartRef.current.setOption(option, true);
  }, [
    activeLocation,
    activeLocationId,
    activeRoute,
    data.locations,
    isOverview,
    locationColorMap,
    mapReady,
    reduceMotion,
    visibleRouteSegments,
  ]);

  return (
    <div className="footprints">
      <section
        ref={heroRef}
        className={`footprints-hero ${isFullscreen ? 'is-fullscreen' : ''} ${isImmersive ? 'is-immersive' : ''}`}
        aria-label="足迹地图"
      >
        <div className="footprints-map-toolbar">
          <div>
            <p className="footprints-eyebrow">足迹地图</p>
            <h3>
              {currentDateText} 位置：{finalLocation?.name || '未标记'}
            </h3>
          </div>
          <div className="footprints-map-actions">
            <button type="button" className="footprints-action-button" onClick={replayRoutes}>
              <Icon icon="ri:replay-line" />
              再次播放
            </button>
            {!isOverview && (
              <button type="button" className="footprints-action-button" onClick={skipPlayback}>
                <Icon icon="ri:skip-forward-line" />
                跳过
              </button>
            )}
            <button type="button" className="footprints-action-button" onClick={toggleFullscreen}>
              <Icon icon={isFullscreenView ? 'ri:fullscreen-exit-line' : 'ri:fullscreen-line'} />
              {isFullscreenView ? '退出全屏' : '全屏'}
            </button>
          </div>
        </div>

        <div className="footprints-map-stage">
          <AnimatePresence mode="wait">
            {activeRoute && (
              <motion.article
                key={`${activeRoute.from}-${activeRoute.to}-${activeRoute.index}`}
                className="footprints-map-detail"
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={{ duration: reduceMotion ? 0 : 0.28, ease: 'easeOut' }}
              >
                <div className="footprints-map-detail-icon">
                  <Icon icon={activeRunnerIcon} />
                </div>
                <div className="footprints-map-detail-body">
                  <strong>
                    {activeRoute.fromLocation.name} <span>{'->'}</span> {activeRoute.toLocation.name}
                  </strong>
                  <em>
                    {activeRoute.date || '未标记日期'} / {activeRoute.label || getTypeLabel(activeRoute.transport)}
                  </em>
                  {activeRoute.description && <p>{activeRoute.description}</p>}
                  {activeRoute.images?.length ? (
                    <div className="footprints-map-detail-images">
                      {activeRoute.images.slice(0, 3).map((image) => (
                        <img
                          key={image}
                          src={image}
                          alt={`${activeRoute.fromLocation.name} 到 ${activeRoute.toLocation.name}的照片`}
                          loading="lazy"
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              </motion.article>
            )}
          </AnimatePresence>
          <div
            ref={chartNodeRef}
            className={`footprints-map ${isMapSwitching ? 'is-switching' : ''}`}
            role="img"
            aria-label="足迹路线地图"
          />
          {!mapReady && <div className="footprints-map-loading">{mapError || '地图加载中...'}</div>}
        </div>
        <fieldset className="footprints-progress">
          <legend className="footprints-progress-label">足迹播放进度</legend>
          <div className="footprints-progress-track">
            <div className="footprints-progress-fill" style={{ width: `${progressPercent}%` }} />
            {routeSegments.map((segment, index) => (
              <button
                key={`${segment.from}-${segment.to}-${index}-progress`}
                type="button"
                className={`footprints-progress-dot ${index <= activeRouteIndex || isOverview ? 'is-active' : ''}`}
                style={{ left: `${routeSegments.length <= 1 ? 100 : (index / (routeSegments.length - 1)) * 100}%` }}
                onClick={() => jumpToRoute(index)}
                aria-label={`跳到 ${segment.fromLocation.name} 到 ${segment.toLocation.name}`}
                title={`${segment.fromLocation.name} -> ${segment.toLocation.name}`}
              />
            ))}
          </div>
        </fieldset>
      </section>

      <section className="footprints-content">
        <div className="footprints-panel">
          <div className="footprints-section-heading">
            <Icon icon="ri:route-line" />
            <h3>路线记录</h3>
          </div>
          <div className="footprints-route-list">
            {routeSegments.map((segment) => (
              <article
                key={`${segment.from}-${segment.to}-${segment.index}-route`}
                className={`footprints-route-card ${segment.index === activeRouteIndex ? 'is-active' : ''}`}
              >
                <Icon
                  className="footprints-transport-icon"
                  icon={transportRunnerIconMap[segment.transport || ''] || 'ri:map-pin-line'}
                />
                <div>
                  <strong>
                    {segment.fromLocation.name} <span>{'->'}</span> {segment.toLocation.name}
                  </strong>
                  <span>
                    {segment.date || '未标记日期'} / {segment.label || getTypeLabel(segment.transport)}
                  </span>
                  {segment.description && <p>{segment.description}</p>}
                  {segment.images?.length ? (
                    <div className="footprints-route-images">
                      {segment.images.slice(0, 4).map((image) => (
                        <img
                          key={image}
                          src={image}
                          alt={`${segment.fromLocation.name} 到 ${segment.toLocation.name}的照片`}
                          loading="lazy"
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
