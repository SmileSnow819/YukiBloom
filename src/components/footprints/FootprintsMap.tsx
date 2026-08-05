import './footprints.css';
import { Icon } from '@iconify/react';
import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';

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
}

export interface FootprintsData {
  locations: FootprintLocation[];
  stays: FootprintStay[];
  routes: FootprintRoute[];
}

interface FootprintsMapProps {
  data: FootprintsData;
}

type Point = {
  x: number;
  y: number;
};

const VIEW_BOX = {
  width: 1040,
  height: 640,
};

const GEO_BOUNDS = {
  minLng: 73,
  maxLng: 135,
  minLat: 18,
  maxLat: 54,
};

const ROUTE_DURATION = 0.72;
const ROUTE_GAP = 0.18;
const GRID_ROWS = [80, 148, 216, 284, 352, 420, 488, 556];
const GRID_COLUMNS = [90, 198, 306, 414, 522, 630, 738, 846, 954];

const transportIconMap: Record<string, string> = {
  train: 'ri:train-line',
  highspeed: 'ri:train-wifi-line',
  flight: 'ri:plane-line',
  car: 'ri:car-line',
  walk: 'ri:walk-line',
  ship: 'ri:ship-line',
};

function project(location: FootprintLocation): Point {
  const x = ((location.lng - GEO_BOUNDS.minLng) / (GEO_BOUNDS.maxLng - GEO_BOUNDS.minLng)) * 900 + 70;
  const y = ((GEO_BOUNDS.maxLat - location.lat) / (GEO_BOUNDS.maxLat - GEO_BOUNDS.minLat)) * 520 + 55;
  return { x, y };
}

