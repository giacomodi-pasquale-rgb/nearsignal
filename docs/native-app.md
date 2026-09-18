# Native application path

NearSignal is now an installable Progressive Web App. The Capacitor configuration reserves `org.nearsignal.health` as the native bundle identifier and lets the reviewed web experience become iOS and Android projects.

Before generating store projects:

1. Move deployable web files into a dedicated `www` build directory and update `webDir`.
2. Add Capacitor dependencies and generate `ios/` and `android/` on a release branch.
3. Configure iOS location usage text and Android fine/coarse location permissions.
4. Use universal/app links and platform map apps for navigation.
5. Complete privacy disclosures, accessibility and clinical/legal review.
6. Enroll in Apple Developer and Google Play Console, then configure signing and staged testing.

Generated Xcode and Gradle projects are intentionally deferred until bundle ownership, signing accounts, privacy language, and the production API domain are fixed.
