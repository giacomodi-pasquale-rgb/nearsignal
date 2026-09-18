import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseCsv } from './csv.mjs';

export function importHrsaRows(rows) {
  const seen = new Set();
  return rows
    .filter(isActiveServiceSite)
    .map(toCandidate)
    .filter((candidate) => {
      if (!candidate.location.address1 || !candidate.location.city || !candidate.location.state || !candidate.location.postalCode) return false;
      if (!Number.isFinite(candidate.location.latitude) || !Number.isFinite(candidate.location.longitude)) return false;
      if (seen.has(candidate.hrsaSiteId)) return false;
      seen.add(candidate.hrsaSiteId);
      return true;
    });
}

export function summarizeHrsa(candidates) {
  const states = [...new Set(candidates.map((item) => item.location.state))].sort().map((state) => ({
    state,
    total: candidates.filter((item) => item.location.state === state).length
  }));
  return {
    total: candidates.length,
    jurisdictions: states.length,
    fqhcSites: candidates.filter((item) => item.identity.healthCenterType.includes('Federally Qualified')).length,
    lookAlikeSites: candidates.filter((item) => item.identity.healthCenterType.toLowerCase().includes('look-alike')).length,
    evidenceEnriched: candidates.filter((item) => item.contact.phone && item.contact.website && item.operations.reportedHoursPerWeek !== null).length,
    publishable: 0,
    states
  };
}

function isActiveServiceSite(row) {
  return value(row, 'Site Status Description').toLowerCase() === 'active'
    && value(row, 'Health Center Type Description').toLowerCase().includes('service delivery site');
}

function toCandidate(row) {
  const siteId = value(row, 'BPHC Assigned Number') || value(row, 'Health Center Number');
  const longitude = number(value(row, 'Geocoding Artifact Address Primary X Coordinate'));
  const latitude = number(value(row, 'Geocoding Artifact Address Primary Y Coordinate'));
  const reportedHours = number(value(row, 'Operating Hours per Week'));
  return {
    candidateId: `hrsa-${slug(siteId)}`,
    hrsaSiteId: siteId,
    healthCenterNumber: value(row, 'Health Center Number'),
    evidenceTier: 'officially-identified',
    status: 'pending-service-verification',
    identity: {
      name: value(row, 'Site Name'),
      healthCenterName: value(row, 'Health Center Name'),
      healthCenterType: value(row, 'Health Center Type'),
      locationType: value(row, 'Health Center Location Type Description'),
      locationSetting: value(row, 'Health Center Service Delivery Site Location Setting Description')
    },
    location: {
      address1: value(row, 'Site Address'),
      city: value(row, 'Site City'),
      state: value(row, 'Site State Abbreviation'),
      postalCode: value(row, 'Site Postal Code'),
      county: value(row, 'Complete County Name'),
      latitude,
      longitude
    },
    contact: {
      phone: digits(value(row, 'Site Telephone Number')),
      website: normalizeWebsite(value(row, 'Site Web Address'))
    },
    operations: {
      reportedHoursPerWeek: reportedHours,
      scheduleDescription: value(row, 'Health Center Operational Schedule Description'),
      calendarDescription: value(row, 'Health Center Operating Calendar')
    },
    accessEvidence: {
      program: value(row, 'Health Center Type'),
      sourceScope: 'HRSA program and site identity only',
      caution: 'HRSA status does not establish service-specific availability, exact fees, pediatric capability, daily schedule, language support, or same-day access.'
    },
    source: {
      publisher: 'Health Resources and Services Administration',
      dataset: 'Health Center Service Delivery and Look-Alike Sites',
      url: 'https://data.hrsa.gov/topics/health-centers/',
      recordCreatedAt: value(row, 'Data Warehouse Record Create Date')
    },
    publishable: false
  };
}

function value(row, key) { return String(row[key] || '').trim(); }
function digits(input) { return input.replace(/\D/g, ''); }
function number(input) { const parsed = Number(input); return Number.isFinite(parsed) && input !== '' ? parsed : null; }
function slug(input) { return String(input).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function normalizeWebsite(input) {
  if (!input) return null;
  try { return new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`).href; } catch { return null; }
}

async function main() {
  const [inputPath, outputPath = 'data/review/us-health-centers.json'] = process.argv.slice(2);
  if (!inputPath) {
    console.error('Usage: node scripts/import-hrsa-health-centers.mjs <HRSA.csv> [output.json]');
    process.exitCode = 2;
    return;
  }
  const candidates = importHrsaRows(parseCsv(await readFile(inputPath, 'utf8')));
  const summary = summarizeHrsa(candidates);
  const output = {
    generatedAt: new Date().toISOString(),
    source: {
      publisher: 'Health Resources and Services Administration',
      dataset: 'Health Center Service Delivery and Look-Alike Sites',
      url: 'https://data.hrsa.gov/topics/health-centers/',
      refreshCycle: 'daily',
      usageLimitations: 'none'
    },
    warning: 'Official candidate records only. HRSA site status does not establish exact services, fees, pediatric capability, daily hours, language support, or same-day availability. Candidates remain excluded from patient results until NearSignal service verification is complete.',
    summary,
    candidates
  };
  await mkdir(dirname(outputPath), { recursive: true });
  // This national operational artifact is intentionally compact; it is not loaded by the patient website.
  await writeFile(outputPath, `${JSON.stringify(output)}\n`);
  console.log(`Created ${summary.total} active HRSA service-site candidates across ${summary.jurisdictions} jurisdictions in ${outputPath}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
