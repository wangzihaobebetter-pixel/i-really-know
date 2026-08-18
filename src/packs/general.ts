import { definePack, detect, dim } from './kit';

/** Spec §3.3.11 — General fallback, used when detection confidence < 0.35. */
export const generalPack = definePack({
  id: 'general',
  name: 'General',
  shortName: 'General',
  glyph: 'glyph-general',
  tagline: 'Whatever you wrote — can you defend the specifics?',
  materialKinds: ['any written or coded submission'],
  detect: detect([]),
  dimensions: [
    dim('concept', 'Concept in own words', 'Restate the central idea differently, with a boundary.',
      ['Say it again without reusing your own sentence.', 'Give me a case where it stops applying.'],
      'Reformulates and bounds the idea.', 'Repeats the submission’s wording.'),
    dim('method', 'Method choice', 'Why this approach and not the obvious alternative.',
      ['What is the nearest alternative, and what does it cost you here?'],
      'Names the alternative and the trade.', 'Says the approach is "standard".'),
    dim('provenance', 'Provenance of specifics', 'Where this particular detail, number or claim came from.',
      ['Where did that specific value come from?'],
      'Traces the detail to a decision or a source.', '"It was in the material."'),
    dim('counterfactual', 'Counterfactual', 'Change one input → what happens.',
      ['Change this one input — what happens to your conclusion?'],
      'Predicts a specific consequence.', 'Says the result would "change".'),
    dim('blindspot', 'Blind spot', 'The weakest point of the submission.',
      ['What is the weakest sentence here, and why?'],
      'Names a real weakness unprompted.', 'Claims there is none.'),
  ],
  counterfactualLevers: ['change one input', 'remove one assumption', 'double the scale', 'flip the audience'],
  tells: [
    'uniform register throughout with no rough edges',
    'confident specifics with no stated origin',
    'hedges stacked around the central claim',
  ],
  vocabularyTraps: ['effective', 'optimal', 'robust', 'significant', 'comprehensive'],
  languageNote:
    'Detection was inconclusive. Infer the closest discipline, report it as detectedDiscipline, and shape probes accordingly while staying within these generic dimensions.',
  sampleProbes: [
    'Say your central claim again without reusing any sentence from the submission.',
    'Where did that specific number come from?',
    'What is the weakest sentence in this piece, and why?',
  ],
});
