import type { ParameterKnowledge } from './knowledgeTypes';

const sourceIds = ['shrimply-vannamei-water-quality-v1', 'fao-srac-anchor'];

export const WATER_QUALITY_KNOWLEDGE: ParameterKnowledge[] = [
  {
    id: 'dissolved_oxygen',
    domain: 'water_quality',
    label: 'Dissolved oxygen',
    aliases: ['do', 'd.o.', 'dissolved oxygen', 'oxygen'],
    target: '>= 5 mg/L',
    warning: '4.0-4.9 mg/L',
    critical: '< 4.0 mg/L; emergency below 3.0 mg/L',
    evidenceBase: 'Low DO is the highest-priority acute stressor because it can reduce feeding, weaken molting, increase disease susceptibility, and cause mortality.',
    actions: {
      increase: [
        'Increase aeration immediately, especially before sunrise.',
        'Check aerator coverage and equipment function.',
        'Reduce or pause feeding until DO stabilizes.',
        'Inspect sludge, uneaten feed, dead algae, and other organic load.',
      ],
      stabilize: [
        'Track morning and evening DO to separate daily fluctuation from persistent oxygen limitation.',
        'Avoid feed increases until DO and appetite are stable.',
      ],
    },
    monitor: ['DO morning', 'DO evening', 'appetite/tray clearance', 'mortality', 'sludge/organic load'],
    cautions: ['Do not increase feed while DO is unstable or below the safe range.'],
    sourceIds,
  },
  {
    id: 'ph',
    domain: 'water_quality',
    label: 'pH',
    aliases: ['ph'],
    target: '7.5-8.5',
    warning: '7.0-7.4 or 8.6-9.0; daily swing > 0.5',
    critical: '< 7.0 or > 9.0',
    evidenceBase: 'pH risk depends on level and daily swing. High pH increases toxic unionized ammonia risk when TAN is elevated; large pH swing often points to plankton or alkalinity instability.',
    actions: {
      decrease: [
        'Confirm whether the high pH is afternoon-only or persistent.',
        'Check TAN/NH3 risk before feeding up.',
        'Reduce nutrient and feed pressure if bloom activity is driving high pH.',
        'Use only gradual water exchange with tested source water when exchange is safe.',
      ],
      increase: [
        'Check alkalinity, rain dilution, and source-water pH.',
        'Improve buffering gradually using the farm-approved alkalinity protocol.',
        'Keep monitoring morning and afternoon pH after correction.',
      ],
      stabilize: [
        'Measure pH morning and afternoon, then check alkalinity and plankton condition.',
        'Avoid sudden lime or acid correction without farm protocol.',
      ],
    },
    monitor: ['pH morning', 'pH evening', 'alkalinity', 'TAN/NH3', 'plankton/transparency'],
    cautions: ['Do not chase pH with sudden chemical correction; abrupt pH movement can stress shrimp.'],
    sourceIds,
  },
  {
    id: 'ammonia',
    domain: 'water_quality',
    label: 'TAN / ammonia / NH3',
    aliases: ['ammonia', 'tan', 'nh3', 'nh4'],
    target: 'TAN < 1 mg/L; NH3 < 0.01 mg/L',
    warning: 'TAN 1-2 mg/L or NH3 0.01-0.05 mg/L',
    critical: 'TAN > 2 mg/L or NH3 > 0.05 mg/L',
    evidenceBase: 'TAN comes from waste, uneaten feed, dead plankton, sludge, and decomposition. Toxic NH3 risk rises with higher pH and temperature.',
    actions: {
      decrease: [
        'Hold feed increases and reduce feeding if appetite, DO, or water quality is weak.',
        'Increase aeration to protect shrimp and support nitrification.',
        'Remove or reduce organic load drivers such as uneaten feed, sludge, and dead algae where possible.',
        'Use controlled water exchange only with tested source water.',
        'Check pH and temperature together with TAN to estimate NH3 risk.',
      ],
      stabilize: [
        'Track TAN/NH3 with pH, temperature, DO, and feed response rather than judging TAN alone.',
      ],
    },
    monitor: ['TAN', 'NH3', 'pH', 'temperature', 'DO', 'feed tray/appetite'],
    cautions: ['Do not judge ammonia risk from TAN alone; pH and temperature change toxicity.'],
    sourceIds,
  },
  {
    id: 'nitrite',
    domain: 'water_quality',
    label: 'Nitrite / NO2',
    aliases: ['nitrite', 'no2'],
    target: '< 0.3 mg/L',
    warning: '0.3-1.0 mg/L',
    critical: '> 1.0 mg/L',
    evidenceBase: 'High nitrite often signals nitrification imbalance, organic overload, feed waste, weak microbial stability, or biofilter stress.',
    actions: {
      decrease: [
        'Reduce feed pressure while nitrite is elevated.',
        'Improve aeration and nitrification conditions.',
        'Check alkalinity because nitrification consumes buffering capacity.',
        'Remove sludge or organic load where possible.',
        'Use partial water exchange only with clean, tested source water.',
      ],
      stabilize: [
        'Track nitrite with DO, alkalinity, feed input, and appetite.',
      ],
    },
    monitor: ['NO2', 'DO', 'alkalinity', 'feed input', 'tray clearance', 'mortality'],
    cautions: ['Do not add salt/chloride blindly without checking salinity, pond volume, species tolerance, and farm protocol.'],
    sourceIds,
  },
  {
    id: 'salinity',
    domain: 'water_quality',
    label: 'Salinity',
    aliases: ['salinity', 'salt', 'ppt'],
    target: '15-30 ppt; practical range depends on farm condition',
    warning: 'Change > 3 ppt/day',
    critical: 'Extreme or unstable salinity movement',
    evidenceBase: 'Vannamei can tolerate a wide range, but sudden salinity change causes osmotic and molting stress.',
    actions: {
      decrease: [
        'Dilute gradually with tested lower-salinity source water.',
        'Spread correction across multiple small exchanges instead of one abrupt change.',
      ],
      increase: [
        'Raise gradually using verified source water or farm-approved mineral protocol.',
        'Watch appetite and mortality after each change.',
      ],
      stabilize: [
        'Slow water exchange and check rain dilution or source-water variability.',
      ],
    },
    monitor: ['salinity trend', 'appetite', 'mortality', 'molting condition', 'source-water salinity'],
    cautions: ['Do not correct salinity abruptly; osmotic shock can be worse than the original reading.'],
    sourceIds,
  },
  {
    id: 'alkalinity',
    domain: 'water_quality',
    label: 'Alkalinity',
    aliases: ['alkalinity', 'kh', 'buffer', 'buffering'],
    target: '100-160 mg/L CaCO3',
    warning: '60-79 mg/L; minimum acceptable around 80 mg/L',
    critical: '< 60 mg/L',
    evidenceBase: 'Alkalinity supports pH stability, molting, pond buffering capacity, and nitrification.',
    actions: {
      increase: [
        'Improve buffering gradually using farm-approved liming or bicarbonate protocol.',
        'Monitor pH morning and afternoon after any correction.',
      ],
      stabilize: [
        'Check pH swing, source water, and nitrification pressure before adjusting alkalinity.',
      ],
    },
    monitor: ['alkalinity', 'pH swing', 'TAN/NH3', 'NO2', 'molting condition'],
    cautions: ['Do not adjust alkalinity without checking pH swing and source-water chemistry.'],
    sourceIds,
  },
  {
    id: 'plankton_transparency',
    domain: 'water_quality',
    label: 'Plankton / transparency',
    aliases: ['plankton', 'transparency', 'secchi', 'water color', 'bloom', 'algae', 'cyanobacteria'],
    target: 'Transparency around 30-40 cm; stable plankton profile',
    warning: '< 25 cm or > 45 cm, rapid water color change, harmful groups rising',
    critical: 'Bloom/crash pattern with low morning DO or high pH swing',
    evidenceBase: 'Dense or unstable plankton can drive pH swing, low morning DO, bloom crash, gill stress, and nutrient buildup.',
    actions: {
      decrease: [
        'Reduce nutrient and feed pressure if bloom is dense.',
        'Increase aeration because dense plankton can depress DO overnight.',
        'Use gradual water exchange only with stable source water.',
      ],
      stabilize: [
        'Track water color, transparency, pH swing, morning DO, and lab plankton dominance.',
      ],
    },
    monitor: ['transparency', 'water color', 'pH swing', 'morning DO', 'plankton lab profile'],
    cautions: ['Do not crash a bloom abruptly; dead algae can consume oxygen and worsen ammonia.'],
    sourceIds,
  },
];
