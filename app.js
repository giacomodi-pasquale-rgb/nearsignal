import { RoutingService, presentRoute } from './routing.js?v=2';
import { currentLanguage, format, initLanguage, t } from './i18n.js?v=20';
import { translateBriefTextToEnglish } from './brief-translation.js?v=3';
import { accessEvidence, createArrivalCode, outcomeCount, saveOutcome } from './access-insight.js?v=1';
import { buildDemoConfirmation, nextAlternative } from './verified-arrival.js?v=1';
import { savePatientPass, loadPatientPass, deletePatientPass } from './patient-pass.js?v=1';
import { analyzeAccess, XRAY_REASON_ORDER } from './access-xray.js?v=1';
import { discoverySource, loadDiscoveryState, rankDiscoveryRecords } from './national-discovery.js?v=1';
import { lookupZip } from './zip-lookup.js?v=1';

const facilities = window.CARE_ROUTE_FACILITIES;
const commonspiritBatch = window.NEARSIGNAL_PROVIDER_ENRICHMENT;
const routingService = new RoutingService(window.CARE_ROUTE_CONFIG?.routing);
const state = { step: 1, location: null, locationSource: null, locationZip: null, routes: new Map(), showAllResults: false, discoveryLimit: 12, demoScenario: false, lastEligible: [], verifiedFacilityId: null };
const MAX_SEARCH_MILES = 100;
const NATIONAL_PLACES=[['AL','Alabama'],['AK','Alaska'],['AS','American Samoa'],['AZ','Arizona'],['AR','Arkansas'],['CA','California'],['CO','Colorado'],['CT','Connecticut'],['DE','Delaware'],['DC','District of Columbia'],['FL','Florida'],['GA','Georgia'],['GU','Guam'],['HI','Hawaii'],['ID','Idaho'],['IL','Illinois'],['IN','Indiana'],['IA','Iowa'],['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],['ME','Maine'],['MD','Maryland'],['MA','Massachusetts'],['MI','Michigan'],['FM','Micronesia'],['MN','Minnesota'],['MS','Mississippi'],['MO','Missouri'],['MT','Montana'],['NE','Nebraska'],['NV','Nevada'],['NH','New Hampshire'],['NJ','New Jersey'],['NM','New Mexico'],['NY','New York'],['NC','North Carolina'],['ND','North Dakota'],['MP','Northern Mariana Islands'],['OH','Ohio'],['OK','Oklahoma'],['OR','Oregon'],['PA','Pennsylvania'],['PR','Puerto Rico'],['RI','Rhode Island'],['SC','South Carolina'],['SD','South Dakota'],['TN','Tennessee'],['TX','Texas'],['UT','Utah'],['VT','Vermont'],['VI','U.S. Virgin Islands'],['VA','Virginia'],['WA','Washington'],['WV','West Virginia'],['WI','Wisconsin'],['WY','Wyoming'],['MH','Marshall Islands'],['PW','Palau']];
const NATIONAL_CODES=new Set(NATIONAL_PLACES.map(([code])=>code));
const NATIONAL_NAMES=new Map(NATIONAL_PLACES);
let installPrompt = null;
const steps = [...document.querySelectorAll('.step')];
const titleKeys = ['step1', 'step2', 'step3', 'step4'];

initLanguage();
document.getElementById('stateSelect').innerHTML=`<option value="">${t('allStates')}</option>${NATIONAL_PLACES.map(([code,name])=>`<option value="${code}">${name}</option>`).join('')}`;
document.getElementById('facilityCount').textContent = facilities.length;
const evidenceNetwork = window.CARE_ROUTE_EVIDENCE_NETWORK;
if (evidenceNetwork) {
  const number = new Intl.NumberFormat().format;
  document.getElementById('networkOfficial').textContent = number(evidenceNetwork.tiers.officiallyIndexed.total);
  document.getElementById('networkOfficialHero').textContent = number(evidenceNetwork.tiers.officiallyIndexed.total);
  document.getElementById('networkHospitals').textContent = number(evidenceNetwork.tiers.officiallyIndexed.hospitalCandidates);
  document.getElementById('networkHealthCenters').textContent = number(evidenceNetwork.tiers.officiallyIndexed.affordableHealthCenterCandidates);
  document.getElementById('networkReady').textContent = number(evidenceNetwork.tiers.decisionReady.total);
}

if ('serviceWorker' in navigator) window.addEventListener('load', () => {
  navigator.serviceWorker.register('./service-worker.js').catch((error) => console.warn('Offline support unavailable', error));
});
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installPrompt = event;
  document.getElementById('installApp').hidden = false;
});
document.getElementById('installApp').addEventListener('click', async () => {
  if (!installPrompt) return;
  await installPrompt.prompt();
  installPrompt = null;
  document.getElementById('installApp').hidden = true;
});

function showStep(number) {
  state.step = number;
  steps.forEach((item) => item.classList.toggle('active', Number(item.dataset.step) === number));
  document.getElementById('form-title').textContent = t(titleKeys[number - 1]);
  document.getElementById('stepLabel').textContent = format('stepLabel', { n: number });
  document.getElementById('progressBar').style.width = `${number * 25}%`;
}

document.querySelectorAll('.next').forEach((button) => button.addEventListener('click', async () => {
  if (state.step === 1) {
    const zip = document.getElementById('zipCode').value.trim();
    if (zip && state.locationZip !== zip && !(await applyZip())) return;
  }
  if (state.step === 1 && document.querySelector('[name=patientGroup]:checked').value === 'pediatric' && !document.getElementById('ageValue').reportValidity()) return;
  showStep(state.step + 1);
}));
document.querySelectorAll('[name=patientGroup]').forEach((input) => input.addEventListener('change', () => {
  document.getElementById('childAge').hidden = input.value !== 'pediatric';
}));
document.querySelectorAll('.back').forEach((button) => button.addEventListener('click', () => showStep(state.step - 1)));
document.addEventListener('nearsignal:language', async () => {
  document.getElementById('stateSelect').options[0].textContent=t('allStates');
  showStep(state.step);
  if (!document.getElementById('results').hidden) await renderResults();
});
showStep(state.step);

function clearLocation() {
  state.location = null;
  state.locationSource = null;
  state.locationZip = null;
  state.routes.clear();
  document.getElementById('locationStatus').textContent = t('locationOptional');
  document.getElementById('locationStatus').classList.remove('success');
}

document.getElementById('stateSelect').addEventListener('change', () => {
  clearLocation();
  document.getElementById('zipCode').value = '';
  document.getElementById('zipStatus').textContent = '';
  document.getElementById('zipStatus').classList.remove('success');
});

