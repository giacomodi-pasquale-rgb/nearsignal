export const DATASET_VERSION = '2026-09-27.1';

const checkedAt = '2026-08-30';
const reviewBy = '2026-11-30';
const dynamicHours = { kind: 'live', timezone: 'America/New_York', label: 'Check the provider page or call for today’s hours', weekly: {} };
const standardQuality = { displayScore: null, note: 'No comparable public urgent-care quality measure found.', sourceUrl: null };

const networks = {
  brown: {
    organization: 'Brown University Health', name: 'Brown University Health Urgent Care', publisher: 'Brown University Health',
    typeLabel: 'Adult and child urgent care', patientGroups: ['adult', 'pediatric'], pediatricSpecific: false,
    capabilities: ['illness', 'breathing', 'injury', 'wound', 'stomach'],
    highlights: ['Walk-in care for adults and children', 'Treatment for minor illness and injury', 'Provider publishes weekday and weekend hours'],
    hours: { kind: 'weekly', timezone: 'America/New_York', label: 'Mon–Fri 8am–8pm; Sat–Sun 8am–6pm', weekly: { 0:[480,1080], 1:[480,1200], 2:[480,1200], 3:[480,1200], 4:[480,1200], 5:[480,1200], 6:[480,1080] } },
    source: 'https://www.brownhealth.org/centers-services/urgent-care'
  },
  wellspan: {
    organization: 'WellSpan Health', name: 'WellSpan Urgent Care', publisher: 'WellSpan Health',
    typeLabel: 'Adult and child urgent care', patientGroups: ['adult', 'pediatric'], pediatricSpecific: false,
    capabilities: ['illness', 'injury', 'wound', 'stomach'],
    highlights: ['Walk-in care for minor illness and injury', 'Treats cuts, burns, sprains and stomach illness', 'Pediatric service limits should be confirmed before travel'],
    hours: dynamicHours, source: 'https://www.wellspan.org/Conditions-And-Treatments/Urgent-Care'
  },
  uvm: {
    organization: 'The University of Vermont Health Network', name: 'UVM Health Network ExpressCare', publisher: 'The University of Vermont Health Network',
    typeLabel: 'Adult and child urgent care', patientGroups: ['adult', 'pediatric'], pediatricSpecific: false,
    capabilities: ['illness', 'injury', 'wound', 'stomach'],
    highlights: ['Same-day walk-in care without an appointment', 'Clinicians have pediatrics, family or emergency-care experience', 'Treats minor illness, wounds and injuries'],
    hours: dynamicHours, source: 'https://www.uvmhealth.org/conditions-specialties/urgent-expresscare'
  },
  maine: {
    organization: 'MaineHealth', name: 'MaineHealth Walk-In Care', publisher: 'MaineHealth',
    typeLabel: 'Adult and child walk-in care', patientGroups: ['adult', 'pediatric'], pediatricSpecific: false,
    capabilities: ['illness', 'injury', 'wound', 'stomach'],
    highlights: ['Walk-in care for minor, non-life-threatening illness and injury', 'Adult and pediatric care availability published by the provider', 'Call or check online before travel'],
    hours: dynamicHours, source: 'https://www.mainehealth.org/care-services/urgent-care-walk-care/walk-care'
  },
  pm: {
    organization: 'PM Pediatric Care', name: 'PM Pediatric Urgent Care', publisher: 'PM Pediatric Care',
    typeLabel: 'Pediatric urgent care', patientGroups: ['pediatric'], pediatricSpecific: true,
    capabilities: ['illness', 'breathing', 'injury', 'wound', 'stomach'],
    highlights: ['Treats ages 0–26', 'X-ray, splinting, lab testing, stitches and breathing treatments', 'Walk-ins accepted; online check-in available'],
    hours: dynamicHours
  },
  yale: {
    organization: 'Yale New Haven Health', name: 'Yale New Haven Health Urgent Care', publisher: 'Yale New Haven Health',
    typeLabel: 'Adult and child urgent care', patientGroups: ['adult', 'pediatric'], pediatricSpecific: false,
    capabilities: ['illness', 'injury', 'wound', 'stomach'],
    highlights: ['Urgent care for adults and children', 'Treatment for illness, minor wounds, strains and burns', 'On-site X-ray services published'],
    hours: dynamicHours
  }
};

