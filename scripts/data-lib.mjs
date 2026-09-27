import { readFile } from 'node:fs/promises';
import { DATASET_VERSION, expandUrgentCareLocations } from '../data/v1/urgent-care-expansion.mjs';

export const CAPABILITIES = new Set(['illness', 'breathing', 'injury', 'wound', 'stomach', 'other']);
export const FACILITY_TYPES = new Set(['emergency', 'urgent-care', 'community-health-center']);
export const HOUR_KINDS = new Set(['always', 'weekly', 'live', 'unknown']);
export const VERIFIED_STATUSES = new Set(['verified', 'verified-with-unknowns']);

export async function readDataset(path = new URL('../data/v1/facilities.json', import.meta.url)) {
  const dataset = JSON.parse(await readFile(path, 'utf8'));
  const isCanonicalDataset = new URL(path, import.meta.url).pathname.endsWith('/data/v1/facilities.json');
  if (!isCanonicalDataset) return dataset;
  return {
    ...dataset,
    datasetVersion: DATASET_VERSION,
    reviewedAt: '2026-09-27',
    facilities: [...dataset.facilities, ...expandUrgentCareLocations()]
  };
}

export function validateDataset(dataset, today = new Date()) {
  const errors = [];
  if (dataset.schemaVersion !== '1.0.0') errors.push('schemaVersion must be 1.0.0');
  if (!Array.isArray(dataset.facilities) || dataset.facilities.length === 0) errors.push('facilities must be a non-empty array');
  const ids = new Set();
  for (const facility of dataset.facilities || []) validateFacility(facility, ids, errors, today);
  return errors;
}

function validateFacility(facility, ids, errors, today) {
  const prefix = facility?.id || '<missing-id>';
  const fail = (message) => errors.push(`${prefix}: ${message}`);
  if (!/^[a-z0-9-]+$/.test(facility?.id || '')) fail('id must be a lowercase slug');
  if (ids.has(facility?.id)) fail('id must be unique');
  ids.add(facility?.id);
  if (!FACILITY_TYPES.has(facility?.identity?.type)) fail('unsupported facility type');
  if (!facility?.identity?.name) fail('identity.name is required');
  const patientGroups = facility?.identity?.patientGroups || ['pediatric'];
  if (!patientGroups.length || patientGroups.some((group) => !['adult', 'pediatric'].includes(group))) fail('identity.patientGroups must contain adult and/or pediatric');
  if (!Number.isFinite(facility?.location?.latitude) || Math.abs(facility.location.latitude) > 90) fail('valid latitude is required');
  if (!Number.isFinite(facility?.location?.longitude) || Math.abs(facility.location.longitude) > 180) fail('valid longitude is required');
  if (!/^\d{10}$/.test(facility?.contact?.phone || '')) fail('phone must contain ten digits');
  if (!isHttps(facility?.contact?.website)) fail('an HTTPS provider website is required');
  if (!Array.isArray(facility?.capabilities) || facility.capabilities.some((item) => !CAPABILITIES.has(item))) fail('capabilities contain an unsupported value');
  if (!HOUR_KINDS.has(facility?.hours?.kind)) fail('unsupported hours kind');
  if (facility?.identity?.type === 'emergency' && facility?.hours?.kind !== 'always') fail('pilot emergency departments must have verified 24-hour availability');
  if (facility?.identity?.type === 'emergency' && !facility?.identity?.pediatricSpecific && !patientGroups.includes('adult')) fail('general emergency departments must be verified for adult care');
  if (facility?.live?.waitMinutes !== null) fail('waitMinutes must remain null without an approved live feed');
  if (facility?.insurance?.status !== 'verify' || facility.insurance.plans?.length) fail('insurance must remain verify-only without an approved eligibility feed');
  if (facility?.quality?.displayScore !== null) fail('displayScore must remain null until a comparable pediatric measure is approved');
  if (!VERIFIED_STATUSES.has(facility?.verification?.status)) fail('facility must be verified or verified-with-unknowns');
  if (!Array.isArray(facility?.evidence) || facility.evidence.length === 0) fail('at least one evidence record is required');
  const supported = new Set((facility?.evidence || []).flatMap((item) => item.supports || []));
  for (const required of ['identity', 'location', 'contact', 'capabilities', 'highlights']) if (!supported.has(required)) fail(`evidence must support ${required}`);
  for (const item of facility?.evidence || []) {
    if (!isHttps(item.url) || !item.publisher || !/^\d{4}-\d{2}-\d{2}$/.test(item.checkedAt || '')) fail(`invalid evidence record ${item.id || '<missing-id>'}`);
  }
  const reviewBy = new Date(`${facility?.verification?.reviewBy}T23:59:59Z`);
  if (!Number.isFinite(reviewBy.valueOf())) fail('verification.reviewBy must be a date');
  if (reviewBy < today) fail('verification is stale and must not ship');
  const age = facility?.pediatricAge;
  if (age?.limitsVerified && (!Number.isFinite(age.minimumMonths) || !Number.isFinite(age.maximumMonths) || age.maximumMonths < age.minimumMonths)) fail('verified age limits must be numeric and ordered');
  if (!age?.limitsVerified && (age?.minimumMonths !== null || age?.maximumMonths !== null)) fail('unverified age limits must be explicit nulls');
}

function isHttps(value) {
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}

export function toWebFacility(facility) {
  const ageKnown = facility.pediatricAge.limitsVerified;
  return {
    id: facility.id,
    name: facility.identity.name,
    city: facility.location.city,
    state: facility.location.state,
    type: facility.identity.type,
    typeLabel: facility.identity.typeLabel,
    pediatricSpecific: facility.identity.pediatricSpecific,
    patientGroups: facility.identity.patientGroups || ['pediatric'],
    address: `${facility.location.address1}, ${facility.location.city}, ${facility.location.state} ${facility.location.postalCode}`,
    coordinates: { lat: facility.location.latitude, lon: facility.location.longitude },
    phone: facility.contact.phone.replace(/^(\d{3})(\d{3})(\d{4})$/, '($1) $2-$3'),
    age: { minMonths: ageKnown ? facility.pediatricAge.minimumMonths : null, maxMonths: ageKnown ? facility.pediatricAge.maximumMonths : null, verifiedLimits: ageKnown },
    capabilities: facility.capabilities,
    hours: { kind: facility.hours.kind, label: facility.hours.label, days: facility.hours.weekly },
    highlights: facility.highlights,
    sourceUrl: facility.contact.website,
    quality: { note: facility.quality.note, url: facility.quality.sourceUrl },
    access: facility.access || {
      uninsuredWelcome: false,
      slidingFee: false,
      noOneTurnedAway: false,
      charityCare: facility.identity.type === 'emergency' && facility.location.state === 'NJ',
      flatFee: null,
      languages: [],
      note: null,
      sourceUrl: null
    },
    verification: facility.verification
  };
}
