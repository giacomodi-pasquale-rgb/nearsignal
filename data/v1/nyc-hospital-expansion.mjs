const checkedAt = '2026-09-28';
const reviewBy = '2026-12-28';
const systemSource = 'https://www.nychealthandhospitals.org/services/emergency-services/';

const hospitals = [
  ['nyc-hh-jacobi-ed','330127','NYC Health + Hospitals/Jacobi Emergency Department','1400 Pelham Parkway South','Bronx','10461',40.857449,-73.847645,'7189185000','https://www.nychealthandhospitals.org/department-of-emergency-medicine-website-jacobi-ncb/department/jacobi-emergency-services/',['Level I adult trauma center','Dedicated pediatric emergency department','Psychiatric emergency services']],
  ['nyc-hh-lincoln-ed','330080','NYC Health + Hospitals/Lincoln Emergency Department','234 East 149th Street','Bronx','10451',40.817596,-73.923799,'7185795000','https://www.nychealthandhospitals.org/lincoln/services/medical-specialties/pediatric-emergency-and-critical-care/',['Adult emergency and trauma care','Pediatric emergency care available 24 hours','Emergency behavioral health services']],
  ['nyc-hh-south-brooklyn-ed','330196','NYC Health + Hospitals/South Brooklyn Health Emergency Department','2601 Ocean Parkway','Brooklyn','11235',40.586634,-73.965790,'7186163000','https://www.nychealthandhospitals.org/southbrooklynhealth/services/emergency-services/',['Adult and pediatric emergency physicians','Separate pediatric emergency care division','Open 24 hours']],
  ['nyc-hh-elmhurst-ed','330128','NYC Health + Hospitals/Elmhurst Emergency Department','79-01 Broadway','Elmhurst','11373',40.744849,-73.885662,'7183344000','https://www.nychealthandhospitals.org/elmhurst/services/the-pediatric-emergency-department/',['Level I trauma center','Dedicated pediatric emergency department','Interpreter access described by the provider']],
  ['nyc-hh-queens-ed','330231','NYC Health + Hospitals/Queens Emergency Department','82-68 164th Street','Jamaica','11432',40.717490,-73.802240,'7188833000','https://www.nychealthandhospitals.org/queens/services/emergency-care/',['Full-spectrum adult and pediatric emergency care','Separate pediatric emergency department','Open 24 hours']],
  ['nyc-hh-bellevue-ed','330204','NYC Health + Hospitals/Bellevue Emergency Department','462 First Avenue','New York','10016',40.739699,-73.976403,'2125624141','https://www.nychealthandhospitals.org/bellevue/services/emergency-trauma/',['Level I adult trauma center','Level II pediatric trauma center','Dedicated adult, pediatric, and psychiatric emergency services']],
  ['nyc-hh-harlem-ed','330240','NYC Health + Hospitals/Harlem Emergency Department','506 Lenox Avenue','New York','10037',40.814890,-73.940198,'2129391000','https://www.nychealthandhospitals.org/harlem/services/',['Adult emergency and trauma care','Dedicated pediatric emergency department','Pediatric emergency care available 24 hours']],
  ['nyc-hh-metropolitan-ed','330199','NYC Health + Hospitals/Metropolitan Emergency Department','1901 First Avenue','New York','10029',40.784174,-73.944134,'2124236262','https://www.nychealthandhospitals.org/metropolitan/services/emergency-medicine/',['Round-the-clock adult emergency care','Infant, child, and adolescent emergency care','Psychiatric emergency assessment and stabilization']]
];

export const NYC_HOSPITAL_DATASET_VERSION = '2026-09-28.1';

export function expandNycHospitalLocations() {
  return hospitals.map(([id,cmsCcn,name,address1,city,postalCode,latitude,longitude,phone,website,highlights]) => ({
    id,
    externalIds:{cmsCcn},
    identity:{name,organization:'NYC Health + Hospitals',type:'emergency',typeLabel:'Adult and pediatric emergency department',pediatricSpecific:true,patientGroups:['adult','pediatric']},
    location:{address1,city,state:'NY',postalCode,latitude,longitude},
    contact:{phone,website,bookingUrl:null},
    pediatricAge:{minimumMonths:null,maximumMonths:null,limitsVerified:false},
    capabilities:['illness','breathing','injury','wound','stomach','other'],
    hours:{kind:'always',timezone:'America/New_York',label:'Open 24 hours',weekly:{}},
    highlights,
    live:{waitMinutes:null,acceptingPatients:null},
    insurance:{status:'verify',plans:[]},
    quality:{displayScore:null,note:'No comparable public emergency-care quality score is displayed.',sourceUrl:null},
    access:{uninsuredWelcome:true,slidingFee:false,noOneTurnedAway:true,charityCare:false,flatFee:null,languages:[],note:'NYC Health + Hospitals states that emergency care is provided regardless of ability to pay. Verify insurance participation and financial-assistance terms.',sourceUrl:systemSource},
    verification:{status:'verified-with-unknowns',reviewedAt:checkedAt,reviewBy,method:'cms-match-authoritative-provider-and-system-sources'},
    evidence:[
      {id:`${id}-provider`,url:website,publisher:'NYC Health + Hospitals',supports:['identity','location','contact','capabilities','hours','highlights','patientGroups'],checkedAt},
      {id:`${id}-system`,url:systemSource,publisher:'NYC Health + Hospitals',supports:['identity','capabilities','highlights','patientGroups','access'],checkedAt}
    ]
  }));
}
