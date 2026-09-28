const checkedAt='2026-09-28';
const reviewBy='2026-12-28';
const cmsSource='https://data.cms.gov/provider-data/dataset/xubh-q36u';
const emtalaSource='https://www.cms.gov/medicare/regulations-guidance/legislation/emergency-medical-treatment-labor-act';

// Patient-facing emergency entrances, not corporate hospital-system counts.
// Coordinates are address matches from the U.S. Census geocoder unless noted.
const locations=[
  ['bronxcare-ed','330009','BronxCare Hospital Center Emergency Department','1276 Fulton Avenue','Bronx','10456',40.831749,-73.903664,'7185901800','https://www.bronxcare.org/our-services/emergency-medicine',true],
  ['brooklyn-hospital-ed','330056','The Brooklyn Hospital Center Emergency Department','121 DeKalb Avenue','Brooklyn','11201',40.689642,-73.972207,'7182508000','https://www.tbh.org/locations/main-hospital',false],
  ['montefiore-moses-ed','330059','Montefiore Moses Emergency Department','111 East 210th Street','Bronx','10467',40.879987,-73.880739,'7189204321','https://www.montefiore.org/emergency-medicine',false],
  ['maimonides-main-ed','330194','Maimonides Medical Center Emergency Department','4802 10th Avenue','Brooklyn','11219',40.639538,-73.998819,'7182836000','https://maimo.org/treatments-care/trauma-and-er/',true],
  ['nyp-queens-ed','330055','NewYork-Presbyterian Queens Emergency Department','56-45 Main Street','Flushing','11355',40.747512,-73.826007,'7186701100','https://www.nyp.org/emergency-medicine',false],
  ['lenox-hill-ed','330119','Lenox Hill Hospital Emergency Department','100 East 77th Street','New York','10075',40.774246,-73.961446,'2124342000','https://lenoxhill.northwell.edu/emergency-department',false],
  ['kings-county-ed','330202','NYC Health + Hospitals/Kings County Emergency Department','451 Clarkson Avenue','Brooklyn','11203',40.655771,-73.945225,'7182453901','https://www.nychealthandhospitals.org/kingscounty/services/emergency-services/',true],
  ['suny-downstate-ed','330350','University Hospital at Downstate Emergency Department','445 Lenox Road','Brooklyn','11203',40.654454,-73.946246,'7182701000','https://www.downstate.edu/email/emergency-medicine/emergency.html',true],
  ['st-barnabas-ed','330399','St. Barnabas Hospital Emergency Department','4422 Third Avenue','Bronx','10457',40.853567,-73.891325,'7189609000','https://www.sbhny.org/services/emergency-medicine/',false],
  ['jamaica-hospital-ed','330014','Jamaica Hospital Medical Center Emergency Department','89-00 Van Wyck Expressway','Jamaica','11418',40.702881,-73.817131,'7182626000','https://jamaicahospital.org/clinical-services/emergency-medicine/',false],
  ['flushing-hospital-ed','330193','Flushing Hospital Medical Center Emergency Department','45-00 Parsons Boulevard','Flushing','11355',40.755549,-73.815628,'7186705000','https://flushinghospital.org/clinical-services/emergency-department/',false],
  ['wyckoff-heights-ed','330221','Wyckoff Heights Medical Center Emergency Department','374 Stockholm Street','Brooklyn','11237',40.704912,-73.917336,'7189637272','https://wyckoffhospital.org/',false],
  ['brookdale-ed','330233','One Brooklyn Health Brookdale Emergency Department','1 Brookdale Plaza','Brooklyn','11212',40.655241,-73.912205,'7182405000','https://onebrooklynhealth.org/services/emergency-care',true],
  ['st-johns-episcopal-ed','330395','St. John’s Episcopal Hospital Emergency Department','327 Beach 19th Street','Far Rockaway','11691',40.598035,-73.753029,'7188697000','https://ehs.org/services/emergency-medicine/',false],
  ['mount-sinai-west-ed','330046','Mount Sinai West Emergency Department','1000 10th Avenue','New York','10019',40.770078,-73.987771,'2125234000','https://www.mountsinai.org/locations/emergency-medicine',false],
  ['maimonides-midwood-ed','330019','Maimonides Midwood Community Hospital Emergency Department','2525 Kings Highway','Brooklyn','11229',40.613836,-73.948083,'7186925302','https://maimo.org/treatments-care/trauma-and-er/',false],
  ['woodhull-ed','330396','NYC Health + Hospitals/Woodhull Emergency Department','760 Broadway','Brooklyn','11206',40.700457,-73.941585,'7189638100','https://www.nychealthandhospitals.org/woodhull/services/emergency-room/',true],
  ['nyp-columbia-ed','330101','NewYork-Presbyterian/Columbia Emergency Department','622 West 168th Street','New York','10032',40.841285,-73.940404,'2123056204','https://www.nyp.org/emergency-medicine',false],
  ['nyp-weill-cornell-ed','330101','NewYork-Presbyterian/Weill Cornell Emergency Department','525 East 68th Street','New York','10065',40.764257,-73.955378,'2127465026','https://www.nyp.org/emergency-medicine',false],
  ['nyp-allen-ed','330101','NewYork-Presbyterian/Allen Hospital Emergency Department','5141 Broadway','New York','10034',40.872832,-73.912220,'2129324245','https://www.nyp.org/emergency-medicine',false],
  ['nyp-lower-manhattan-ed','330101','NewYork-Presbyterian Lower Manhattan Hospital Emergency Department','170 William Street','New York','10038',40.710407,-74.005493,'2123125070','https://www.nyp.org/emergency-medicine',false],
  ['nyp-brooklyn-methodist-ed','330101','NewYork-Presbyterian Brooklyn Methodist Emergency Department','506 6th Street','Brooklyn','11215',40.668465,-73.979711,'7187803137','https://www.nyp.org/emergency-medicine',true],
  ['mount-sinai-morningside-ed','330169','Mount Sinai Morningside Emergency Department','1111 Amsterdam Avenue','New York','10025',40.805861,-73.961663,'2125234000','https://www.mountsinai.org/locations/emergency-medicine',false],
  ['mount-sinai-queens-ed','330024','Mount Sinai Queens Emergency Department','25-10 30th Avenue','Astoria','11102',40.768408,-73.924770,'7189321000','https://www.mountsinai.org/locations/emergency-medicine',false],
  ['mount-sinai-brooklyn-ed','330024','Mount Sinai Brooklyn Emergency Department','3201 Kings Highway','Brooklyn','11234',40.617757,-73.943216,'7182523000','https://www.mountsinai.org/locations/emergency-medicine',false],
  ['nyu-perelman-ed','330214','Ronald O. Perelman Center for Emergency Services','570 First Avenue','New York','10016',40.742695,-73.974220,'2122635550','https://nyulangone.org/care-services/emergency-care',false],
  ['nyu-brooklyn-ed','330214','NYU Langone Hospital—Brooklyn Emergency Department','150 55th Street','Brooklyn','11220',40.646899,-74.020964,'7186307185','https://nyulangone.org/locations/directory/brooklyn',true],
  ['nyu-cobble-hill-ed','330214','NYU Langone Health—Cobble Hill Emergency Department','70 Atlantic Avenue','Brooklyn','11201',40.691066,-73.997570,'6467547900','https://nyulangone.org/locations/directory/brooklyn',false],
  ['interfaith-ed','330397','One Brooklyn Health Interfaith Emergency Department','1545 Atlantic Avenue','Brooklyn','11213',40.678022,-73.938511,'7186134000','https://onebrooklynhealth.org/services/emergency-care',true],
  ['montefiore-weiler-ed','330059','Montefiore Weiler Emergency Department','1825 Eastchester Road','Bronx','10461',40.850272,-73.844943,'7189043333','https://www.montefiore.org/emergency-medicine',false],
  ['montefiore-wakefield-ed','330059','Montefiore Wakefield Emergency Department','600 East 233rd Street','Bronx','10466',40.894588,-73.861319,'7189209000','https://www.montefiore.org/emergency-medicine',false],
  ['maimonides-bay-ridge-ed',null,'Maimonides Bay Ridge Emergency Department','9036 7th Avenue','Brooklyn','11209',40.615865,-74.022361,'7182832200','https://maimo.org/treatments-care/emergency-medicine/bay-ridge-emergency-department/',true]
];

