import './footprints.css';
import { Icon } from '@iconify/react';
import type { ECharts, EChartsOption } from 'echarts';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';

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

const ROUTE_DURATION = 2500;
const ROUTE_GAP = 0;
const POINT_REVEAL_DELAY = 0;
const ROUTE_EFFECT_PERIOD = 2.48;
const MAP_SWITCH_DURATION = 260;
const CHINA_CENTER: [number, number] = [104.2, 36.2];

const transportRunnerIconMap: Record<string, string> = {
  train: 'ri:train-line',
  highspeed: 'ri:train-wifi-line',
  flight: 'ri:plane-line',
  car: 'ri:car-line',
  walk: 'ri:walk-line',
  ship: 'ri:ship-line',
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
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

function formatStayDate(stay: FootprintStay): string {
  return `${stay.startDate} - ${stay.isPresent ? '至今' : stay.endDate || ''}`;
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
  const chartNodeRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ECharts | null>(null);
  const reduceMotion = useReducedMotion();
  const [playKey, setPlayKey] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState('');
  const [activeRouteIndex, setActiveRouteIndex] = useState(reduceMotion ? data.routes.length - 1 : 0);
  const [completedRouteCount, setCompletedRouteCount] = useState(reduceMotion ? data.routes.length : 0);
  const [activeLocationId, setActiveLocationId] = useState<string | undefined>(undefined);
  const [isMapSwitching, setIsMapSwitching] = useState(false);

  const locationMap = useMemo(() => new Map(data.locations.map((location) => [location.id, location])), [data.locations]);

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
  const activeRunnerIcon = activeRoute?.transport
    ? transportRunnerIconMap[activeRoute.transport] || 'ri:map-pin-line'
    : 'ri:map-pin-line';
  const visibleRouteSegments = isOverview ? routeSegments : activeRoute ? [activeRoute] : [];

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
    const currentPlayKey = playKey;
    if (reduceMotion || routeSegments.length === 0) {
      setActiveRouteIndex(routeSegments.length - 1);
      setCompletedRouteCount(routeSegments.length);
      setActiveLocationId(routeSegments.at(-1)?.to);
      return;
    }

    if (currentPlayKey < 0) return;

    setActiveRouteIndex(0);
    setCompletedRouteCount(0);
    setActiveLocationId(routeSegments[0]?.from);
    const timers = routeSegments.flatMap((segment, index) => [
      window.setTimeout(
        () => {
          setActiveRouteIndex(index);
          setActiveLocationId(segment.from);
        },
        (ROUTE_DURATION + ROUTE_GAP) * index,
      ),
      window.setTimeout(
        () => {
          setCompletedRouteCount(index + 1);
          setActiveLocationId(segment.to);
        },
        (ROUTE_DURATION + ROUTE_GAP) * index + ROUTE_DURATION + POINT_REVEAL_DELAY,
      ),
    ]);

    return () => {
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [playKey, reduceMotion, routeSegments]);

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
        itemStyle: { color: location.color || '#ff6b9a' },
      }));
    const activePoint =
      activeLocation && visibleLocationIds.has(activeLocation.id)
        ? [
            {
              name: activeLocation.name,
              value: [activeLocation.lng, activeLocation.lat],
              itemStyle: { color: activeLocation.color || '#ff6b9a' },
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
  }, [activeLocation, activeLocationId, activeRoute, data.locations, isOverview, mapReady, reduceMotion, visibleRouteSegments]);

  return (
    <div className="footprints">
      <section className="footprints-hero" aria-label="足迹地图">
        <div className="footprints-map-toolbar">
          <div>
            <p className="footprints-eyebrow">足迹地图</p>
            <h3>{activeRoute ? `${activeRoute.fromLocation.name} -> ${activeRoute.toLocation.name}` : '我的足迹地图'}</h3>
          </div>
          <button type="button" className="footprints-replay-button" onClick={() => setPlayKey((value) => value + 1)}>
            <Icon icon="ri:replay-line" />
            再次播放
          </button>
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
                  {activeLocation && <small>当前：{activeLocation.name}</small>}
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
      </section>

      <section className="footprints-content">
        <div className="footprints-panel">
          <div className="footprints-section-heading">
            <Icon icon="ri:map-pin-time-line" />
            <h3>停留记录</h3>
          </div>
          <div className="footprints-stay-list">
            {data.stays.map((stay) => {
              const location = locationMap.get(stay.locationId);
              return (
                <article key={`${stay.locationId}-${stay.startDate}`} className="footprints-stay">
                  <div className="footprints-stay-date">{formatStayDate(stay)}</div>
                  <div>
                    <div className="footprints-stay-title">
                      <span>{location?.name || stay.locationId}</span>
                      <em>{getTypeLabel(stay.type)}</em>
                    </div>
                    <p>{stay.description}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
