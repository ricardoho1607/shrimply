const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function getStoreModule() {
  try {
    return require('./pondStore.ts');
  } catch {
    const cache = new Map();
    function load(file) {
      if (cache.has(file)) return cache.get(file).exports;
      const module = { exports: {} };
      cache.set(file, module);
      const code = fs.readFileSync(file, 'utf8');
      const compiled = ts.transpileModule(code, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
      }).outputText;
      new Function('module', 'exports', 'require', compiled)(module, module.exports, name => {
        if (name.startsWith('.')) {
          const target = path.resolve(path.dirname(file), name.endsWith('.ts') ? name : `${name}.ts`);
          return load(target);
        }
        return require(name);
      });
      return module.exports;
    }
    return load(path.resolve(__dirname, './pondStore.ts'));
  }
}

const { usePondStore, normalizeCycleTechnicianId } = getStoreModule();

function setupStoreWithSync() {
  const syncCycles = [];
  const syncPonds = [];
  const syncPhysicalPonds = [];

  const initialPhysical = {
    id: 'physical-pond-1',
    pondName: 'Pond 1',
    pondArea: 1000,
    status: 'idle',
  };

  usePondStore.getState().clearData();
  usePondStore.setState({
    ponds: [],
    physicalPonds: [initialPhysical],
    cycles: [],
    harvestRecords: [],
    firebaseSync: {
      syncCycle: (action, cycle) => {
        syncCycles.push({ action, cycle: { ...cycle } });
      },
      syncPond: (action, pond) => {
        syncPonds.push({ action, pond: { ...pond } });
      },
      syncPhysicalPond: (action, pond) => {
        syncPhysicalPonds.push({ action, pond: { ...pond } });
      },
    },
  });

  return {
    syncCycles,
    syncPonds,
    syncPhysicalPonds,
    initialPhysical,
  };
}

const samplePond = {
  id: 'pond-cycle-1',
  pondName: 'Pond 1',
  pondArea: 1000,
  density: 30,
  initialPopulation: 30000,
  docStart: '2026-10-10',
  supplier: 'Hatchery A',
  initialWeight: 0.5,
  samplings: [],
};

test('normalizeCycleTechnicianId handles assigned, blank, omitted, and cleared values', () => {
  assert.equal(normalizeCycleTechnicianId('tech-1'), 'tech-1');
  assert.equal(normalizeCycleTechnicianId('  tech-trimmed  '), 'tech-trimmed');
  assert.equal(normalizeCycleTechnicianId(''), null);
  assert.equal(normalizeCycleTechnicianId('   '), null);
  assert.equal(normalizeCycleTechnicianId(null), null);
  assert.equal(normalizeCycleTechnicianId(undefined), undefined);
  assert.equal(normalizeCycleTechnicianId(), undefined);
});

test('addPond: assigned technician creates implicit cycle with normalized assignment and captured sync payload', () => {
  const { syncCycles, syncPonds } = setupStoreWithSync();

  const success = usePondStore.getState().addPond(samplePond, { assignedTechnicianId: 'tech-alpha' });
  assert.equal(success, true);

  const cycles = usePondStore.getState().cycles;
  assert.equal(cycles.length, 1);
  assert.equal(cycles[0].assignedTechnicianId, 'tech-alpha');

  assert.equal(syncCycles.length, 1);
  assert.equal(syncCycles[0].action, 'create');
  assert.equal(syncCycles[0].cycle.assignedTechnicianId, 'tech-alpha');

  const storedPond = usePondStore.getState().ponds[0];
  assert.equal('assignedTechnicianId' in storedPond, false);
  assert.equal(storedPond.assignedTechnicianId, undefined);
  assert.equal(syncPonds.length, 1);
  assert.equal('assignedTechnicianId' in syncPonds[0].pond, false);
});

test('addPond: assigned technician with whitespace trims cleanly', () => {
  const { syncCycles } = setupStoreWithSync();

  const success = usePondStore.getState().addPond(samplePond, { assignedTechnicianId: '  tech-spaced  ' });
  assert.equal(success, true);

  const cycle = usePondStore.getState().cycles[0];
  assert.equal(cycle.assignedTechnicianId, 'tech-spaced');
  assert.equal(syncCycles[0].cycle.assignedTechnicianId, 'tech-spaced');
});

test('addPond: blank technician normalizes to null on implicit cycle', () => {
  const { syncCycles } = setupStoreWithSync();

  const success = usePondStore.getState().addPond(samplePond, { assignedTechnicianId: '   ' });
  assert.equal(success, true);

  const cycle = usePondStore.getState().cycles[0];
  assert.equal(cycle.assignedTechnicianId, null);
  assert.equal(syncCycles.length, 1);
  assert.equal(syncCycles[0].cycle.assignedTechnicianId, null);

  const storedPond = usePondStore.getState().ponds[0];
  assert.equal('assignedTechnicianId' in storedPond, false);
});

test('addPond: omitted technician leaves assignedTechnicianId unassigned on implicit cycle', () => {
  const { syncCycles } = setupStoreWithSync();

  const success = usePondStore.getState().addPond(samplePond);
  assert.equal(success, true);

  const cycle = usePondStore.getState().cycles[0];
  assert.equal(cycle.assignedTechnicianId, undefined);
  assert.equal(syncCycles.length, 1);
  assert.equal(syncCycles[0].cycle.assignedTechnicianId, undefined);

  const storedPond = usePondStore.getState().ponds[0];
  assert.equal('assignedTechnicianId' in storedPond, false);
});

