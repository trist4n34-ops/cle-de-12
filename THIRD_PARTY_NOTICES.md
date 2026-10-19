# Third-party data

The vehicle catalog in `src/data/vehicles-open-data.json` is built by `scripts/build-vehicle-catalog.py` from the open-data snapshot bundled in the npm package [`@meterapp/vehicle-db`](https://www.npmjs.com/package/@meterapp/vehicle-db) (ISC licence). Only make and model names and their years are kept, from these sources:

| Source | Licence |
|---|---|
| European Environment Agency, CO2 emissions from new passenger cars and vans (EU, Iceland, Norway) | [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/) |
| RDW Open Data, Dutch vehicle register | Public domain |
| UK Department for Transport, vehicle licensing statistics | [Open Government Licence v3.0](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/) |

Names were normalised (trim levels and engine variants merged, motorhome converters and commercial-only bodies removed) and merged with a hand-edited selection in `src/data/vehicles.ts`.

To rebuild:

```bash
npm pack @meterapp/vehicle-db && tar -xzf meterapp-vehicle-db-*.tgz
node scripts/dump-vehicle-db.js ./package/dist/index.js > raw.json
python3 scripts/build-vehicle-catalog.py raw.json
```
