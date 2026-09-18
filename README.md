# NearSignal v0.8 Urgent & Emergency Navigation

NearSignal is a production-oriented, mobile-first foundation for national care navigation for adults and children. Its decision-ready network began in the Northeast and now includes a rigorously reviewed CommonSpirit access cohort in six additional states; the data-operations layer seeds a nationwide evidence review queue.

## What is real

- 106 decision-ready adult and/or pediatric emergency, urgent-care, or community health-center locations, including a seven-location CommonSpirit release batch
- A focused urgent-care-versus-emergency pathway with separate adult and pediatric eligibility and safety gates
- A 25-location CommonSpirit fragmentation-priority cohort spanning Arkansas, Arizona, California, Georgia, Kentucky, and Nevada, with unresolved evidence kept visibly separate from decision-ready recommendations
- A national evidence foundation of 22,292 official federal records: 4,495 CMS emergency-hospital candidates and 17,797 active HRSA health-center service-site candidates
- A state-sharded National Discovery Layer that makes all 22,292 official records searchable without relabeling them as patient recommendations
- Complete patient-facing navigation in English, Spanish, Portuguese, and Haitian Creole, including questionnaire screens, live status messages, results, access badges, explanations, and translated summaries of provider-sourced details; professional translation review remains required before a clinical release
- Optional uninsured, low-cost, and language-support needs without weakening emergency safety gates
- Verified FQHC access labels for insurance-free entry, income-based sliding fees, and no-denial-for-lack-of-funds policies
- A translated cost-access guide distinguishing FQHC full discounts or nominal charges, NJ hospital Charity Care, and service-specific published flat fees
- Provider-sourced identity, address, phone, care setting, adult/child population, services, and published hours
- Browser geolocation, with location kept in memory only
- Optional five-digit ZIP lookup as an alternative to browser geolocation, backed by 41,202 bundled postal records covering every jurisdiction in the national menu so state selection and approximate routing work without sending the ZIP to a third-party lookup service
- Sourced road-network distance, drive duration, and estimated arrival time, including explicit provider, timestamp, and traffic-awareness status
- Conservative emergency gating: adult emergency searches show verified adult EDs; child searches require pediatric-specific emergency capability
- Direct provider-source, calling, and navigation links

No wait time, insurance acceptance, price, clinical recommendation, or invented quality score is displayed. Dynamic or unavailable fields are labeled as such. New Jersey hospital-quality reporting is linked where applicable but is not transformed into a pediatric emergency-care rating.

## Platform foundation

`data/v1/facilities.json` is the canonical, versioned dataset. Every facility includes structured identity, location, age limits, capabilities, hours, explicit unavailable/live-only fields, verification status, review deadlines, and claim-level evidence. `data/facilities.js` is generated from that source for GitHub Pages and must not be edited by hand.

The production contract now also includes:

- `db/migrations/001_initial.sql`: normalized PostgreSQL schema for facilities, locations, capabilities, hours, evidence, and revision history
- `api/openapi.yaml`: initial read-only mobile/web API contract
- `docs/routing.md`: staged routing design from the OSRM pilot to server-side traffic-aware production routing
- `server/`: validated Google traffic-aware routing gateway with an explicitly labeled OSRM fallback
- `service-worker.js` and `manifest.webmanifest`: installable/offline-safe PWA shell
- `capacitor.config.json` and `docs/native-app.md`: native iOS/Android packaging path
- `scripts/validate-data.mjs`: release-blocking data and safety validation
- `scripts/build-web-data.mjs`: deterministic canonical-data-to-web adapter
- `scripts/import-cms-hospitals.mjs`: converts the official CMS Hospital General Information CSV into non-publishable review candidates; CMS records never establish pediatric capability by themselves
- `scripts/import-hrsa-health-centers.mjs`: converts the free official HRSA service-site CSV into non-publishable affordability-network candidates; HRSA inclusion never establishes exact services, price, hours, or pediatric capability by itself
- `scripts/reconcile-national.mjs`: reconciles the national emergency-hospital inventory and produces jurisdiction-level coverage reporting
- `scripts/build-evidence-network.mjs`: creates the compact three-tier national proof summary displayed on the website and reviewer dashboard
- `tests/data-validation.test.mjs`: automated checks against invented waits, insurance claims, quality scores, stale records, and unsafe emergency records