// id, network, address, city, state, ZIP, latitude, longitude, phone, provider page
const locations = [
 ['brown-barrington','brown','236 County Road, Suite C','Barrington','RI','02806',41.738376503209,-71.306107056731,'4016063550'],
 ['brown-johnston','brown','11 Commerce Way, Unit 5','Johnston','RI','02919',41.820319483977,-71.498826074933,'4016062610'],
 ['brown-middletown','brown','1360 West Main Road','Middletown','RI','02842',41.536680865009,-71.292141705952,'4016063110'],
 ['brown-warwick','brown','17 Airport Road','Warwick','RI','02889',41.733476417294,-71.407845127768,'4016062520'],
 ['wellspan-annville','wellspan','9 Nathan Lane','Annville','PA','17003',40.325467270019,-76.536442589265,'7176393350'],
 ['wellspan-chambersburg','wellspan','1000 Norland Avenue','Chambersburg','PA','17201',39.9391317,-77.626336,'7172676363'],
 ['wellspan-ephrata','wellspan','446 North Reading Road','Ephrata','PA','17522',40.195467829426,-76.171247610218,'7177214301'],
 ['wellspan-gettysburg','wellspan','455 South Washington Street','Gettysburg','PA','17325',39.824400522137,-77.233320245716,'7173392875'],
 ['wellspan-greencastle','wellspan','24 Antrim Commons Drive','Greencastle','PA','17225',39.758745085724,-77.72813311243,'7175930512'],
 ['wellspan-hanover','wellspan','100 Eisenhower Drive','Hanover','PA','17331',39.823115879456,-76.99865852568,'7176464201'],
 ['wellspan-manchester','wellspan','4050 North George Street Extension','Manchester','PA','17345',40.041838712078,-76.72534034435,'7173564370'],
 ['wellspan-shippensburg','wellspan','46 Walnut Bottom Road','Shippensburg','PA','17257',40.058736706157,-77.503630235381,'7174772764'],
 ['uvm-berlin','uvm','1311 Barre-Montpelier Road, Suite 200','Berlin','VT','05602',44.2265604,-72.5527367,'8023714239'],
 ['uvm-middlebury','uvm','115 Porter Drive','Middlebury','VT','05753',43.999314851672,-73.169140888223,'8023885678'],
 ['maine-brunswick','maine','22 Station Avenue, Suite 102','Brunswick','ME','04011',43.911446787425,-69.964175829115,'2074067500','https://www.mainehealth.org/locations/mainehealth-walk-care-brunswick'],
 ['maine-saco','maine','655 Main Street','Saco','ME','04072',43.514330170774,-70.429720960473,'2072945600','https://www.mainehealth.org/locations/mainehealth-walk-care-saco'],
 ['maine-sanford','maine','25A June Street','Sanford','ME','04073',43.44840936989,-70.767132952235,'2074907900','https://www.mainehealth.org/locations/mainehealth-walk-care-sanford'],
 ['maine-kennebunk','maine','2 Livewell Drive','Kennebunk','ME','04043',43.3939338,-70.5278273,'2074676900','https://www.mainehealth.org/locations/mainehealth-walk-care-kennebunk'],
 ['maine-rockland','maine','75 Maverick Street, Suite 6','Rockland','ME','04841',44.115221517491,-69.104288912874,'2073016000','https://www.mainehealth.org/locations/mainehealth-walk-care-rockland'],
 ['maine-damariscotta','maine','24 Miles Center Way','Damariscotta','ME','04543',44.0253946,-69.531092,'2075634379','https://www.mainehealth.org/locations/mainehealth-walk-care-damariscotta'],
 ['maine-belfast','maine','119 Northport Avenue, Floor 1','Belfast','ME','04915',44.412973019599,-68.995271618788,'2075054567','https://www.mainehealth.org/locations/mainehealth-primary-care-and-walk-care-belfast'],
 ['maine-east-waterboro','maine','10 Goodall Drive, Suite 900','East Waterboro','ME','04030',43.5709528,-70.678857,'2074907760','https://www.mainehealth.org/locations/mainehealth-walk-care-east-waterboro'],
 ['pm-brick','pm','990 Cedar Bridge Avenue, Suite A01A','Brick','NJ','08723',40.053919920818,-74.13825239599,'7324775437','https://pmpediatriccare.com/location/new-jersey-brick/'],
 ['pm-cherry-hill','pm','828 Haddonfield Road','Cherry Hill','NJ','08002',39.926626107064,-75.032563162,'8566635437','https://pmpediatriccare.com/location/cherry-hill/'],
 ['pm-holmdel','pm','2107 Route 35','Holmdel','NJ','07733',40.413262425183,-74.14361400257,'7327065437','https://pmpediatriccare.com/location/new-jersey-holmdel/'],
 ['pm-north-brunswick','pm','2421 US Route 1','North Brunswick','NJ','08902',40.44214000946,-74.505643991058,'7322976767','https://pmpediatriccare.com/location/new-jersey-north-brunswick/'],
 ['pm-pompton-plains','pm','562 NJ-23','Pompton Plains','NJ','07444',40.969622312565,-74.286029913596,'9736165437','https://pmpediatriccare.com/location/new-jersey-pompton-plains/'],
 ['pm-forest-hills','pm','70-20 Austin Street','Forest Hills','NY','11375',40.720537364262,-73.845995193197,'7182684767','https://pmpediatriccare.com/location/pm-pediatrics-new-york-city-forest-hills/'],
 ['pm-yonkers','pm','2290 Central Park Avenue','Yonkers','NY','10710',40.975592867393,-73.832575414726,'9143375437','https://pmpediatriccare.com/location/pm-pediatrics-westchester-yonkers/'],
 ['pm-riverdale','pm','5740 Broadway, Unit E','Bronx','NY','10463',40.882880086592,-73.901916267227,'9299205437','https://pmpediatriccare.com/location/bronx-riverdale/'],
 ['pm-bellerose','pm','253-11 Hillside Avenue','Bellerose','NY','11426',40.736044403102,-73.714595659984,'9294385437','https://pmpediatriccare.com/location/new-york-bellerose/'],
 ['pm-hopewell-junction','pm','1983 Route 52','Hopewell Junction','NY','12533',41.541300602682,-73.83593474023,'8458974500','https://pmpediatriccare.com/location/pm-pediatrics-dutchess-hopewell-junction/'],
 ['yale-newtown','yale','266 South Main Street','Newtown','CT','06470',41.370716729175,-73.271757947627,'8606503848','https://www.ynhhs.org/locations/newtown-266-south-main-street-urgent-care'],
 ['yale-southbury','yale','900 Main Street South, Building 2 Suite 100','Southbury','CT','06488',41.460378710674,-73.235157009253,'8606503848','https://www.ynhhs.org/locations/southbury-900-south-main-street-south-urgent-care'],
 ['yale-groton','yale','220 Route 12','Groton','CT','06340',41.369823048421,-72.070970575421,'8606503848','https://www.ynhhs.org/locations/groton-220-route-12-urgent-care'],
 ['yale-fairfield','yale','340 Grasmere Avenue','Fairfield','CT','06824',41.158214725564,-73.242886177153,'8606503848','https://www.ynhhs.org/locations/fairfield-340-grasmere-ave-urgent-care'],
 ['yale-norwich','yale','607 West Main Street','Norwich','CT','06360',41.51611129171,-72.100756812664,'8606503848','https://www.ynhhs.org/locations/norwich-607-west-main-street-urgent-care'],
 ['yale-norwalk','yale','346 Main Avenue','Norwalk','CT','06851',41.138529532229,-73.426024365323,'8606503848','https://www.ynhhs.org/locations/norwalk-346-main-ave-urgent-care'],
 ['yale-ridgefield','yale','10 South Street, Suite 101','Ridgefield','CT','06877',41.290539809375,-73.494741383917,'8606503848','https://www.ynhhs.org/locations/ridgefield-10-south-street-urgent-care'],
 ['yale-branford','yale','349 East Main Street, Suite 101','Branford','CT','06405',41.294821443992,-72.782478135634,'8606503848','https://www.ynhhs.org/locations/branford-349-east-main-street-urgent-care'],
 ['yale-somers','yale','80 Route 6, Suite 704-705','Somers','NY','10505',41.344865306856,-73.757546149976,'8606503848','https://www.ynhhs.org/locations/somers-80-route-6-urgent-care']
];