export const NYC_EMERGENCY_DATASET_VERSION='2026-09-28.2';

export function expandNycEmergencyLocations(){
  return locations.map(([id,cmsCcn,name,address1,city,postalCode,latitude,longitude,phone,website,pediatric])=>({
    id,externalIds:{cmsCcn},
    identity:{name,organization:name.split(' Emergency')[0],type:'emergency',typeLabel:pediatric?'Adult and pediatric emergency department':'Adult emergency department',pediatricSpecific:pediatric,patientGroups:pediatric?['adult','pediatric']:['adult']},
    location:{address1,city,state:'NY',postalCode,latitude,longitude},contact:{phone,website,bookingUrl:null},
    pediatricAge:{minimumMonths:null,maximumMonths:null,limitsVerified:false},
    capabilities:['illness','breathing','injury','wound','stomach','other'],
    hours:{kind:'always',timezone:'America/New_York',label:'Open 24 hours',weekly:{}},
    highlights:[pediatric?'Adult and pediatric emergency care confirmed':'Adult emergency care confirmed','Emergency department available 24 hours','Official provider and federal records linked'],
    live:{waitMinutes:null,acceptingPatients:null},insurance:{status:'verify',plans:[]},
    quality:{displayScore:null,note:'No comparable public emergency-care quality score is displayed.',sourceUrl:null},
    access:{uninsuredWelcome:true,slidingFee:false,noOneTurnedAway:true,charityCare:false,flatFee:null,languages:[],note:'Federal emergency-care protections require an appropriate medical screening examination regardless of ability to pay. Insurance participation and financial-assistance terms still require verification.',sourceUrl:emtalaSource},
    verification:{status:'verified-with-unknowns',reviewedAt:checkedAt,reviewBy,method:'cms-match-provider-source-and-address-geocode'},
    evidence:[
      {id:`${id}-provider`,url:website,publisher:'Official hospital or health-system website',supports:['identity','location','contact','capabilities','hours','highlights','patientGroups'],checkedAt},
      {id:`${id}-cms`,url:cmsSource,publisher:'Centers for Medicare & Medicaid Services',supports:['identity','location','contact','capabilities','highlights'],checkedAt},
      {id:`${id}-emtala`,url:emtalaSource,publisher:'Centers for Medicare & Medicaid Services',supports:['access'],checkedAt}
    ]
  }));
}
