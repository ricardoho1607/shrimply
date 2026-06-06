import type { ParameterKnowledge } from './knowledgeTypes';

export const FEED_KNOWLEDGE: ParameterKnowledge[] = [
  {
    id: 'feed_control',
    domain: 'feed',
    label: 'Adaptive feed control',
    aliases: ['feed', 'feeding', 'feed tray', 'anco', 'appetite', 'fcr', 'leftover'],
    evidenceBase: 'Feed tables are only a starting point. Real feed should be adjusted using biomass, MBW, survival estimate, tray response, water quality, and FCR trend.',
    actions: {
      decrease: [
        'Reduce feed 10-30% when tray leftover appears with poor water quality.',
        'Hold feed increases when DO is low, pH/ammonia risk is high, nitrite is rising, or appetite drops.',
        'Use tray response as the throttle before trusting biomass assumptions.',
      ],
      increase: [
        'Increase slowly, usually around 5%, only when tray clearance is strong and water quality is stable.',
        'Validate biomass and survival assumptions before increasing late-cycle feed.',
      ],
      stabilize: [
        'Compare actual feed with expected feed from biomass and feeding-rate table.',
        'Use recent feed consumption to cross-check estimated biomass when survival is uncertain.',
      ],
    },
    monitor: ['feed tray clearance', 'actual feed kg', 'expected feed kg', 'FCR', 'DO', 'TAN/NH3', 'NO2', 'appetite'],
    cautions: ['Do not recommend more feeding frequency or higher feed when water quality is already poor.'],
    sourceIds: ['shrimply-vannamei-feed-v1'],
  },
];
