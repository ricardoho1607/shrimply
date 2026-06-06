import type { ParameterKnowledge } from './knowledgeTypes';

export const GROWTH_KNOWLEDGE: ParameterKnowledge[] = [
  {
    id: 'growth_performance',
    domain: 'growth',
    label: 'Growth performance',
    aliases: ['growth', 'mbw', 'abw', 'adg', 'sgr', 'weight', 'size', 'biomass', 'survival'],
    evidenceBase: 'Growth should not be judged from MBW alone. ADG, survival, biomass gain, FCR, appetite, water quality, mortality, and sampling reliability need to be interpreted together.',
    actions: {
      increase: [
        'Check whether low growth is caused by feed limitation, poor appetite, water-quality stress, disease pressure, or sampling error.',
        'Stabilize DO, pH swing, ammonia/nitrite, and appetite before pushing feed upward.',
        'Validate MBW with consistent sampling intervals and enough shrimp in the sample.',
      ],
      stabilize: [
        'Compare current ADG with previous sampling and DOC stage.',
        'Check whether FCR is rising while ADG is flat, which can indicate feed waste or biomass overestimate.',
      ],
      investigate: [
        'Review survival estimate, mortality trend, size variation, feed response, and lab findings before changing feed strategy.',
      ],
    },
    monitor: ['MBW', 'ADG', 'FCR', 'survival', 'biomass', 'feed response', 'DO', 'pH swing', 'mortality'],
    cautions: ['Do not increase feed just because growth is slow if appetite or water quality is weak.'],
    sourceIds: ['shrimply-vannamei-growth-v1'],
  },
];