async function applyZip() {
  state.demoScenario = false;
  const input = document.getElementById('zipCode');
  const button = document.getElementById('useZip');
  const status = document.getElementById('zipStatus');
  const zip = input.value.trim();
  status.classList.remove('success');
  if (!/^\d{5}$/.test(zip)) {
    status.textContent = t('zipInvalid');
    input.focus();
    return false;
  }
  clearLocation();
  document.getElementById('stateSelect').value = '';
  button.disabled = true;
  status.textContent = t('zipFinding');
  try {
    const { place, region, lat, lon } = await lookupZip(zip);
    if (!NATIONAL_CODES.has(region) || !Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error('zip-outside');
    document.getElementById('stateSelect').value = region;
    state.location = { lat, lon };
    state.locationSource = 'zip';
    state.locationZip = zip;
    status.textContent = format('zipReady', { zip, place: `${place}, ${NATIONAL_NAMES.get(region) || region}` });
    status.classList.add('success');
    return true;
  } catch (error) {
    clearLocation();
    document.getElementById('stateSelect').value = '';
    status.textContent = error.message === 'zip-outside' ? t('zipOutside') : t('zipUnavailable');
    return false;
  } finally {
    button.disabled = false;
  }
}

document.getElementById('useZip').addEventListener('click', applyZip);
document.getElementById('zipCode').addEventListener('keydown', (event) => {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  applyZip();
});
document.getElementById('zipCode').addEventListener('input', (event) => {
  if (!state.locationZip || event.currentTarget.value.trim() === state.locationZip) return;
  clearLocation();
  document.getElementById('stateSelect').value = '';
  document.getElementById('zipStatus').textContent = '';
  document.getElementById('zipStatus').classList.remove('success');
});

document.getElementById('locateMe').addEventListener('click', () => {
  state.demoScenario = false;
  const status = document.getElementById('locationStatus');
  const locateButton = document.getElementById('locateMe');
  const submitButton = document.getElementById('showCareOptions');
  if (!navigator.geolocation) {
    status.textContent = t('locationUnsupported');
    return;
  }
  locateButton.disabled = true;
  status.textContent = t('findingLocation');
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      state.location = { lat: coords.latitude, lon: coords.longitude };
      state.locationSource = 'geolocation';
      status.textContent = t('locationReady');
      status.classList.add('success');
      locateButton.disabled = false;
      showCareOptions(submitButton);
    },
    (error) => {
      locateButton.disabled = false;
      status.classList.remove('success');
      status.textContent = error.code === error.PERMISSION_DENIED
        ? t('locationBlocked')
        : error.code === error.TIMEOUT
          ? t('locationTimeout')
          : t('locationUnavailable');
    },
    { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
  );
});

document.getElementById('showCareOptions').addEventListener('click', (event) => {
  state.demoScenario = false;
  showCareOptions(event.currentTarget);
});
document.getElementById('careForm').addEventListener('submit', (event) => event.preventDefault());
document.getElementById('tryDemo').addEventListener('click', () => {
  document.querySelector('[name=patientGroup][value=pediatric]').checked = true;
  document.getElementById('childAge').hidden = false;
  document.getElementById('ageValue').value = '5';
  document.getElementById('ageUnit').value = 'years';
  document.getElementById('stateSelect').value = 'NJ';
  document.querySelector('[name=need][value=illness]').checked = true;
  document.querySelector('[name=emergency][value=no]').checked = true;
  document.querySelectorAll('[name=accessNeed]').forEach((input) => { input.checked = ['uninsured', 'low-cost'].includes(input.value); });
  state.location = { lat: 40.7357, lon: -74.1724 };
  state.locationSource = 'demo';
  state.locationZip = '07102';
  state.demoScenario = true;
  showCareOptions(document.getElementById('showCareOptions'));
});

