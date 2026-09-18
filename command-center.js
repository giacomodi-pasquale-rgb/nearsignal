import { syntheticAccessEvents, summarizeAccess, estimateOpportunity, barrierLabels } from './access-command.js';
import { analyzeAccess, primaryAccessGap } from './access-xray.js';

const number=new Intl.NumberFormat('en-US');
const percent=new Intl.NumberFormat('en-US',{style:'percent',maximumFractionDigits:1});
let activeEvents=syntheticAccessEvents;
const verifiedFacilities=window.CARE_ROUTE_FACILITIES || [];
document.getElementById('stressFacilityCount').textContent=number.format(verifiedFacilities.length);
const stressLabels={population:'Population not verified',age:'Outside verified age limit',setting:'Wrong setting',capability:'Capability not published',distance:'Outside route radius'};

function renderStressTest(){
  const patientGroup=document.getElementById('stressPatient').value;
  document.getElementById('stressAgeWrap').hidden=patientGroup!=='pediatric';
  const inputs={selectedState:document.getElementById('stressState').value,patientGroup,ageMonths:patientGroup==='pediatric'?Number(document.getElementById('stressAge').value):360,need:document.getElementById('stressNeed').value,emergency:document.getElementById('stressEmergency').checked,accessNeeds:new Set()};
  const analysis=analyzeAccess(verifiedFacilities,inputs);
  const gap=primaryAccessGap(analysis);
  document.getElementById('stressScope').textContent=number.format(analysis.inState);
  document.getElementById('stressEligible').textContent=number.format(analysis.eligible.length);
  document.getElementById('stressGap').textContent=stressLabels[gap.reason] || gap.reason;
  document.getElementById('stressGapCount').textContent=`${number.format(gap.count)} facilities removed at this gate`;
  const relevant=Object.entries(analysis.counts).filter(([reason,count])=>reason!=='state'&&count>0).sort((a,b)=>b[1]-a[1]);
  document.getElementById('stressReasons').innerHTML=relevant.length?relevant.map(([reason,count])=>`<span><b>${number.format(count)}</b>${stressLabels[reason]||reason}</span>`).join(''):'<span><b>0</b>No required gate removed a facility</span>';
}

function render() {
  const summary=summarizeAccess(activeEvents);
  document.getElementById('totalSearches').textContent=number.format(summary.searches);
  document.getElementById('completionRate').textContent=percent.format(summary.completionRate);
  document.getElementById('successfulSearches').textContent=`${number.format(summary.successful)} completed paths`;
  document.getElementById('failedSearches').textContent=number.format(summary.unsuccessful);
  document.getElementById('largestBarrier').textContent=summary.barriers[0].label;
  document.getElementById('largestBarrierCount').textContent=`${number.format(summary.barriers[0].count)} affected journeys`;
  const max=Math.max(...summary.barriers.map(item=>item.count));
  document.getElementById('barrierBars').innerHTML=summary.barriers.map(item=>`<div><div><b>${item.label}</b><span>${number.format(item.count)}</span></div><i><em style="width:${Math.round(item.count/max*100)}%"></em></i></div>`).join('');
  renderOpportunity();
}

function renderOpportunity() {
  const key=document.getElementById('barrierSelect').value;
  const rate=Number(document.getElementById('recoverySelect').value);
  const result=estimateOpportunity(activeEvents,key,rate);
  document.getElementById('recoveredPaths').textContent=`+${number.format(result.recovered)}`;
  document.getElementById('newRate').textContent=`Illustrative completion rate: ${percent.format(result.newCompletionRate)} · ${number.format(result.affected)} affected journeys`;
}

document.getElementById('barrierSelect').innerHTML=Object.entries(barrierLabels).map(([key,label])=>`<option value="${key}">${label}</option>`).join('');
document.getElementById('barrierSelect').addEventListener('change',renderOpportunity);
document.getElementById('recoverySelect').addEventListener('change',renderOpportunity);
document.querySelectorAll('.stress-controls select,.stress-controls input').forEach(control=>control.addEventListener('change',renderStressTest));

const allCard={state:'ALL',searches:syntheticAccessEvents.reduce((n,r)=>n+r.searches,0),successful:syntheticAccessEvents.reduce((n,r)=>n+r.successful,0)};
document.getElementById('stateCards').innerHTML=[allCard,...syntheticAccessEvents].map(row=>`<button data-state="${row.state}" class="${row.state==='ALL'?'active':''}"><strong>${row.state==='ALL'?'All nine states':row.state}</strong><span>${percent.format(row.successful/row.searches)} completed</span><small>${number.format(row.searches)} attempts</small></button>`).join('');
document.getElementById('stateCards').addEventListener('click',event=>{
  const button=event.target.closest('[data-state]'); if(!button)return;
  document.querySelectorAll('[data-state]').forEach(item=>item.classList.toggle('active',item===button));
  activeEvents=button.dataset.state==='ALL'?syntheticAccessEvents:syntheticAccessEvents.filter(row=>row.state===button.dataset.state);
  render();
});
render();
renderStressTest();
