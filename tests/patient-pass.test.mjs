import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PATIENT_PASS_LIFETIME_MS,
  createPatientPass,
  savePatientPass,
  loadPatientPass,
  deletePatientPass
} from '../patient-pass.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  };
}

const input = {
  code: 'NS-ABC123', language: 'es', patient: 'child', category: 'illness',
  severity: 'moderate', warning: 'no', concern: 'Fiebre y tos',
  started: 'Anoche', medications: 'Alergia a penicilina'
};

test('creates a privacy-limited pass that expires after 24 hours', () => {
  const pass = createPatientPass(input, 1000);
  assert.equal(pass.expiresAt, 1000 + PATIENT_PASS_LIFETIME_MS);
  assert.equal(pass.concern, input.concern);
  assert.equal(pass.patient, 'child');
});

test('saves and restores a valid patient-held pass', () => {
  const storage = memoryStorage();
  savePatientPass(storage, input, 1000);
  assert.equal(loadPatientPass(storage, 2000).code, input.code);
});

test('expired pass is removed and cannot be restored', () => {
  const storage = memoryStorage();
  savePatientPass(storage, input, 1000);
  assert.equal(loadPatientPass(storage, 1000 + PATIENT_PASS_LIFETIME_MS + 1), null);
});

test('patient can permanently delete the pass', () => {
  const storage = memoryStorage();
  savePatientPass(storage, input, 1000);
  deletePatientPass(storage);
  assert.equal(loadPatientPass(storage, 2000), null);
});
