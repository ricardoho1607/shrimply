/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const ts = require('typescript');

const webRoot = path.join(__dirname, '..', '..');
const validationScript = path.join(webRoot, 'scripts', 'validate-public-env.cjs');

function loadGooglePlacesClient() {
  const source = fs.readFileSync(path.join(webRoot, 'src/lib/googlePlacesClient.ts'), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const compiledModule = { exports: {} };
  const load = new Function('require', 'module', 'exports', 'process', output);
  load(require, compiledModule, compiledModule.exports, process);
  return compiledModule.exports;
}

function runValidation(apiKey) {
  const env = { ...process.env };
  env.SHRIMPLY_SKIP_DOTENV = '1';
  if (apiKey === undefined) delete env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
  else env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY = apiKey;

  return spawnSync(process.execPath, [validationScript], {
    cwd: webRoot,
    env,
    encoding: 'utf8',
  });
}

test('production build rejects a missing Google Places browser key', () => {
  const result = runValidation(undefined);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /NEXT_PUBLIC_GOOGLE_PLACES_API_KEY/);
});

test('production build accepts a configured Google Places browser key', () => {
  const result = runValidation('test-google-places-key');

  assert.equal(result.status, 0, result.stderr);
});

test('location search uses Places API New and returns selectable city details', async (t) => {
  const originalWindow = global.window;
  t.after(() => {
    global.window = originalWindow;
  });

  let autocompleteRequest;
  let requestedFields;
  const selectedPlace = {
    id: 'jakarta-place-id',
    formattedAddress: 'Jakarta, Indonesia',
    displayName: 'Jakarta',
    location: { lat: () => -6.1944, lng: () => 106.8229 },
    addressComponents: [
      { longText: 'Jakarta', types: ['locality'] },
      { longText: 'Special Capital Region of Jakarta', types: ['administrative_area_level_1'] },
      { longText: 'Indonesia', types: ['country'] },
    ],
    async fetchFields({ fields }) {
      requestedFields = fields;
    },
  };
  const prediction = {
    placeId: 'jakarta-place-id',
    text: { text: 'Jakarta, Indonesia' },
    mainText: { text: 'Jakarta' },
    secondaryText: { text: 'Indonesia' },
    toPlace: () => selectedPlace,
  };
  class AutocompleteSessionToken {}
  const placesLibrary = {
    AutocompleteSessionToken,
    AutocompleteSuggestion: {
      async fetchAutocompleteSuggestions(request) {
        autocompleteRequest = request;
        return { suggestions: [{ placePrediction: prediction }] };
      },
    },
    Place: class Place {},
  };
  global.window = {
    google: {
      maps: {
        importLibrary: async (name) => {
          assert.equal(name, 'places');
          return placesLibrary;
        },
      },
    },
  };

  const client = loadGooglePlacesClient();
  const suggestions = await client.searchCityLocations('Jakarta');
  assert.deepEqual(suggestions, [{
    placeId: 'jakarta-place-id',
    description: 'Jakarta, Indonesia',
    mainText: 'Jakarta',
    secondaryText: 'Indonesia',
  }]);
  assert.deepEqual(autocompleteRequest.input, 'Jakarta');
  assert.deepEqual(autocompleteRequest.includedPrimaryTypes, ['(cities)']);
  assert.ok(autocompleteRequest.sessionToken instanceof AutocompleteSessionToken);

  const location = await client.getLocationDetails('jakarta-place-id');
  assert.deepEqual(location, {
    address: 'Jakarta, Indonesia',
    latitude: -6.1944,
    longitude: 106.8229,
    city: 'Jakarta',
    state: 'Special Capital Region of Jakarta',
    country: 'Indonesia',
    placeId: 'jakarta-place-id',
  });
  assert.equal(Object.hasOwn(location, 'postalCode'), false);
  assert.deepEqual(requestedFields, [
    'id',
    'displayName',
    'formattedAddress',
    'location',
    'addressComponents',
  ]);
});

test('farm timezone follows the selected city coordinates', async (t) => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
  t.after(() => {
    global.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
    else process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY = originalApiKey;
  });

  process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY = 'timezone-test-key';
  let requestedUrl = '';
  global.fetch = async (url) => {
    requestedUrl = String(url);
    return {
      ok: true,
      async json() {
        return { status: 'OK', timeZoneId: 'Asia/Makassar' };
      },
    };
  };

  const client = loadGooglePlacesClient();
  const timeZone = await client.getLocationTimeZone(
    -5.1477,
    119.4327,
    new Date('2026-09-12T00:00:00.000Z'),
  );

  assert.equal(timeZone, 'Asia/Makassar');
  assert.match(requestedUrl, /location=-5\.1477,119\.4327/);
  assert.match(requestedUrl, /timestamp=1789171200/);
  assert.match(requestedUrl, /key=timezone-test-key/);
});
