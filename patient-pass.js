export const PATIENT_PASS_KEY = 'nearsignal-patient-held-pass-v1';
export const PATIENT_PASS_LIFETIME_MS = 24 * 60 * 60 * 1000;

const allowed = {
  patient: new Set(['adult', 'child']),
  category: new Set(['illness', 'breathing', 'injury', 'wound', 'stomach', 'mental', 'other']),
  severity: new Set(['mild', 'moderate', 'severe', 'unsure']),
  warning: new Set(['no', 'unsure', 'yes'])
};

function cleanText(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

export function createPatientPass(input, now = Date.now()) {
  return {
    version: 1,
    code: cleanText(input.code, 16),
    language: cleanText(input.language, 5) || 'en',
    patient: allowed.patient.has(input.patient) ? input.patient : 'adult',
    category: allowed.category.has(input.category) ? input.category : 'other',
    severity: allowed.severity.has(input.severity) ? input.severity : 'unsure',
    warning: allowed.warning.has(input.warning) ? input.warning : 'unsure',
    concern: cleanText(input.concern, 1200),
    started: cleanText(input.started, 600),
    medications: cleanText(input.medications, 1000),
    createdAt: now,
    expiresAt: now + PATIENT_PASS_LIFETIME_MS
  };
}

export function isValidPatientPass(pass, now = Date.now()) {
  return Boolean(pass && pass.version === 1 && pass.code && pass.concern &&
    Number.isFinite(pass.createdAt) && Number.isFinite(pass.expiresAt) &&
    pass.expiresAt > now && pass.expiresAt > pass.createdAt);
}

export function savePatientPass(storage, input, now = Date.now()) {
  const pass = createPatientPass(input, now);
  storage.setItem(PATIENT_PASS_KEY, JSON.stringify(pass));
  return pass;
}

export function loadPatientPass(storage, now = Date.now()) {
  try {
    const raw = storage.getItem(PATIENT_PASS_KEY);
    if (!raw) return null;
    const pass = JSON.parse(raw);
    if (!isValidPatientPass(pass, now)) {
      storage.removeItem(PATIENT_PASS_KEY);
      return null;
    }
    return pass;
  } catch {
    storage.removeItem(PATIENT_PASS_KEY);
    return null;
  }
}

export function deletePatientPass(storage) {
  storage.removeItem(PATIENT_PASS_KEY);
}
