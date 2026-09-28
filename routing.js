export class RoutingService {
  constructor(config = {}, fetchImplementation = fetch) {
    this.config = config;
    this.fetch = fetchImplementation.bind(globalThis);
  }

  async matrix(origin, facilities) {
    if (!origin || facilities.length === 0) return new Map();
    if (this.config.provider === 'api') return this.fromNearSignalApi(origin, facilities);
    return this.fromOsrm(origin, facilities);
  }

  async fromOsrm(origin, facilities) {
    const endpoint = this.config.endpoint || 'https://router.project-osrm.org';
    const points = [origin, ...facilities.map((facility) => facility.coordinates)];
    const coordinates = points.map((point) => `${point.lon},${point.lat}`).join(';');
    const destinationIndexes = facilities.map((_, index) => index + 1).join(';');
    const data = await this.request(`${endpoint}/table/v1/driving/${coordinates}?sources=0&destinations=${destinationIndexes}&annotations=duration,distance`);
    const calculatedAt = new Date().toISOString();
    return new Map(facilities.flatMap((facility, index) => {
      // OSRM returns only the requested destinations, so column zero is the
      // first facility even though its coordinate index in the request is one.
      const durationSeconds = data.durations?.[0]?.[index];
      const distanceMeters = data.distances?.[0]?.[index];
      if (!Number.isFinite(durationSeconds) || !Number.isFinite(distanceMeters)) return [];
      return [[facility.id, { durationSeconds, staticDurationSeconds: durationSeconds, distanceMeters, provider: 'OpenStreetMap / OSRM', trafficAware: false, calculatedAt }]];
    }));
  }

  async fromNearSignalApi(origin, facilities) {
    const data = await this.request(this.config.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ origin, destinations: facilities.map((facility) => ({ id: facility.id, ...facility.coordinates })) })
    });
    return new Map(data.routes.map((route) => [route.facilityId, route]));
  }

  async request(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs || 8000);
    try {
      const response = await this.fetch(url, { cache: 'no-store', ...options, signal: controller.signal });
      if (!response.ok) throw new Error(`Routing request failed (${response.status})`);
      return await response.json();
    } finally { clearTimeout(timer); }
  }
}

export function presentRoute(route, now = new Date()) {
  const minutes = Math.max(1, Math.round(route.durationSeconds / 60));
  const arrival = new Date(now.getTime() + route.durationSeconds * 1000);
  return {
    minutes,
    miles: (route.distanceMeters / 1609.344).toFixed(1),
    arrivalLabel: arrival.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    provider: route.provider,
    trafficAware: Boolean(route.trafficAware),
    calculatedAt: route.calculatedAt
  };
}
