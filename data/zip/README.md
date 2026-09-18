# U.S. ZIP lookup data

These ten shards contain five-digit U.S. postal-code records generated from the GeoNames datasets for the United States, U.S. territories, Micronesia, the Marshall Islands, and Palau on September 18, 2026. Each record contains a place name, jurisdiction code, and approximate latitude/longitude used for state synchronization and routing origin.

Source: [GeoNames postal-code data](https://download.geonames.org/export/zip/)

License: [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/). GeoNames provides the data as-is without a warranty of accuracy, timeliness, or completeness.

Regenerate with:

```sh
ruby scripts/build-zip-shards.rb US.txt,PR.txt,VI.txt,GU.txt,AS.txt,MP.txt,FM.txt,MH.txt,PW.txt data/zip
```