### Development checks

Use Node.js 20 or newer:

```sh
npm run validate:data
npm run build:data
npm test
```

Any future facility expansion should update the canonical JSON (or, once deployed, the PostgreSQL/API layer), attach evidence, pass review, and regenerate the web artifact. The validator intentionally fails releases containing stale verification, unsupported capabilities, missing evidence, invented wait times, unverified insurance plans, or unapproved comparative quality scores.

To seed a state review queue from the official CMS download:

```sh
npm run import:cms -- HOSPITAL_GENERAL_INFORMATION.csv work/nj-candidates.json NJ
```

The resulting candidates are deliberately marked `publishable: false`. A reviewer must verify hours, adult/child population, coordinates, and location-level service evidence before promotion into the patient dataset.

To refresh the national affordable-care candidate layer from HRSA's free daily CSV export:

```sh
npm run import:hrsa -- Health_Center_Service_Delivery_and_LookAlike_Sites.csv
npm run build:network
```

NearSignal uses three explicit evidence tiers: **officially indexed**, **evidence enriched**, and **decision-ready**. The first two are operational research queues and remain invisible in patient results. Only decision-ready records that pass the release-blocking data checks are published.

The national queue is available at `review.html`. It shows the 22,292-record expansion foundation and the CMS hospital review workflow while keeping the 106 decision-ready records visibly distinct. The patient experience also presents a 25-location CommonSpirit fragmentation-priority cohort: seven cleared locations participate in recommendations, while 18 remain explicitly marked “confirm before travel” until their remaining location-level evidence gaps are resolved. This operational view is explicitly not a patient directory.

Data reviewed: September 14, 2026.

### Primary facility sources

