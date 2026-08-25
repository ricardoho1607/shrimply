import type { ParameterKnowledge } from './knowledgeTypes';

const sourceIds = ['shrimply-vannamei-additives-v1', 'fao-srac-anchor'];

export const ADDITIVE_KNOWLEDGE: ParameterKnowledge[] = [
  {
    id: 'probiotic_products',
    domain: 'additive',
    label: 'Aquaculture probiotics',
    aliases: ['probiotic', 'probiotics', 'bacillus', 'lactobacillus', 'cfu', 'microbial strain'],
    evidenceBase: 'A probiotic is not one standard treatment. Its expected function depends on the declared organisms, strain identity, viable count, carrier, storage, application route, and pond conditions.',
    actions: {
      investigate: [
        'Read the product label for organism names, strains, CFU, expiry, storage, and intended water or feed use.',
        'Compare dated applications with water quality, organic load, lab trends, and shrimp response before judging effectiveness.',
      ],
    },
    monitor: ['declared strains', 'CFU', 'expiry and storage', 'application date', 'DO', 'organic load', 'lab trend'],
    cautions: [
      'Do not assume all probiotics perform the same function.',
      'Do not claim pathogen control or treatment success without a verified label and supporting farm or lab evidence.',
    ],
    sourceIds,
  },
  {
    id: 'zeolite_products',
    domain: 'additive',
    label: 'Zeolite products',
    aliases: ['zeolite', 'clinoptilolite', 'ammonia binder'],
    evidenceBase: 'Natural zeolites can exchange ammonium under suitable conditions, but performance varies with mineral grade, particle size, competing ions, salinity, contact conditions, and the actual TAN/NH3 problem.',
    actions: {
      investigate: [
        'Verify the mineral type and product label before treating the product as an ammonia-control tool.',
        'Check TAN, pH, temperature, salinity, DO, and organic load before deciding whether the product addresses the main cause.',
      ],
    },
    monitor: ['TAN', 'NH3', 'pH', 'temperature', 'salinity', 'DO', 'product grade'],
    cautions: ['Do not present zeolite as a substitute for aeration, sludge control, feeding correction, or confirmed water-quality management.'],
    sourceIds,
  },
  {
    id: 'lime_and_buffer_products',
    domain: 'additive',
    label: 'Lime, carbonate, and buffer products',
    aliases: ['lime', 'calcium carbonate', 'dolomite', 'quicklime', 'hydrated lime', 'bicarbonate', 'buffer'],
    evidenceBase: 'Products sold as lime or buffers can have very different chemistry and effects. Safe interpretation requires the exact compound, purity, pond pH, alkalinity, water volume, and farm protocol.',
    actions: {
      investigate: [
        'Confirm the exact chemical name and label before explaining its expected effect.',
        'Review morning and afternoon pH, alkalinity, pond volume, and recent applications before any correction.',
      ],
    },
    monitor: ['exact compound', 'purity', 'pH morning/evening', 'alkalinity', 'pond volume'],
    cautions: ['Do not treat agricultural lime, dolomite, quicklime, hydrated lime, and bicarbonate as interchangeable products.'],
    sourceIds,
  },
  {
    id: 'mineral_vitamin_products',
    domain: 'additive',
    label: 'Mineral and vitamin products',
    aliases: ['mineral', 'minerals', 'vitamin', 'vitamins', 'trace mineral', 'molting mineral'],
    evidenceBase: 'Mineral and vitamin products vary by ingredient, concentration, delivery route, stability, and intended use. Product category alone is not enough to predict a biological effect.',
    actions: {
      investigate: [
        'Read the label for named nutrients, concentrations, carrier, intended feed or water use, and storage conditions.',
        'Link the claimed purpose to actual salinity, alkalinity, hardness, molting observations, feed formulation, and farm protocol.',
      ],
    },
    monitor: ['ingredient list', 'concentration', 'application route', 'salinity', 'alkalinity', 'hardness', 'molting'],
    cautions: ['Do not infer a deficiency or prescribe a dose from the product category alone.'],
    sourceIds,
  },
];