test('addPond: cleared technician (null) sets assignedTechnicianId to null on implicit cycle', () => {
  const { syncCycles } = setupStoreWithSync();

  const success = usePondStore.getState().addPond(samplePond, { assignedTechnicianId: null });
  assert.equal(success, true);

  const cycle = usePondStore.getState().cycles[0];
  assert.equal(cycle.assignedTechnicianId, null);
  assert.equal(syncCycles.length, 1);
  assert.equal(syncCycles[0].cycle.assignedTechnicianId, null);

  const storedPond = usePondStore.getState().ponds[0];
  assert.equal('assignedTechnicianId' in storedPond, false);
});

test('addPond: never modifies existing cycle assignment and never emits cycle sync', () => {
  const { syncCycles, syncPonds } = setupStoreWithSync();

  const existingCycle = {
    id: 'cycle-existing-1',
    cycleName: 'Cycle 1',
    status: 'active',
    assignedTechnicianId: 'tech-original-permanent',
  };
  usePondStore.setState({ cycles: [existingCycle] });

  const success = usePondStore.getState().addPond(samplePond, { assignedTechnicianId: 'tech-should-not-override' });
  assert.equal(success, true);

  const cycles = usePondStore.getState().cycles;
  assert.equal(cycles.length, 1);
  assert.equal(cycles[0].id, 'cycle-existing-1');
  assert.equal(cycles[0].assignedTechnicianId, 'tech-original-permanent');

  // No syncCycle calls emitted when attaching to existing cycle
  assert.equal(syncCycles.length, 0);

  // Added pond links to existing cycle but has no technician on itself
  const storedPond = usePondStore.getState().ponds[0];
  assert.equal(storedPond.cycleId, 'cycle-existing-1');
  assert.equal('assignedTechnicianId' in storedPond, false);
  assert.equal(syncPonds.length, 1);
  assert.equal('assignedTechnicianId' in syncPonds[0].pond, false);
});

test('addPond: preserves existing cycle assignment when existing cycle has null technician', () => {
  const { syncCycles } = setupStoreWithSync();

  const existingCycle = {
    id: 'cycle-existing-unassigned',
    cycleName: 'Unassigned Cycle',
    status: 'stocking',
    assignedTechnicianId: null,
  };
  usePondStore.setState({ cycles: [existingCycle] });

  const success = usePondStore.getState().addPond(samplePond, { assignedTechnicianId: 'tech-override-attempt' });
  assert.equal(success, true);

  const cycles = usePondStore.getState().cycles;
  assert.equal(cycles.length, 1);
  assert.equal(cycles[0].assignedTechnicianId, null);
  assert.equal(syncCycles.length, 0);
});


test('addFarmCycle: assigned technician normalizes and captures sync payload', () => {
  const { syncCycles } = setupStoreWithSync();

  const cycle = usePondStore.getState().addFarmCycle({
    cycleName: 'Cycle Production A',
    assignedTechnicianId: 'tech-farm-lead',
  });

  assert.equal(cycle.assignedTechnicianId, 'tech-farm-lead');
  assert.equal(syncCycles.length, 1);
  assert.equal(syncCycles[0].action, 'create');
  assert.equal(syncCycles[0].cycle.assignedTechnicianId, 'tech-farm-lead');
});

test('addFarmCycle: assigned technician with whitespace normalizes cleanly', () => {
  const { syncCycles } = setupStoreWithSync();

  const cycle = usePondStore.getState().addFarmCycle({
    cycleName: 'Cycle Production B',
    assignedTechnicianId: '   tech-farm-lead-spaced   ',
  });

  assert.equal(cycle.assignedTechnicianId, 'tech-farm-lead-spaced');
  assert.equal(syncCycles[0].cycle.assignedTechnicianId, 'tech-farm-lead-spaced');
});

test('addFarmCycle: blank technician normalizes to null and captures sync payload', () => {
  const { syncCycles } = setupStoreWithSync();

  const cycle = usePondStore.getState().addFarmCycle({
    cycleName: 'Cycle Production C',
    assignedTechnicianId: '   ',
  });

  assert.equal(cycle.assignedTechnicianId, null);
  assert.equal(syncCycles.length, 1);
  assert.equal(syncCycles[0].cycle.assignedTechnicianId, null);
});

test('addFarmCycle: omitted technician leaves assignedTechnicianId undefined', () => {
  const { syncCycles } = setupStoreWithSync();

  const cycle = usePondStore.getState().addFarmCycle({
    cycleName: 'Cycle Production D',
  });

  assert.equal(cycle.assignedTechnicianId, undefined);
  assert.equal(syncCycles.length, 1);
  assert.equal(syncCycles[0].cycle.assignedTechnicianId, undefined);
});

test('addFarmCycle: cleared technician (null) captures null sync payload', () => {
  const { syncCycles } = setupStoreWithSync();

  const cycle = usePondStore.getState().addFarmCycle({
    cycleName: 'Cycle Production E',
    assignedTechnicianId: null,
  });

  assert.equal(cycle.assignedTechnicianId, null);
  assert.equal(syncCycles.length, 1);
  assert.equal(syncCycles[0].cycle.assignedTechnicianId, null);
});