- [Cooperman Barnabas Pediatric Emergency Services](https://www.rwjbh.org/cooperman-barnabas-medical-center/treatment-care/emergency-department/pediatric-emergency-services/)
- [Newark Beth Israel Emergency Services](https://www.rwjbh.org/newark-beth-israel-medical-center/treatment-care/emergency-room-services/)
- [University Hospital Pediatric Emergency Medicine](https://www.uhnj.org/services/emergency-medicine/pediatric-emergency-medicine/)
- [Clara Maass Pediatric Services](https://www.rwjbh.org/clara-maass-medical-center/treatment-care/pediatrics/) and [Emergency Services](https://www.rwjbh.org/clara-maass-medical-center/treatment-care/emergency-room-services/)
- [Children’s Hospital of Philadelphia Emergency Department](https://www.chop.edu/locations/emergency-department-main-hospital)
- [NewYork-Presbyterian Pediatric Emergency Care and Trauma](https://www.nyp.org/pediatrics/emergency-care-and-trauma)
- [Boston Children’s Hospital Emergency Medicine](https://cecourses.childrenshospital.org/graduate-medical-education/trainings-programs/division-of-emergency-medicine/)
- [Yale New Haven Children’s Hospital Emergency Services](https://www.ynhh.org/childrens-hospital/services/emergency-services)
- [MaineHealth Maine Medical Center Pediatric Emergency Care](https://www.mainehealth.org/care-services/pediatric-care-child-health/pediatric-emergency-care)
- [Dartmouth Health Children’s Pediatric Emergency Medicine](https://childrens.dartmouth-health.org/emergency-medicine)
- [University of Vermont Medical Center Emergency Department](https://www.uvmhealth.org/locations/emergency-department-university-of-vermont-medical-center)
- [Hasbro Children’s Hospital Emergency Services](https://www.brownhealth.org/centers-services/emergency-services-hasbro-childrens)
- [K. Hovnanian Children’s Hospital Emergency Care](https://www.hackensackmeridianhealth.org/en/services/childrens-health/childrens-emergency-care)
- [Goryeb Children’s Hospital Emergency Department](https://www.atlantichealth.org/locations/goryeb-childrens-hospital/emergency-department)
- [Bristol Myers Squibb Children’s Hospital Emergency Services](https://www.rwjbh.org/bristol-myers-squibb-childrens-hospital-at-rwjuh/treatment-care/emergency-room-services/)
- [Overlook Medical Center Pediatric Emergency Department](https://www.atlantichealth.org/locations/overlook-medical-center/pediatric-emergency-department)
- [St. Joseph’s Children’s Hospital Pediatric Emergency Medicine](https://stjosephshealth.org/health-services/pediatrics/pediatric-emergency-medicine/)
- [NewYork-Presbyterian Morgan Stanley Children’s Emergency Care](https://www.nyp.org/morganstanley/clinical-services/emergency-care-and-trauma)
- [NYU Langone KiDS Emergency Department](https://nyulangone.org/locations/kids-emergency-department)
- [Stony Brook Children’s Emergency Medicine](https://www.stonybrookchildrens.org/pediatric-care/emergency-medicine)
- [Maria Fareri Children’s Hospital Pediatric Trauma](https://www.wmchealth.org/service-line/pediatric-services/pediatric-trauma)
- [UPMC Children’s Hospital of Pittsburgh Emergency Department](https://www.chp.edu/locations/emergency-department)
- [Massachusetts General Hospital Pediatric Emergency Medicine](https://www.massgeneral.org/children/emergency-medicine)
- [Connecticut Children’s Emergency Medicine](https://www.connecticutchildrens.org/specialties-conditions/emergency-medicine)
- [Stamford Hospital Emergency Department](https://www.stamfordhealth.org/locations/ct/stamford/stamford-hospital-emergency-department/11142653/)
- [Saint Francis Hospital Emergency Department](https://www.trinityhealthofne.org/location/saint-francis-emergency-department)
- [Bridgeport Hospital](https://www.ynhhs.org/locations/bridgeport-267-grant-street)
- [Yale New Haven Hospital York Street Campus](https://www.ynhhs.org/locations/new-haven-20-york-street)
- [Albany Medical Center Emergency Department](https://www.albanymed.org/location/albany-medical-center-emergency-department/)
- [Hospital of the University of Pennsylvania Emergency Department](https://www.pennmedicine.org/locations/hospital-of-the-university-of-pennsylvania/getting-around)
- [Northern Light Eastern Maine Medical Center Emergency Care](https://northernlighthealth.org/Our-System/Eastern-Maine-Medical-Center/Locations/Emergency-Care)
- [Elliot Hospital Emergency and Trauma Care](https://www.elliothospital.org/about-us/newsroom/news/j-and-leslie-roberto-share-their-story-life-saving-care-elliot-hospital)
- [Central Vermont Medical Center Emergency Department](https://www.uvmhealth.org/locations/emergency-department-uvm-health-central-vermont-medical-center)
- [Rhode Island Hospital Emergency Services](https://www.brownhealth.org/centers-services/emergency-services-rhode-island-hospital)
- [PM Pediatric Livingston](https://pmpediatriccare.com/location/new-jersey-livingston/)
- [AFC West Orange Pediatric Care](https://www.afcurgentcare.com/west-orange/patient-services/pediatric-care/) and [hours/contact](https://www.afcurgentcare.com/west-orange/resources/contact-us/)
- [Summit Health Livingston Urgent Care](https://www.summithealth.com/locations/livingston-summit-health-urgent-care)
- [NJ Department of Health Hospital Performance Report](https://web.doh.nj.gov/apps2/hpr/hospitals.aspx)
- Coordinates: [OpenStreetMap contributors](https://www.openstreetmap.org/copyright)
- ZIP place names and approximate coordinates: [GeoNames postal-code data](https://www.geonames.org/), used under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

## Run locally

Serve the directory over HTTP so browser geolocation and routing behave normally:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Production path

The traffic gateway uses `ROUTING_PROVIDER=google`, a server-only `GOOGLE_ROUTES_API_KEY`, and `CAREROUTE_ALLOWED_ORIGIN` for the web origin. The client should be switched from OSRM to the NearSignal API only after that gateway has TLS, monitoring, quotas, budget alerts, and a stable domain. Raw origins are not logged or persisted by the included server.

The GitHub Pages version is a useful pilot, not a complete clinical product. A production release needs a governed database and update workflow, commercial routing with traffic/SLA, authenticated provider and insurer feeds, monitoring, analytics with consent, privacy/security review, accessibility and clinical safety validation, legal/regulatory review, and operational ownership. Native iOS/Android can share the dataset/API and scoring contract, then add native location, maps, notifications, secure storage, and app-store distribution.
