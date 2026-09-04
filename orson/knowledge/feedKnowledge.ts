import type { ParameterKnowledge } from './knowledgeTypes';

export const FEED_KNOWLEDGE: ParameterKnowledge[] = [
  {
    id: 'feed_control',
    domain: 'feed',
    label: 'Adaptive feed control',
    aliases: ['feed', 'feeding', 'feed tray', 'appetite', 'leftover', 'ration', 'schedule', 'fcr'],
    evidenceBase: 'Feed tables are only a starting point. Logged feed should be interpreted using biomass, MBW, survival estimate, water quality, mortality, and FCR trend.',
    actions: {
      decrease: [
        'Hold feed increases when DO is low, pH/ammonia risk is high, nitrite is rising, or mortality increases.',
        'Confirm whether a logged feed decrease was planned before treating it as a biological warning.',
      ],
      increase: [
        'Adjust feed only after direct tray response, biomass assumptions and water quality support it; follow the farm feeding protocol.',
        'Validate biomass and survival assumptions before increasing late-cycle feed.',
      ],
      stabilize: [
        'Compare actual feed with expected feed from biomass and feeding-rate table.',
        'Use recent feed consumption to cross-check estimated biomass when survival is uncertain.',
      ],
    },
    monitor: ['actual feed kg', 'expected feed kg', 'feed allocation trend', 'FCR', 'DO', 'TAN/NH3', 'NO2', 'mortality'],
    cautions: ['Do not recommend more feeding frequency or higher feed when water quality is already poor.'],
    sourceIds: ['shrimply-vannamei-feed-v1'],
  },
];