export function expandUrgentCareLocations() {
  return locations.map(([id, networkId, address1, city, state, postalCode, latitude, longitude, phone, page]) => {
    const network = networks[networkId];
    const website = page || network.source;
    const pediatricAge = network.pediatricSpecific
      ? { minimumMonths: 0, maximumMonths: 312, limitsVerified: true }
      : { minimumMonths: null, maximumMonths: null, limitsVerified: false };
    return {
      id,
      identity: { name: network.name, organization: network.organization, type: 'urgent-care', typeLabel: network.typeLabel, pediatricSpecific: network.pediatricSpecific, patientGroups: network.patientGroups },
      location: { address1, city, state, postalCode, latitude, longitude },
      contact: { phone, website, bookingUrl: website },
      pediatricAge,
      capabilities: network.capabilities,
      hours: network.hours,
      highlights: network.highlights,
      live: { waitMinutes: null, acceptingPatients: null },
      insurance: { status: 'verify', plans: [] },
      quality: standardQuality,
      verification: { status: 'verified-with-unknowns', reviewedAt: checkedAt, reviewBy, method: 'authoritative-provider-source-and-public-geocoder' },
      evidence: [{ id: `${id}-provider`, url: website, publisher: network.publisher, supports: ['identity','location','contact','capabilities','highlights', ...(network.pediatricSpecific ? ['pediatricAge'] : [])], checkedAt }]
    };
  });
}