function getRoutePath(from: Point, to: Point): string {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const lift = Math.min(72, Math.max(30, distance * 0.16));
  return `M ${from.x} ${from.y} Q ${midX} ${midY - lift} ${to.x} ${to.y}`;
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

export default function FootprintsMap({ data }: FootprintsMapProps) {
  const reduceMotion = useReducedMotion();
  const [playKey, setPlayKey] = useState(0);
  const [activeRouteIndex, setActiveRouteIndex] = useState(reduceMotion ? data.routes.length - 1 : 0);

  const locationMap = useMemo(() => new Map(data.locations.map((location) => [location.id, location])), [data.locations]);

  const locationPoints = useMemo(
    () =>
      data.locations.map((location) => ({
        ...location,
        point: project(location),
      })),
    [data.locations],
  );

  const routeSegments = useMemo(
    () =>
      data.routes
        .map((route, index) => {
          const from = locationMap.get(route.from);
          const to = locationMap.get(route.to);
          if (!from || !to) return null;

          const fromPoint = project(from);
          const toPoint = project(to);

          return {
            ...route,
            index,
            fromLocation: from,
            toLocation: to,
            fromPoint,
            toPoint,
            midPoint: {
              x: (fromPoint.x + toPoint.x) / 2,
              y: (fromPoint.y + toPoint.y) / 2,
            },
            path: getRoutePath(fromPoint, toPoint),
          };
        })
        .filter((segment): segment is NonNullable<typeof segment> => Boolean(segment)),
    [data.routes, locationMap],
  );

  const activeRoute = routeSegments[Math.min(activeRouteIndex, routeSegments.length - 1)];
  const routeSummary = routeSegments
    .map((segment, index) => ({
      key: `${segment.from}-${segment.to}-${index}-from`,
      name: segment.fromLocation.name,
    }))
    .concat({
      key: `${routeSegments.at(-1)?.to || 'end'}-final`,
      name: routeSegments.at(-1)?.toLocation.name || '',
    });

  useEffect(() => {
    const currentPlayKey = playKey;
    if (reduceMotion || routeSegments.length === 0) {
      setActiveRouteIndex(routeSegments.length - 1);
      return;
    }

    if (currentPlayKey < 0) return;

    setActiveRouteIndex(0);
    const timers = routeSegments.map((_, index) =>
      window.setTimeout(
        () => {
          setActiveRouteIndex(index);
        },
        (ROUTE_DURATION + ROUTE_GAP) * index * 1000,
      ),
    );

    return () => {
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [playKey, reduceMotion, routeSegments]);

  return (
    <div className="footprints">
      <section className="footprints-hero" aria-label="足迹地图">
        <div className="footprints-map-toolbar">
          <div>
            <p className="footprints-eyebrow">Footprints Map</p>
            <h3>{activeRoute ? `${activeRoute.fromLocation.name} -> ${activeRoute.toLocation.name}` : '我的足迹地图'}</h3>
          </div>
          <button type="button" className="footprints-replay-button" onClick={() => setPlayKey((value) => value + 1)}>
            <Icon icon="ri:replay-line" />
            再次播放
          </button>
        </div>

        <div className="footprints-map-stage">
          <svg
            className="footprints-map"
            viewBox={`0 0 ${VIEW_BOX.width} ${VIEW_BOX.height}`}
            role="img"
            aria-label="足迹路线地图"
          >
            <defs>
              <linearGradient id="footprints-route-gradient" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#ff6b9a" />
                <stop offset="52%" stopColor="#a56eff" />
                <stop offset="100%" stopColor="#55acd5" />
              </linearGradient>
              <filter id="footprints-glow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="7" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <g className="footprints-grid">
              {GRID_ROWS.map((y) => (
                <line key={`horizontal-${y}`} x1="40" x2="1000" y1={y} y2={y} />
              ))}
              {GRID_COLUMNS.map((x) => (
                <line key={`vertical-${x}`} x1={x} x2={x} y1="52" y2="590" />
              ))}
            </g>

            <g className="footprints-china-map">
              <path d="M155 162 L238 108 L355 126 L452 88 L562 126 L670 112 L778 178 L850 255 L894 338 L850 430 L746 486 L615 522 L505 500 L392 548 L282 510 L220 432 L138 404 L92 315 L118 232 Z" />
              <path d="M770 462 C812 448 855 462 874 492 C828 510 795 502 770 462 Z" />
              <path d="M845 342 C883 350 912 378 918 410 C882 404 856 383 845 342 Z" />
            </g>

            <g className="footprints-routes" key={`routes-${playKey}`}>
              {routeSegments.map((segment) => (
                <motion.path
                  key={`${segment.from}-${segment.to}-${segment.index}`}
                  d={segment.path}
                  className="footprints-route-shadow"
                  initial={{ pathLength: reduceMotion ? 1 : 0, opacity: reduceMotion ? 0.28 : 0 }}
                  animate={{ pathLength: 1, opacity: 0.28 }}
                  transition={{
                    duration: reduceMotion ? 0 : ROUTE_DURATION,
                    delay: reduceMotion ? 0 : segment.index * (ROUTE_DURATION + ROUTE_GAP),
                    ease: 'easeInOut',
                  }}
                />
              ))}
              {routeSegments.map((segment) => (
                <motion.path
                  key={`${segment.from}-${segment.to}-${segment.index}-main`}
                  d={segment.path}
                  className="footprints-route-line"
                  initial={{ pathLength: reduceMotion ? 1 : 0, opacity: reduceMotion ? 1 : 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{
                    duration: reduceMotion ? 0 : ROUTE_DURATION,
                    delay: reduceMotion ? 0 : segment.index * (ROUTE_DURATION + ROUTE_GAP),
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </g>

            {activeRoute && (
              <motion.circle
                key={`runner-${playKey}-${activeRouteIndex}`}
                className="footprints-runner"
                r="7"
                initial={activeRoute.fromPoint}
                animate={activeRoute.toPoint}
                transition={{ duration: reduceMotion ? 0 : ROUTE_DURATION, ease: 'easeInOut' }}
              />
            )}

            <g className="footprints-points">
              {locationPoints.map((location, index) => (
                <motion.g
                  key={location.id}
                  initial={{ scale: reduceMotion ? 1 : 0.6, opacity: reduceMotion ? 1 : 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: reduceMotion ? 0 : 0.38, delay: reduceMotion ? 0 : index * 0.08 }}
                  style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                >
                  <circle
                    className="footprints-point-halo"
                    cx={location.point.x}
                    cy={location.point.y}
                    r="18"
                    style={{ fill: location.color }}
                  />
                  <circle
                    className="footprints-point"
                    cx={location.point.x}
                    cy={location.point.y}
                    r="8"
                    style={{ fill: location.color }}
                  />
                  <text x={location.point.x + 13} y={location.point.y - 10} className="footprints-city-label">
                    {location.name}
                  </text>
                </motion.g>
              ))}
            </g>
          </svg>
        </div>

        <div className="footprints-route-summary">
          {routeSummary
            .filter((item) => Boolean(item.name))
            .map((item, index) => (
              <span key={item.key}>
                {index > 0 && <i aria-hidden="true">{'->'}</i>}
                {item.name}
              </span>
            ))}
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

        <div className="footprints-panel">
          <div className="footprints-section-heading">
            <Icon icon="ri:route-line" />
            <h3>路线记录</h3>
          </div>
          <div className="footprints-route-list">
            {routeSegments.map((segment) => {
              const icon = segment.transport ? transportIconMap[segment.transport] || 'ri:map-pin-line' : 'ri:map-pin-line';
              return (
                <article
                  key={`${segment.from}-${segment.to}-${segment.index}-card`}
                  className={`footprints-route-card ${segment.index === activeRouteIndex ? 'is-active' : ''}`}
                >
                  <Icon icon={icon} className="footprints-transport-icon" />
                  <div>
                    <strong>
                      {segment.fromLocation.name} {'->'} {segment.toLocation.name}
                    </strong>
                    <span>
                      {segment.date || '未标记日期'} / {segment.label || getTypeLabel(segment.transport)}
                    </span>
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
