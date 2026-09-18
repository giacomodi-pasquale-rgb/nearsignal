import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { readDataset } from './data-lib.mjs';

const [hospitalPath = 'data/review/us-hospitals.json', healthCenterPath = 'data/review/us-health-centers.json', jsonOutput = 'data/review/evidence-network.json', jsOutput = 'data/review/evidence-network.js'] = process.argv.slice(2);
const [hospitals, healthCenters, canonical] = await Promise.all([
  readFile(hospitalPath, 'utf8').then(JSON.parse),
  readFile(healthCenterPath, 'utf8').then(JSON.parse),
  readDataset()
]);

const jurisdictions = new Set([
  ...hospitals.summary.states.map((item) => item.state),
  ...healthCenters.summary.states.map((item) => item.state)
]);
const evidenceRecords = canonical.facilities.reduce((sum, facility) => sum + facility.evidence.length, 0);
const reviewDueSoon = canonical.facilities.filter((facility) => {
  const days = (new Date(`${facility.verification.reviewBy}T23:59:59Z`) - new Date()) / 86400000;
  return days >= 0 && days <= 30;
}).length;
const output = {
  generatedAt: new Date().toISOString(),
  datasetVersion: canonical.datasetVersion,
  tiers: {
    officiallyIndexed: {
      total: hospitals.summary.total + healthCenters.summary.total,
      hospitalCandidates: hospitals.summary.total,
      affordableHealthCenterCandidates: healthCenters.summary.total,
      jurisdictions: jurisdictions.size,
      label: 'Official records indexed',
      patientVisible: false
    },
    evidenceEnriched: {
      total: healthCenters.summary.evidenceEnriched + hospitals.summary.matchedVerified,
      definition: 'Official candidate records containing location, contact and additional operating or verification evidence. This tier is still not automatically safe for patient recommendations.',
      patientVisible: false
    },
    decisionReady: {
      total: canonical.facilities.length,
      evidenceRecords,
      reviewDueSoon,
      definition: 'NearSignal records that passed release-blocking identity, location, care-setting, patient-group, capability, contact and source checks.',
      patientVisible: true
    }
  },
  sources: [hospitals.source, healthCenters.source],
  warning: 'Indexed and evidence-enriched records are operational candidates, not patient recommendations. Only decision-ready records appear in the care-navigation flow.'
};
await mkdir(dirname(jsonOutput), { recursive: true });
await writeFile(jsonOutput, `${JSON.stringify(output, null, 2)}\n`);
await writeFile(jsOutput, `// Generated evidence-network summary. Do not edit by hand.\nwindow.CARE_ROUTE_EVIDENCE_NETWORK = ${JSON.stringify(output)};\n`);
console.log(`Evidence network: ${output.tiers.officiallyIndexed.total} official records, ${output.tiers.evidenceEnriched.total} enriched candidates, ${output.tiers.decisionReady.total} decision-ready locations.`);
