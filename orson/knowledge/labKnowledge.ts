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
];