async function showCareOptions(button) {
  state.showAllResults = false;
  state.discoveryLimit = 12;
  button.disabled = true;
  button.textContent = state.location ? t('calculatingRoutes') : t('loadingOptions');
  document.getElementById('questionnaire').hidden = true;
  document.getElementById('results').hidden = false;
  document.getElementById('resultsTitle').textContent = t('findingOptions');
  document.getElementById('routingNote').textContent = state.location ? t('calculatingNearby') : t('loadingFacilities');
  document.getElementById('cards').innerHTML = `<div class="empty"><p>${t('findingOptions')}</p></div>`;
  document.getElementById('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
  try {
    await renderResults();
  } catch (error) {
    console.error('Unable to render care options', error);
    document.getElementById('resultsTitle').textContent = t('loadErrorTitle');
    document.getElementById('routingNote').textContent = t('loadErrorNote');
    document.getElementById('cards').innerHTML = `<div class="empty"><p>${t('loadErrorBody')}</p></div>`;
  } finally {
    button.disabled = false;
    button.textContent = t('seeOptions');
  }
}

document.getElementById('startOver').addEventListener('click', () => {
  state.showAllResults = false;
  state.demoScenario = false;
  document.getElementById('careForm').reset();
  document.getElementById('childAge').hidden = true;
  clearLocation();
  document.getElementById('zipCode').value = '';
  document.getElementById('zipStatus').textContent = '';
  document.getElementById('zipStatus').classList.remove('success');
  document.getElementById('results').hidden = true;
  document.getElementById('questionnaire').hidden = false;
  document.getElementById('briefAppliedNotice').hidden = true;
  showStep(1);
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

const billDialog = document.getElementById('billProtection');
const billIntake = document.getElementById('billIntake');
const billPlanResult = document.getElementById('billPlanResult');
const BILL_STATES = [
  ['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],['CA','California'],['CO','Colorado'],['CT','Connecticut'],['DE','Delaware'],['DC','District of Columbia'],['FL','Florida'],['GA','Georgia'],['HI','Hawaii'],['ID','Idaho'],['IL','Illinois'],['IN','Indiana'],['IA','Iowa'],['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],['ME','Maine'],['MD','Maryland'],['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],['MS','Mississippi'],['MO','Missouri'],['MT','Montana'],['NE','Nebraska'],['NV','Nevada'],['NH','New Hampshire'],['NJ','New Jersey'],['NM','New Mexico'],['NY','New York'],['NC','North Carolina'],['ND','North Dakota'],['OH','Ohio'],['OK','Oklahoma'],['OR','Oregon'],['PA','Pennsylvania'],['RI','Rhode Island'],['SC','South Carolina'],['SD','South Dakota'],['TN','Tennessee'],['TX','Texas'],['UT','Utah'],['VT','Vermont'],['VA','Virginia'],['WA','Washington'],['WV','West Virginia'],['WI','Wisconsin'],['WY','Wyoming']
];
const billStateSelect = document.getElementById('billState');
billStateSelect.innerHTML = BILL_STATES.map(([code, name]) => `<option value="${code}"${code === 'NJ' ? ' selected' : ''}>${name}</option>`).join('');

function openBillProtection() {
  billIntake.hidden = false;
  billPlanResult.hidden = true;
  if (typeof billDialog.showModal === 'function') {
    try {
      billDialog.showModal();
      return;
    } catch (error) {
      console.warn('Native dialog unavailable; using compatible fallback.', error);
    }
  }
  billDialog.setAttribute('open', '');
  billDialog.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.getElementById('openBillHelp').addEventListener('click', openBillProtection);
document.getElementById('openBillHelpHero').addEventListener('click', openBillProtection);
document.getElementById('buildBillPlan').addEventListener('click', () => {
  const situation = document.querySelector('[name=billSituation]:checked').value;
  const plan = document.querySelector('[name=billPlan]:checked').value;
  const careState = document.getElementById('billState').value;
  const careStateName = BILL_STATES.find(([code]) => code === careState)?.[1] || careState;
  const signalKeys = {
    directory: 'billSignalDirectory',
    facility: 'billSignalFacility',
    emergency: 'billSignalEmergency',
    other: 'billSignalOther'
  };
  document.getElementById('billProtectionSignal').innerHTML = `<strong>${t('billSignalLabel')}</strong><span>${t(signalKeys[situation])}</span>`;
  const stateHelp = document.getElementById('stateBillHelp');
  const isNewJersey = careState === 'NJ';
  stateHelp.href = isNewJersey
    ? 'https://www.nj.gov/dobi/division_consumers/insurance/outofnetwork.html'
    : 'https://content.naic.org/state-insurance-departments';
  stateHelp.textContent = isNewJersey ? t('njBillRights') : format('stateInsuranceHelp', { state: careStateName });
  document.getElementById('stateResourceNote').textContent = isNewJersey
    ? t('njProtectionNote')
    : format('stateProtectionNote', { state: careStateName });
  document.getElementById('dolBillHelp').hidden = plan !== 'employer';
  billIntake.hidden = true;
  billPlanResult.hidden = false;
  billPlanResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
document.getElementById('restartBillPlan').addEventListener('click', () => {
  billPlanResult.hidden = true;
  billIntake.hidden = false;
  billDialog.scrollTo({ top: 0, behavior: 'smooth' });
});
document.addEventListener('nearsignal:language', () => {
  if (!billPlanResult.hidden) document.getElementById('buildBillPlan').click();
});

const mentalDialog = document.getElementById('mentalSupport');
const mentalChoices = document.getElementById('mentalChoices');
const mentalResult = document.getElementById('mentalResult');
let selectedMentalRoute = null;

function openMentalSupport() {
  selectedMentalRoute = null;
  mentalChoices.hidden = false;
  mentalResult.hidden = true;
  if (typeof mentalDialog.showModal === 'function') {
    try {
      mentalDialog.showModal();
      return;
    } catch (error) {
      console.warn('Native dialog unavailable; using compatible fallback.', error);
    }
  }
  mentalDialog.setAttribute('open', '');
  mentalDialog.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showMentalRoute(route) {
  selectedMentalRoute = route;
  const routeKeys = {
    danger: ['mentalDangerResultTitle', 'mentalDangerResultBody'],
    crisis: ['mentalCrisisResultTitle', 'mentalCrisisResultBody'],
    urgent: ['mentalUrgentResultTitle', 'mentalUrgentResultBody']
  };
  const [titleKey, bodyKey] = routeKeys[route];
  document.getElementById('mentalRouteMessage').innerHTML = `<strong>${t(titleKey)}</strong><span>${t(bodyKey)}</span>`;
  document.getElementById('mental911').hidden = route !== 'danger';
  document.getElementById('mentalTreatment').hidden = route !== 'urgent';
  mentalChoices.hidden = true;
  mentalResult.hidden = false;
  mentalResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.getElementById('openMentalHelp').addEventListener('click', openMentalSupport);
document.getElementById('openMentalHelpHero').addEventListener('click', openMentalSupport);
document.querySelectorAll('[data-mental-route]').forEach((button) => button.addEventListener('click', () => showMentalRoute(button.dataset.mentalRoute)));
document.getElementById('restartMentalRoute').addEventListener('click', () => {
  selectedMentalRoute = null;
  mentalResult.hidden = true;
  mentalChoices.hidden = false;
  mentalDialog.scrollTo({ top: 0, behavior: 'smooth' });
});
document.addEventListener('nearsignal:language', () => {
  if (selectedMentalRoute) showMentalRoute(selectedMentalRoute);
});

const arrivalDialog = document.getElementById('arrivalBrief');
const arrivalIntake = document.getElementById('arrivalIntake');
const arrivalResult = document.getElementById('arrivalResult');
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const speechLocales = { en: 'en-US', es: 'es-US', pt: 'pt-BR', ht: 'ht-HT' };
const arrivalCategoryKeys = { illness: 'categoryIllness', breathing: 'categoryBreathing', injury: 'categoryInjury', wound: 'categoryWound', stomach: 'categoryStomach', mental: 'categoryMental', other: 'categoryOther' };
const arrivalSeverityKeys = { mild: 'severityMild', moderate: 'severityModerate', severe: 'severitySevere', unsure: 'severityUnsure' };
const arrivalWarningKeys = { no: 'warningNo', unsure: 'warningUnsure', yes: 'warningYes' };
const englishArrivalValues = {
  patient: { adult: 'Adult', child: 'Child or teen' },
  category: { illness: 'Illness or fever', breathing: 'Breathing problem', injury: 'Injury', wound: 'Cut or wound', stomach: 'Stomach symptoms', mental: 'Mental or behavioral health', other: 'Other or unsure' },
  severity: { mild: 'Mild', moderate: 'Moderate', severe: 'Severe', unsure: 'Not sure' },
  warning: { no: 'No', unsure: 'Not sure', yes: 'Yes' }
};
let activeRecognition = null;
let currentArrivalCode = '';
let currentPatientPass = null;

function patientPassInput() {
  return {
    code: currentArrivalCode,
    language: currentLanguage(),
    patient: document.getElementById('arrivalPatient').value,
    category: document.getElementById('arrivalCategory').value,
    severity: document.getElementById('arrivalSeverity').value,
    warning: document.getElementById('arrivalWarning').value,
    concern: document.getElementById('arrivalConcern').value,
    started: document.getElementById('arrivalStarted').value,
    medications: document.getElementById('arrivalMedications').value
  };
}

function patientPassExpiry(pass) {
  return new Intl.DateTimeFormat(currentLanguage(), {
    dateStyle: 'medium', timeStyle: 'short'
  }).format(new Date(pass.expiresAt));
}

function updatePatientPassUI() {
  currentPatientPass = loadPatientPass(localStorage);
  const launcher = document.getElementById('savedPatientPass');
  const status = document.getElementById('patientPassStatus');
  launcher.hidden = !currentPatientPass;
  status.hidden = !currentPatientPass || currentPatientPass.code !== currentArrivalCode;
  if (!currentPatientPass) return;
  document.getElementById('savedPatientPassCode').textContent = currentPatientPass.code;
  document.getElementById('savedPatientPassExpiry').textContent = format('patientPassExpires', { time: patientPassExpiry(currentPatientPass) });
  document.getElementById('patientPassExpiry').textContent = format('patientPassExpires', { time: patientPassExpiry(currentPatientPass) });
}

function restorePatientPass(pass) {
  document.getElementById('arrivalPatient').value = pass.patient;
  document.getElementById('arrivalCategory').value = pass.category;
  document.getElementById('arrivalSeverity').value = pass.severity;
  document.getElementById('arrivalWarning').value = pass.warning;
  document.getElementById('arrivalConcern').value = pass.concern;
  document.getElementById('arrivalStarted').value = pass.started;
  document.getElementById('arrivalMedications').value = pass.medications;
  currentArrivalCode = pass.code;
  buildArrivalBrief();
}

function openArrivalBrief() {
  currentArrivalCode = '';
  setCheckinMode(false);
  arrivalIntake.hidden = false;
  arrivalResult.hidden = true;
  document.getElementById('arrivalActionStatus').textContent = '';
  if (typeof arrivalDialog.showModal === 'function') {
    try {
      arrivalDialog.showModal();
      return;
    } catch (error) {
      console.warn('Native dialog unavailable; using compatible fallback.', error);
    }
  }
  arrivalDialog.setAttribute('open', '');
  arrivalDialog.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function openSavedPatientPass() {
  const pass = loadPatientPass(localStorage);
  if (!pass) {
    updatePatientPassUI();
    return;
  }
  setCheckinMode(false);
  if (typeof arrivalDialog.showModal === 'function') {
    try { arrivalDialog.showModal(); } catch { arrivalDialog.setAttribute('open', ''); }
  } else arrivalDialog.setAttribute('open', '');
  restorePatientPass(pass);
}

function setCheckinMode(enabled) {
  arrivalDialog.classList.toggle('checkin-view', enabled);
  document.getElementById('checkinInstruction').hidden = !enabled;
  document.getElementById('exitCheckinMode').hidden = !enabled;
}

function closeArrivalBrief() {
  if (typeof arrivalDialog.close === 'function') arrivalDialog.close();
  else arrivalDialog.removeAttribute('open');
}

function buildArrivalBrief() {
  const concern = document.getElementById('arrivalConcern').value.trim();
  if (!concern) {
    document.getElementById('dictationStatus').textContent = t('arrivalConcernRequired');
    document.getElementById('arrivalConcern').focus();
    return;
  }
  const patientValue = document.getElementById('arrivalPatient').value;
  const categoryValue = document.getElementById('arrivalCategory').value;
  const severityValue = document.getElementById('arrivalSeverity').value;
  const warningValue = document.getElementById('arrivalWarning').value;
  if (!currentArrivalCode) currentArrivalCode = createArrivalCode();
  document.getElementById('arrivalCode').textContent = currentArrivalCode;
  const patient = patientValue === 'child' ? t('arrivalChild') : t('arrivalAdult');
  const started = document.getElementById('arrivalStarted').value.trim() || t('notProvided');
  const medications = document.getElementById('arrivalMedications').value.trim() || t('notProvided');
  document.getElementById('arrivalBriefText').innerHTML = [
    [t('briefPatient'), patient],
    [t('briefCategory'), t(arrivalCategoryKeys[categoryValue])],
    [t('briefSeverity'), t(arrivalSeverityKeys[severityValue])],
    [t('briefWarning'), t(arrivalWarningKeys[warningValue])],
    [t('briefConcern'), concern],
    [t('briefStarted'), started],
    [t('briefMedications'), medications]
  ].map(([label, value]) => `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`).join('');
  const language = currentLanguage();
  const originalConcern = concern || 'Not provided';
  const originalStarted = document.getElementById('arrivalStarted').value.trim() || 'Not provided';
  const originalMedications = document.getElementById('arrivalMedications').value.trim() || 'Not provided';
  const englishConcern = translateBriefTextToEnglish(originalConcern, language);
  const englishStarted = translateBriefTextToEnglish(originalStarted, language);
  const englishMedications = translateBriefTextToEnglish(originalMedications, language);
  const englishValue = (result, original) => language === 'en'
    ? result.text
    : result.translated ? `${result.text} (review with patient)` : `${original} (original ${language.toUpperCase()} words — interpreter review needed)`;
  document.getElementById('arrivalEnglishBrief').innerHTML = [
    ['Patient', englishArrivalValues.patient[patientValue]],
    ['Concern category', englishArrivalValues.category[categoryValue]],
    ['Patient-reported severity', englishArrivalValues.severity[severityValue]],
    ['Immediate warning signs reported', englishArrivalValues.warning[warningValue]],
    ['Main concern — draft English rendering', englishValue(englishConcern, originalConcern)],
    ['Onset/change — draft English rendering', englishValue(englishStarted, originalStarted)],
    ['Medicines/allergies/conditions — draft English rendering', englishValue(englishMedications, originalMedications)]
  ].map(([label, value]) => `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`).join('');
  const emergencyNotice = document.getElementById('arrivalEmergencyNotice');
  emergencyNotice.hidden = warningValue === 'no';
  emergencyNotice.classList.toggle('uncertain', warningValue === 'unsure');
  document.getElementById('dictationStatus').textContent = '';
  arrivalIntake.hidden = true;
  arrivalResult.hidden = false;
  updatePatientPassUI();
  arrivalResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.getElementById('openArrivalBrief').addEventListener('click', openArrivalBrief);
document.getElementById('openArrivalBriefHero').addEventListener('click', openArrivalBrief);
document.getElementById('buildArrivalBrief').addEventListener('click', buildArrivalBrief);
document.getElementById('savedPatientPass').addEventListener('click', openSavedPatientPass);
document.getElementById('savePatientPass').addEventListener('click', () => {
  const consent = document.getElementById('patientPassConsent');
  const status = document.getElementById('arrivalActionStatus');
  if (!consent.checked) {
    status.textContent = t('patientPassConsentRequired');
    consent.focus();
    return;
  }
  try {
    currentPatientPass = savePatientPass(localStorage, patientPassInput());
    updatePatientPassUI();
    status.textContent = t('patientPassSaved');
  } catch {
    status.textContent = t('patientPassSaveFailed');
  }
});
document.getElementById('deletePatientPass').addEventListener('click', () => {
  deletePatientPass(localStorage);
  currentPatientPass = null;
  document.getElementById('patientPassConsent').checked = false;
  updatePatientPassUI();
  document.getElementById('arrivalActionStatus').textContent = t('patientPassDeleted');
});
document.getElementById('editArrivalBrief').addEventListener('click', () => {
  setCheckinMode(false);
  arrivalResult.hidden = true;
  arrivalIntake.hidden = false;
  arrivalDialog.scrollTo({ top: 0, behavior: 'smooth' });
});
document.getElementById('showAtCheckIn').addEventListener('click', () => {
  setCheckinMode(true);
  arrivalDialog.scrollTo({ top: 0, behavior: 'smooth' });
});
document.getElementById('exitCheckinMode').addEventListener('click', () => {
  setCheckinMode(false);
  arrivalResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
document.getElementById('useBriefForSearch').addEventListener('click', () => {
  const patientValue = document.getElementById('arrivalPatient').value;
  const categoryValue = document.getElementById('arrivalCategory').value;
  const warningValue = document.getElementById('arrivalWarning').value;
  closeArrivalBrief();
  if (categoryValue === 'mental') {
    openMentalSupport();
    return;
  }
  const patientGroup = patientValue === 'child' ? 'pediatric' : 'adult';
  document.querySelector(`[name=patientGroup][value=${patientGroup}]`).checked = true;
  document.getElementById('childAge').hidden = patientGroup !== 'pediatric';
  document.querySelector(`[name=need][value=${categoryValue}]`).checked = true;
  document.querySelector(`[name=emergency][value=${warningValue === 'no' ? 'no' : 'yes'}]`).checked = true;
  state.demoScenario = false;
  document.getElementById('results').hidden = true;
  document.getElementById('questionnaire').hidden = false;
  document.getElementById('briefAppliedNotice').hidden = false;
  showStep(1);
  document.getElementById('questionnaire').scrollIntoView({ behavior: 'smooth', block: 'start' });
});
document.querySelectorAll('[data-dictate-target]').forEach((button) => button.addEventListener('click', () => {
  const status = document.getElementById('dictationStatus');
  if (!SpeechRecognition) {
    status.textContent = t('speechUnavailable');
    return;
  }
  if (activeRecognition) {
    activeRecognition.stop();
    return;
  }
  const target = document.getElementById(button.dataset.dictateTarget);
  const recognition = new SpeechRecognition();
  activeRecognition = recognition;
  recognition.lang = speechLocales[currentLanguage()] || 'en-US';
  recognition.interimResults = false;
  recognition.continuous = false;
  button.classList.add('listening');
  status.textContent = t('listeningNow');
  recognition.onresult = (event) => {
    const words = [...event.results].map((result) => result[0].transcript).join(' ').trim();
    target.value = `${target.value.trim()}${target.value.trim() ? ' ' : ''}${words}`;
  };
  recognition.onerror = () => { status.textContent = t('speechError'); };
  recognition.onend = () => {
    button.classList.remove('listening');
    if (status.textContent === t('listeningNow')) status.textContent = t('dictationAdded');
    activeRecognition = null;
  };
  try { recognition.start(); } catch (error) { recognition.onerror(error); recognition.onend(); }
}));
document.getElementById('copyArrivalBrief').addEventListener('click', async () => {
  const text = `${t('patientLanguageBrief')}\n${document.getElementById('arrivalBriefText').innerText}\n\n${t('englishHandoffBrief')}\n${document.getElementById('arrivalEnglishBrief').innerText}\n\n${t('arrivalDisclaimer')}`;
  const status = document.getElementById('arrivalActionStatus');
  try {
    await navigator.clipboard.writeText(text);
    status.textContent = t('briefCopied');
  } catch (error) {
    status.textContent = t('copyUnavailable');
  }
});
document.getElementById('listenArrivalBrief').addEventListener('click', () => {
  const status = document.getElementById('arrivalActionStatus');
  if (!('speechSynthesis' in window)) {
    status.textContent = t('listenUnavailable');
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(document.getElementById('arrivalBriefText').innerText);
  utterance.lang = speechLocales[currentLanguage()] || 'en-US';
  window.speechSynthesis.speak(utterance);
  status.textContent = t('readingBrief');
});
document.getElementById('listenEnglishBrief').addEventListener('click', () => {
  const status = document.getElementById('arrivalActionStatus');
  if (!('speechSynthesis' in window)) {
    status.textContent = t('listenUnavailable');
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(document.getElementById('arrivalEnglishBrief').innerText);
  utterance.lang = 'en-US';
  window.speechSynthesis.speak(utterance);
  status.textContent = t('readingEnglishBrief');
});
document.addEventListener('nearsignal:language', () => {
  if (!arrivalResult.hidden) buildArrivalBrief();
  updatePatientPassUI();
});

updatePatientPassUI();

function getInputs() {
  const value = Number(document.getElementById('ageValue').value);
  const unit = document.getElementById('ageUnit').value;
  return {
    patientGroup: document.querySelector('[name=patientGroup]:checked').value,
    selectedState: document.getElementById('stateSelect').value,
    ageMonths: unit === 'months' ? value : value * 12,
    need: document.querySelector('[name=need]:checked').value,
    emergency: document.querySelector('[name=emergency]:checked').value === 'yes',
    accessNeeds: new Set([...document.querySelectorAll('[name=accessNeed]:checked')].map((input) => input.value))
  };
}

function isOpenNow(schedule) {
  if (schedule.kind === 'always') return true;
  if (schedule.kind !== 'weekly') return null;
  const now = new Date();
  const period = schedule.days[now.getDay()];
  if (!period) return false;
  const minutes = now.getHours() * 60 + now.getMinutes();
  return minutes >= period[0] && minutes < period[1];
}

async function loadRoutes(list) {
  state.routes.clear();
  if (!state.location || !list.length) return false;
  try {
    state.routes = await routingService.matrix(state.location, list);
    return state.routes.size > 0;
  } catch (error) {
    console.warn('Live routing unavailable', error);
    return false;
  }
}

function scoreFacility(facility, inputs) {
  const route = state.routes.has(facility.id) ? presentRoute(state.routes.get(facility.id)) : null;
  const specialization = facility.pediatricSpecific ? 30 : 18;
  const settingFit = inputs.emergency ? 50 : (facility.type === 'urgent-care' ? 45 : facility.type === 'community-health-center' ? 38 : 20);
  const capability = facility.capabilities.includes(inputs.need) ? 20 : 0;
  const travel = route ? Math.max(0, 30 - route.minutes * 0.75) : 0;
  const accessMatch = inputs.emergency ? 0
    : (inputs.accessNeeds.has('uninsured') && facility.access.uninsuredWelcome ? 30 : 0)
      + (inputs.accessNeeds.has('low-cost') && (facility.access.slidingFee || facility.access.noOneTurnedAway) ? 35 : 0)
      + (inputs.accessNeeds.has('language') && facility.access.languages.length ? 25 : 0);
  return settingFit + specialization + capability + travel + accessMatch;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

function journeySummary(inputs) {
  const needKeys = { illness: 'summaryIllness', breathing: 'summaryBreathing', injury: 'summaryInjury', wound: 'summaryWound', stomach: 'summaryStomach', other: 'summaryOther' };
  const chips = [
    t(inputs.patientGroup === 'adult' ? 'summaryAdult' : 'summaryChild'),
    t(needKeys[inputs.need]),
    t(inputs.emergency ? 'summaryEmergency' : 'summaryNonEmergency'),
    inputs.selectedState
      ? (t(`state${inputs.selectedState}`) === `state${inputs.selectedState}` ? NATIONAL_NAMES.get(inputs.selectedState) : t(`state${inputs.selectedState}`))
      : t('allStates')
  ];
  if (inputs.accessNeeds.has('uninsured')) chips.push(t('summaryUninsured'));
  if (inputs.accessNeeds.has('low-cost')) chips.push(t('summaryLowCost'));
  if (inputs.accessNeeds.has('language')) chips.push(t('summaryLanguage'));
  return `<strong>${t('yourSituation')}</strong><div>${chips.map((chip) => `<span>${escapeHtml(chip)}</span>`).join('')}</div>`;
}

function facilityCard(facility, index, inputs) {
  const route = state.routes.has(facility.id) ? presentRoute(state.routes.get(facility.id)) : null;
  const open = isOpenNow(facility.hours);
  const status = open === true ? `<span class="open">${t('openNow')}</span>` : open === false ? `<span class="closed">${t('closedNow')}</span>` : `<span class="unknown">${t('hoursCheck')}</span>`;
  const routeText = route ? `<span class="metric strong">${format('minuteDrive',{n:route.minutes})}</span><span class="metric">${format('milesRoad',{n:route.miles})}</span><span class="metric">${format('arriveAbout',{time:route.arrivalLabel})}</span>` : `<span class="metric">${t('driveUnavailable')}</span>`;
  const ageText = facility.age.verifiedLimits ? '' : `<span class="metric warning">${t('ageVerify')}</span>`;
  const operationalStatus = facility.type === 'emergency' && facility.state === 'NJ'
  ? `<a class="metric" href="https://njdivert.juvare.com/" target="_blank" rel="noopener">${t('njStatus')}</a>`
  : `<a class="metric" href="${facility.sourceUrl}" target="_blank" rel="noopener">${t('waitProvider')}</a>`;
  const accessBadges = [
    facility.access.uninsuredWelcome ? `<span class="metric access-strong">${t('insuranceNotRequired')}</span>` : '',
    facility.access.slidingFee ? `<span class="metric access">${t('slidingFee')}</span>` : '',
    facility.access.noOneTurnedAway ? `<span class="metric access">${t('noOneTurnedAway')}</span>` : '',
    facility.access.charityCare ? `<a class="metric access" href="https://www.nj.gov/health/charitycare/" target="_blank" rel="noopener">${t('charityCare')}</a>` : '',
    facility.access.flatFee ? `<span class="metric access">Published self-pay: ${escapeHtml(facility.access.flatFee)}</span>` : ''
  ].join('');
  const translatedFacts = currentLanguage() === 'en' ? facility.highlights.slice(0, 3) : t(facility.type === 'emergency' ? 'genericEmergencyFacts' : facility.type === 'urgent-care' ? 'genericUrgentFacts' : 'genericCommunityFacts');
  const facts = translatedFacts.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  const typeLabel = currentLanguage() === 'en' ? facility.typeLabel : t(facility.type === 'emergency' ? 'typeEmergency' : facility.type === 'urgent-care' ? 'typeUrgent' : 'typeCommunity');
  const hoursLabel = currentLanguage() === 'en' ? facility.hours.label : t(facility.hours.kind === 'always' ? 'hoursAlways' : facility.hours.kind === 'weekly' ? 'hoursWeekly' : 'hoursLive');
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(facility.address)}`;
  const reason = inputs.emergency
    ? inputs.patientGroup === 'adult'
      ? t('adultEmergencyReason')
      : t('pediatricEmergencyReason')
    : facility.type === 'urgent-care'
      ? t('urgentReason')
      : facility.type === 'community-health-center'
        ? t('communityReason')
      : t('hospitalBackupReason');
  const evidence = accessEvidence(facility, inputs, route, open);
  const evidenceLabels = {
    appropriateSetting: t('evidenceSetting'), verifiedCapability: t('evidenceCapability'), ageFit: t('evidenceAge'), openStatus: t('evidenceOpen'), travel: t('evidenceTravel'), uninsuredAccess: t('evidenceUninsured'), affordability: t('evidenceAffordable'), languageSupport: t('evidenceLanguage'),
    ageLimit: t('verifyAge'), hours: t('verifyHours'), insurance: t('verifyInsurance'), cost: t('verifyCost')
  };
  const resolvedItems = evidence.resolved.map((key) => `<li>✓ ${escapeHtml(evidenceLabels[key])}</li>`).join('');
  const verifyItems = evidence.verify.map((key) => `<li>${escapeHtml(evidenceLabels[key])}</li>`).join('');
  return `<article class="card ${index === 0 ? 'best' : ''}">
    <div class="card-top"><div><div class="rank">${route ? (index === 0 ? t('closestMatch') : format('option',{n:index+1})) : format('verifiedOption',{n:index+1})}</div><h3>${escapeHtml(facility.name)}</h3><p class="facility-type">${escapeHtml(typeLabel)} · ${escapeHtml(facility.city)}</p></div>${status}</div>
    <div class="metrics">${routeText}${ageText}${operationalStatus}${accessBadges}${facility.access.uninsuredWelcome ? '' : `<span class="metric">${t('insuranceVerify')}</span>`}</div>
    <p class="reason"><strong>${t('whyThisFits')}</strong> ${reason}</p>
    <div class="access-confidence"><div><strong>${t('accessConfidence')}</strong><span class="confidence-level ${evidence.level}">${t(`confidence${evidence.level[0].toUpperCase()}${evidence.level.slice(1)}`)}</span></div><span class="confidence-count">${format('barriersResolved', { resolved: evidence.resolved.length, total: evidence.resolved.length + evidence.verify.length })}</span></div>
    <details class="why-breakdown"><summary>${t('whyIncluded')}</summary><div class="why-columns"><div><b>${t('evidenceResolved')}</b><ul>${resolvedItems}</ul></div><div><b>${t('stillVerify')}</b><ul>${verifyItems || `<li>${t('nothingAdditional')}</li>`}</ul></div></div></details>
    <ul class="facts">${facts}</ul>
    <p class="hours"><strong>${t('publishedHours')}</strong> ${escapeHtml(hoursLabel)}</p>
    ${facility.access.note ? `<p class="access-note"><strong>${t('costAccess')}</strong> ${escapeHtml(currentLanguage()==='en' ? facility.access.note : t('accessNote'))} <a class="text-link" href="${facility.access.sourceUrl}" target="_blank" rel="noopener">${t('officialSource')}</a></p>` : ''}
    ${route ? `<p class="route-source"><strong>${t('routeSource')}</strong> ${escapeHtml(route.provider)} · ${route.trafficAware ? t('trafficYes') : t('trafficNo')} · ${t('calculated')} ${new Date(route.calculatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>` : ''}
    <p class="verification-line">✓ ${format('verificationReviewed', { date: new Date(`${facility.verification.reviewedAt}T12:00:00`).toLocaleDateString(currentLanguage(), { month: 'short', day: 'numeric', year: 'numeric' }) })}</p>
    <p class="quality"><strong>${t('quality')}</strong> ${escapeHtml(currentLanguage()==='en' ? facility.quality.note : t('qualityUnavailable'))}${facility.quality.url ? ` <a href="${facility.quality.url}" target="_blank" rel="noopener">${t('njReport')}</a>` : ''}</p>
    <div class="card-actions"><button class="verified-arrival-button" type="button" data-verified-arrival="${escapeHtml(facility.id)}">${t('verifiedArrivalButton')}</button><a class="primary link-button" href="${directions}" target="_blank" rel="noopener">${t('directions')}</a><a class="secondary link-button" href="tel:${facility.phone.replace(/\D/g, '')}">${t('call')}</a><a class="text-link" href="${facility.sourceUrl}" target="_blank" rel="noopener">${t('verifyDetails')}</a><button class="outcome-button" type="button" data-outcome-facility="${escapeHtml(facility.id)}">${t('didItWork')}</button></div>
  </article>`;
}

function safeExternalUrl(value) {
  if (!value) return '';
  try {
    const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    const url = new URL(candidate);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function discoveryCard(record){
  const address=[record.address,record.city,record.state,record.zip].filter(Boolean).join(', ');
  const directions=`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
  const kind=t(record.kind==='hospital'?'discoveryHospital':'discoveryHealthCenter');
  const proximity=record.distance!==null?`<span>${format('discoveryApproxMiles',{n:Math.round(record.distance)})}</span>`:record.zip?.slice(0,5)===state.locationZip?`<span>${t('discoverySameZip')}</span>`:'';
  const source=discoverySource(record);
  const website=safeExternalUrl(record.website);
  const resolved=2+(record.phone?1:0);
  return `<article><div class="discovery-card-top"><div><span class="discovery-kind">${escapeHtml(kind)}</span><h4>${escapeHtml(record.name)}</h4><p>${escapeHtml(address)}</p></div><b>${t('discoveryTierOfficial')}</b></div><div class="discovery-meta">${proximity}${record.kind==='health-center'?`<span>${t('discoveryAffordableCandidate')}</span>`:`<span>${t('discoveryEmergencyReported')}</span>`}</div><div class="discovery-progress"><span style="--progress:${resolved/7*100}%"></span><b>${format('discoveryEvidenceCount',{resolved})}</b></div><details class="discovery-needed"><summary>${t('discoveryNeededTitle')}</summary><div><span>✓ ${t('discoveryIdentityResolved')}</span><span>✓ ${t('discoveryLocationResolved')}</span>${record.phone?`<span>✓ ${t('discoveryContactResolved')}</span>`:`<span>○ ${t('discoveryContactNeeded')}</span>`}<span>○ ${t('discoveryPopulationNeeded')}</span><span>○ ${t('discoveryServicesNeeded')}</span><span>○ ${t('discoveryHoursNeeded')}</span><span>○ ${t('discoveryAccessNeeded')}</span></div></details><p class="discovery-unknown">${t('discoveryUnknown')}</p><div class="discovery-actions"><a href="${directions}" target="_blank" rel="noopener">${t('directions')}</a>${record.phone?`<a href="tel:${record.phone.replace(/\D/g,'')}">${t('call')}</a>`:''}${website?`<a href="${escapeHtml(website)}" target="_blank" rel="noopener">${t('providerWebsite')}</a>`:''}<a href="${source}" target="_blank" rel="noopener">${t('officialSource')}</a></div></article>`;
}

function renderCommonSpiritCohort(inputs){
  const section=document.getElementById('commonspiritCohort');
  const selected=commonspiritBatch?.records?.filter(record=>record.location.endsWith(`, ${inputs.selectedState}`))||[];
  if(!inputs.selectedState||!selected.length){section.hidden=true;return;}
  section.hidden=false;
  document.getElementById('commonspiritCards').innerHTML=selected.map(record=>{
    const ready=record.status==='release-eligible';
    const resolved=Object.values(record.domains).filter(domain=>domain.status==='resolved').length;
    const address=record.address.trim();
    const directions=`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
    const phone=record.phone?.replace(/\D/g,'');
    return `<article><div class="cohort-card-top"><div><span>${ready?t('cohortReady'):t('cohortConfirm')}</span><h4>${escapeHtml(record.name)}</h4><p>${escapeHtml(address)}</p></div><b>${resolved}/8</b></div><div class="cohort-progress"><span style="--progress:${resolved/8*100}%"></span></div><p>${ready?t('cohortReadyBody'):t('cohortConfirmBody')}</p><div class="discovery-actions"><a href="${directions}" target="_blank" rel="noopener">${t('directions')}</a>${phone?`<a href="tel:${phone}">${t('call')}</a>`:''}<a href="${escapeHtml(record.sourceUrl)}" target="_blank" rel="noopener">${t('providerWebsite')}</a></div></article>`;
  }).join('');
}

async function renderNationalDiscovery(inputs){
  const section=document.getElementById('nationalDiscovery');
  const selectedState=inputs.selectedState;
  if(!selectedState){section.hidden=true;return;}
  section.hidden=false;
  document.getElementById('discoveryCounts').innerHTML=`<span>${t('discoveryLoading')}</span>`;
  document.getElementById('discoveryCards').innerHTML='';
  try{
    const shard=await loadDiscoveryState(selectedState);
    const ranked=rankDiscoveryRecords(shard.records,{origin:state.location,zip:state.locationZip,emergency:inputs.emergency,limit:shard.records.length});
    const records=ranked.slice(0,state.discoveryLimit);
    document.getElementById('discoveryCounts').innerHTML=`<div><strong>${shard.total.toLocaleString()}</strong><span>${format('discoveryStateTotal',{state:selectedState})}</span></div><div><strong>${shard.hospitals.toLocaleString()}</strong><span>${t('discoveryCmsHospitals')}</span></div><div><strong>${shard.healthCenters.toLocaleString()}</strong><span>${t('discoveryHrsaCenters')}</span></div>`;
    document.getElementById('discoveryCards').innerHTML=records.length?`${records.map(discoveryCard).join('')}${ranked.length>records.length?`<button id="showMoreDiscovery" class="secondary discovery-more" type="button">${format('discoveryShowMore',{remaining:Math.min(12,ranked.length-records.length)})}</button>`:''}`:`<p class="discovery-empty">${t('discoveryNone')}</p>`;
    document.getElementById('showMoreDiscovery')?.addEventListener('click',async()=>{state.discoveryLimit+=12;await renderNationalDiscovery(inputs);});
  }catch(error){
    console.warn('National discovery unavailable',error);
    document.getElementById('discoveryCounts').innerHTML=`<span>${t('discoveryUnavailable')}</span>`;
  }
}

function renderAccessXray(analysis, inputs, routed) {
  const afterState=analysis.total-analysis.counts.state;
  const afterPopulation=afterState-analysis.counts.population-analysis.counts.age;
  const afterClinical=afterPopulation-analysis.counts.setting-analysis.counts.capability;
  const openWarnings=analysis.eligible.filter(facility=>isOpenNow(facility.hours)!==true).length;
  const reasonLabels={state:t('xrayReasonState'),population:t('xrayReasonPopulation'),age:t('xrayReasonAge'),setting:t('xrayReasonSetting'),capability:t('xrayReasonCapability'),distance:t('xrayReasonDistance')};
  const relevantReasons=XRAY_REASON_ORDER.filter(reason=>reason!=='state' && analysis.counts[reason]>0);
  const exclusions=relevantReasons.map(reason=>{
    const examples=analysis.excluded.filter(item=>item.reason===reason).slice(0,5).map(item=>escapeHtml(item.facility.name)).join(' · ');
    return `<article><div><strong>${analysis.counts[reason]}</strong><span>${escapeHtml(reasonLabels[reason])}</span></div>${examples?`<small>${examples}${analysis.counts[reason]>5?' · …':''}</small>`:''}</article>`;
  }).join('');
  document.getElementById('accessXray').innerHTML=`
    <div class="xray-heading"><div><p class="eyebrow">${escapeHtml(t('xrayEyebrow'))}</p><h3 id="access-xray-title">${escapeHtml(t('xrayTitle'))}</h3></div><span>${escapeHtml(t('xrayRealData'))}</span></div>
    <p class="xray-intro">${escapeHtml(t('xrayIntro'))}</p>
    <div class="xray-scale"><div><strong>22,292</strong><span>${t('xrayIndexed')}</span></div><i>→</i><div><strong>9,972</strong><span>${t('xrayEnriched')}</span></div><i>→</i><div><strong>${facilities.length}</strong><span>${t('xrayReady')}</span></div></div>
    <div class="xray-funnel"><div><strong>${analysis.total}</strong><span>${escapeHtml(t('xrayNetwork'))}</span></div><i>→</i><div><strong>${afterState}</strong><span>${escapeHtml(inputs.selectedState?t('xrayState'):t('xrayScope'))}</span></div><i>→</i><div><strong>${afterPopulation}</strong><span>${escapeHtml(t('xrayPopulation'))}</span></div><i>→</i><div><strong>${afterClinical}</strong><span>${escapeHtml(t('xrayClinical'))}</span></div>${routed?`<i>→</i><div class="xray-final"><strong>${analysis.eligible.length}</strong><span>${escapeHtml(t('xrayDistance'))}</span></div>`:`<i>→</i><div class="xray-final"><strong>${analysis.eligible.length}</strong><span>${escapeHtml(t('xrayRemain'))}</span></div>`}</div>
    <div class="xray-callout"><strong>${format('xrayResult',{n:analysis.eligible.length})}</strong><span>${openWarnings?format('xrayWarnings',{n:openWarnings}):t('xrayNoOpenWarnings')}</span></div>
    <details class="xray-exclusions"><summary>${escapeHtml(t('xrayWhyNot'))}</summary>${exclusions||`<p>${escapeHtml(t('xrayNoExclusions'))}</p>`}<p class="xray-method">${escapeHtml(t('xrayMethod'))}</p></details>`;
}

async function renderResults() {
  const inputs = getInputs();
  const initialAnalysis=analyzeAccess(facilities,inputs);
  let eligible=initialAnalysis.eligible;
  const routed = await loadRoutes(eligible);
  const analysis=analyzeAccess(facilities,inputs,routed?{routeMap:state.routes,maxDistanceMeters:MAX_SEARCH_MILES*1609.344}:{});
  eligible=analysis.eligible;
  eligible = eligible.map((facility) => ({ ...facility, rankScore: scoreFacility(facility, inputs) }))
    .sort((a, b) => b.rankScore - a.rankScore || a.name.localeCompare(b.name));
  state.lastEligible = eligible;

  document.getElementById('resultsTitle').textContent = inputs.emergency ? t(inputs.patientGroup === 'adult' ? 'adultEDs' : 'pediatricEDs') : t('concernOptions');
  document.getElementById('emergencyBanner').hidden = !inputs.emergency;
  document.getElementById('demoBanner').hidden = !state.demoScenario;
  document.getElementById('demoNext').hidden = !state.demoScenario;
  document.getElementById('journeySummary').innerHTML = journeySummary(inputs);
  document.getElementById('routingNote').textContent = routed
    ? t('routingReady')
    : state.location && initialAnalysis.eligible.length
      ? t('routingFailed')
      : state.location
        ? t('routingNoVerifiedCandidates')
        : t('routingOptional');
  renderAccessXray(analysis,inputs,routed);
  const visible = state.showAllResults ? eligible : eligible.slice(0, 3);
  const resultControls = eligible.length > 3
    ? `<div class="result-controls"><p>${format('showingResults', { shown: visible.length, total: eligible.length })}</p><button class="secondary" id="toggleAllResults" type="button">${state.showAllResults ? t('showTopThree') : format('viewAllOptions', { n: eligible.length })}</button></div>`
    : '';
  document.getElementById('cards').innerHTML = eligible.length
    ? `${resultControls}${visible.map((facility, index) => facilityCard(facility, index, inputs)).join('')}`
    : `<div class="empty"><h3>${t('noMatchTitle')}</h3><p>${t('noMatchBody')}</p></div>`;
  await renderNationalDiscovery(inputs);
  renderCommonSpiritCohort(inputs);
  document.getElementById('learningLoop').textContent = format('learningLoop', { n: outcomeCount(localStorage) });
  document.getElementById('toggleAllResults')?.addEventListener('click', async () => {
    state.showAllResults = !state.showAllResults;
    await renderResults();
    document.getElementById('cards').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

const verifiedArrivalDialog = document.getElementById('verifiedArrivalDialog');
const verifiedArrivalConsent = document.getElementById('verifiedArrivalConsent');
const verifiedArrivalResult = document.getElementById('verifiedArrivalResult');

function openVerifiedArrival(facilityId) {
  const facility=state.lastEligible.find(item=>item.id===facilityId);
  if(!facility)return;
  state.verifiedFacilityId=facilityId;
  document.getElementById('verifiedFacilityName').textContent=facility.name;
  document.getElementById('verifiedConsent').checked=false;
  document.getElementById('verifiedArrivalStatus').textContent='';
  document.getElementById('verifiedRerouteResult').hidden=true;
  verifiedArrivalConsent.hidden=false;
  verifiedArrivalResult.hidden=true;
  if(typeof verifiedArrivalDialog.showModal==='function')verifiedArrivalDialog.showModal(); else verifiedArrivalDialog.setAttribute('open','');
}

document.getElementById('cards').addEventListener('click',(event)=>{
  const button=event.target.closest('[data-verified-arrival]');
  if(button)openVerifiedArrival(button.dataset.verifiedArrival);
});

document.getElementById('runVerifiedArrival').addEventListener('click',()=>{
  const status=document.getElementById('verifiedArrivalStatus');
  if(!document.getElementById('verifiedConsent').checked){status.textContent=t('verifiedConsentRequired');return;}
  const facility=state.lastEligible.find(item=>item.id===state.verifiedFacilityId);
  const confirmation=buildDemoConfirmation(facility,getInputs());
  document.getElementById('verifiedArrivalCode').textContent=confirmation.code;
  verifiedArrivalConsent.hidden=true;
  verifiedArrivalResult.hidden=false;
});

document.getElementById('simulateRedirect').addEventListener('click',()=>{
  const alternative=nextAlternative(state.lastEligible,state.verifiedFacilityId);
  const box=document.getElementById('verifiedRerouteResult');
  box.hidden=false;
  box.innerHTML=alternative
    ? `<strong>${escapeHtml(t('rerouteFound'))}</strong><span>${escapeHtml(alternative.name)}</span><small>${escapeHtml(t('rerouteFoundBody'))}</small>`
    : `<strong>${escapeHtml(t('rerouteNone'))}</strong><small>${escapeHtml(t('rerouteNoneBody'))}</small>`;
});

const outcomeDialog = document.getElementById('outcomeDialog');
const outcomeBarrier = document.getElementById('outcomeBarrier');
const outcomeOtherWrap = document.getElementById('outcomeOtherWrap');
const outcomeOther = document.getElementById('outcomeOther');

function updateOutcomeOther() {
  const enabled = outcomeBarrier.value === 'other';
  outcomeOtherWrap.hidden = !enabled;
  outcomeOther.required = enabled;
  if (!enabled) outcomeOther.value = '';
}

outcomeBarrier.addEventListener('change', updateOutcomeOther);
document.getElementById('cards').addEventListener('click', (event) => {
  const button = event.target.closest('[data-outcome-facility]');
  if (!button) return;
  document.getElementById('outcomeFacility').value = button.dataset.outcomeFacility;
  document.querySelectorAll('[name=outcomeResult]').forEach((input) => { input.checked = false; });
  outcomeBarrier.value = 'none';
  outcomeOther.value = '';
  updateOutcomeOther();
  document.getElementById('outcomeStatus').textContent = '';
  if (typeof outcomeDialog.showModal === 'function') outcomeDialog.showModal(); else outcomeDialog.setAttribute('open', '');
});

document.getElementById('saveOutcome').addEventListener('click', () => {
  const result = document.querySelector('[name=outcomeResult]:checked');
  const status = document.getElementById('outcomeStatus');
  if (!result) { status.textContent = t('chooseOutcome'); return; }
  if (outcomeBarrier.value === 'other' && !outcomeOther.value.trim()) {
    status.textContent = t('describeOtherBarrier');
    outcomeOther.focus();
    return;
  }
  const count = saveOutcome(localStorage, {
    facilityId: document.getElementById('outcomeFacility').value,
    result: result.value,
    barrier: outcomeBarrier.value,
    barrierDetail: outcomeBarrier.value === 'other' ? outcomeOther.value.trim() : '',
    createdAt: new Date().toISOString()
  });
  status.textContent = t('outcomeSaved');
  document.getElementById('learningLoop').textContent = format('learningLoop', { n: count });
});

document.getElementById('demoNext').addEventListener('click', () => {
  document.getElementById('languageSelect').value = 'es';
  document.getElementById('languageSelect').dispatchEvent(new Event('change'));
  openArrivalBrief();
  document.getElementById('arrivalPatient').value = 'child';
  document.getElementById('arrivalCategory').value = 'illness';
  document.getElementById('arrivalSeverity').value = 'moderate';
  document.getElementById('arrivalWarning').value = 'no';
  document.getElementById('arrivalConcern').value = 'Mi hijo tiene fiebre y tos';
  document.getElementById('arrivalStarted').value = 'Desde ayer por la noche';
  document.getElementById('arrivalMedications').value = 'Alérgico a la penicilina';
});
