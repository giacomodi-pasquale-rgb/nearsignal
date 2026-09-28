import test from 'node:test';
import assert from 'node:assert/strict';
import { RoutingService, presentRoute } from '../routing.js';

test('OSRM adapter returns sourced distance and duration without claiming traffic', async () => {
  const fakeFetch = async () => ({ ok: true, json: async () => ({ durations: [[600]], distances: [[8046.72]] }) });
  const service = new RoutingService({ provider: 'osrm', endpoint: 'https://routing.test' }, fakeFetch);
  const routes = await service.matrix({ lat: 40.8, lon: -74.2 }, [{ id: 'hospital', coordinates: { lat: 40.7, lon: -74.3 } }]);
  const route = routes.get('hospital');
  assert.equal(route.durationSeconds, 600);
  assert.equal(route.distanceMeters, 8046.72);
  assert.equal(route.trafficAware, false);
  assert.equal(route.provider, 'OpenStreetMap / OSRM');
});

test('OSRM adapter keeps multiple destination results paired with their facilities', async () => {
  const fakeFetch = async () => ({ ok: true, json: async () => ({ durations: [[120, 900]], distances: [[1000, 12000]] }) });
  const service = new RoutingService({ provider: 'osrm', endpoint: 'https://routing.test' }, fakeFetch);
  const routes = await service.matrix({ lat: 40.8, lon: -74.2 }, [
    { id: 'nearby', coordinates: { lat: 40.81, lon: -74.2 } },
    { id: 'farther', coordinates: { lat: 40.7, lon: -74.3 } }
  ]);
  assert.equal(routes.get('nearby').durationSeconds, 120);
  assert.equal(routes.get('nearby').distanceMeters, 1000);
  assert.equal(routes.get('farther').durationSeconds, 900);
  assert.equal(routes.get('farther').distanceMeters, 12000);
});

test('route presenter calculates minutes, miles, and arrival consistently', () => {
  const route = presentRoute({ durationSeconds: 900, distanceMeters: 8046.72, provider: 'test', trafficAware: true, calculatedAt: '2026-08-17T12:00:00Z' }, new Date('2026-08-17T12:00:00Z'));
  assert.equal(route.minutes, 15);
  assert.equal(route.miles, '5.0');
  assert.equal(route.trafficAware, true);
  assert.ok(route.arrivalLabel);
});

test('production API adapter preserves provider traffic provenance', async () => {
  const fakeFetch = async () => ({ ok: true, json: async () => ({ routes: [{ facilityId: 'hospital', durationSeconds: 480, staticDurationSeconds: 600, distanceMeters: 3218, provider: 'Google Routes', trafficAware: true, calculatedAt: '2026-08-17T12:00:00Z' }] }) });
  const service = new RoutingService({ provider: 'api', endpoint: '/v1/routes/matrix' }, fakeFetch);
  const routes = await service.matrix({ lat: 40.8, lon: -74.2 }, [{ id: 'hospital', coordinates: { lat: 40.7, lon: -74.3 } }]);
  assert.equal(routes.get('hospital').trafficAware, true);
  assert.equal(routes.get('hospital').provider, 'Google Routes');
});
