import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';

const EXPECTED_JURISDICTIONS = new Set([
  'AL','AK','AS','AZ','AR','CA','CO','CT','DE','DC','FL','GA','GU','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','FM','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','MP','OH','OK','OR','PA','PR','RI','SC','SD','TN','TX','UT','VT','VI','VA','WA','WV','WI','WY','MH','PW'
]);

async function loadZipRecords() {
  const directory = new URL('../data/zip/', import.meta.url);
  const files = (await readdir(directory)).filter(file => /^\d\.json$/.test(file)).sort();
  const records = [];
  for (const file of files) {
    const shard = JSON.parse(await readFile(new URL(file, directory), 'utf8'));
    for (const [zip, [place, region, lat, lon]] of Object.entries(shard)) {
      records.push({ zip, place, region, lat, lon });
    }
  }
  return { files, records };
}

test('bundled ZIP lookup covers every supported U.S. jurisdiction', async () => {
  const { files, records } = await loadZipRecords();
  assert.deepEqual(files, ['0.json','1.json','2.json','3.json','4.json','5.json','6.json','7.json','8.json','9.json']);
  assert.equal(records.length, 41_202);
  assert.deepEqual(new Set(records.map(record => record.region)), EXPECTED_JURISDICTIONS);
});

test('every bundled ZIP has a valid key, place, jurisdiction, and coordinates', async () => {
  const { records } = await loadZipRecords();
  for (const record of records) {
    assert.match(record.zip, /^\d{5}$/, `Invalid ZIP key: ${record.zip}`);
    assert.ok(record.place, `Missing place for ${record.zip}`);
    assert.ok(EXPECTED_JURISDICTIONS.has(record.region), `Unsupported jurisdiction for ${record.zip}`);
    assert.ok(Number.isFinite(Number(record.lat)) && Number(record.lat) >= -90 && Number(record.lat) <= 90, `Invalid latitude for ${record.zip}`);
    assert.ok(Number.isFinite(Number(record.lon)) && Number(record.lon) >= -180 && Number(record.lon) <= 180, `Invalid longitude for ${record.zip}`);
  }
});
