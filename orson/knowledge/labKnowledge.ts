import type { ParameterKnowledge } from './knowledgeTypes';

export const LAB_KNOWLEDGE: ParameterKnowledge[] = [
  {
    id: 'microbial_lab_interpretation',
    domain: 'lab',
    label: 'Microbial lab interpretation',
    aliases: ['lab', 'vibrio', 'tbc', 'tpc', 'tvc', 'green vibrio', 'yellow vibrio', 'pcr', 'ahpnd', 'plankton', 'cyanobacteria', 'diatom'],
    evidenceBase: 'Microbial lab values are method-dependent. A single number is not a diagnosis; trend, ratio, pathogen signal, sample source, feed response, mortality, gut/hepatopancreas condition, water quality, DOC, and lab method matter.',
    actions: {
      investigate: [
        'Check sample source, sample date/time, method, unit, lab name, and whether the result is culture count, PCR, qPCR, or microscopy.',
        'Compare Vibrio trend with TVC:TBC ratio, feed response, mortality, DO, sludge, and water-quality instability.',
        'If harmful plankton is rising, check transparency, pH swing, morning DO, and appetite.',
      ],
      decrease: [
        'Reduce organic load and feed pressure when microbial pressure appears with poor appetite or water quality.',
        'Improve aeration and bottom management while monitoring mortality and feed response.',
      ],
    },
    monitor: ['TVC', 'TBC/TPC', 'TVC:TBC ratio', 'green vibrio', 'PCR result', 'plankton dominance', 'feed response', 'mortality', 'DO'],
    cautions: ['Do not treat a single lab count as a species-level disease diagnosis without method, source, trend, and clinical signs.'],
    sourceIds: ['shrimply-vannamei-lab-plankton-v1'],
  },
  {
    id: 'white_feces_investigation',
    domain: 'lab',
    label: 'White feces or white-gut investigation',
    aliases: ['white feces', 'white faeces', 'white gut', 'floating feces', 'floating faeces', 'ehp'],
    evidenceBase: 'White feces is a field sign, not one confirmed disease. Possible contributors include gut and hepatopancreas disturbance, EHP or other pathogens, Vibrio pressure, feed quality, algal or environmental stress, and pond organic load.',
    actions: {
      investigate: [
        'Check how many ponds and shrimp are affected, onset date, feed response, growth change, mortality, gut continuity, hepatopancreas appearance, and floating fecal strings.',
        'Review recent feed batches, water-quality movement, plankton, sludge, and treatment history.',
        'Use appropriate laboratory examination or PCR when EHP, AHPND, or another pathogen is suspected.',
      ],
      stabilize: [
        'Protect DO, avoid feed increases while response is weak, remove accumulated organic waste where practical, and intensify observation while confirmation is pending.',
      ],
    },
    monitor: ['affected prevalence', 'feed response', 'MBW/ADG', 'mortality', 'gut and hepatopancreas signs', 'DO', 'sludge', 'lab confirmation'],
    cautions: ['Do not diagnose EHP, AHPND, or a bacterial disease from white feces alone.'],
    sourceIds: ['shrimply-vannamei-lab-plankton-v1', 'fao-srac-anchor'],
  },
];
