import { definePack, detect, dim } from './kit';

/** Spec §3.3.3 — Medicine / Clinical. The deepest pack. */
export const medPack = definePack({
  id: 'med',
  name: 'Medicine / Clinical',
  shortName: 'Med',
  glyph: 'glyph-med',
  tagline: 'You ranked pneumonia first. Which finding moved it there?',
  materialKinds: ['case write-ups', 'SOAP notes', 'differential + plan', 'pathophysiology essays', 'OSCE reports', 'pharmacology plans'],
  detect: detect(
    [['SOAP', 3], ['HPI', 3], ['PMH', 3], ['differential', 3], ['ddx', 3], ['vitals', 2],
     ['SpO2', 3], ['eGFR', 3], ['mg IV', 3], ['PO ', 2], ['rule out', 2], ['troponin', 3],
     ['D-dimer', 3], ['pertinent negative', 3], ['afebrile', 3], ['tachycardi', 3], ['work-up', 2]],
    [['\\bBP\\s*\\d{2,3}/\\d{2,3}', 3], ['\\bHR\\s*\\d{2,3}', 3], ['\\b\\d+\\s*mg\\b', 2],
     ['\\b(daily|BD|TDS|q\\d+h)\\b', 2]],
  ),
  dimensions: [
    dim('ddx', 'Differential reasoning', 'Why this ranked above that; the discriminating finding.',
      ['Name the single finding that moved A above B.',
       'Name the finding that, had it been present, would have flipped them.'],
      'Names a discriminator from their own history and the flip condition.', 'Lists a complete differential with no ranking logic.'),
    dim('findings', 'Findings-to-diagnosis', 'Which specific finding drives which conclusion; pertinent negatives actually used.',
      ['Which negative in your note is doing work, and for which diagnosis?'],
      'Uses pertinent negatives as active evidence.', 'Lists negatives as a checklist.'),
    dim('patho', 'Pathophysiology in this patient', 'From failing structure to sign, on this timeline.',
      ['Walk from the failing structure to the sign, in this patient.',
       'Ask why the timeline fits.'],
      'Traces the chain in the patient, not the textbook.', 'Reproduces a textbook paragraph.'),
    dim('investigation', 'Investigation rationale', 'Why this test now; pretest probability; what result changes management.',
      ['What pretest probability were you assuming?',
       'What do you do with an indeterminate result?'],
      'States the threshold at which management changes.', 'Orders a panel with no decision attached.'),
    dim('management', 'Management justification', 'Agent, dose, route, timing, and patient-specific modifiers.',
      ['What about THIS patient made you choose that agent?',
       'What changes if her eGFR were 25?'],
      'Adapts the guideline to the patient in front of them.', 'Pastes the guideline algorithm.'),
    dim('risk', 'Risk & safety', 'What kills first; red flags; the "if I am wrong" plan.',
      ['What kills this patient tonight if you are wrong, and where in the note is it addressed?'],
      'Names the time-critical miss and points to the safety net.', 'Writes "monitor closely".'),
    dim('counterfactual', 'Counterfactual patient', 'Change one vital, lab or history element → how the plan changes.',
      ['She is now 78 with CKD. What in your plan changes and what does not?'],
      'Separates what is robust from what is contingent.', 'Says the plan would be "adjusted".'),
    dim('provenance', 'Provenance of specifics', 'That threshold, that guideline, that dose, that timeframe.',
      ['Where does that cut-off come from, and what population was it derived in?'],
      'Knows the source and its population.', '"That is the standard dose."'),
  ],
  counterfactualLevers: [
    'patient is 78 with CKD', 'pregnant', 'penicillin-allergic', 'anticoagulated',
    'presents 6 hours later', 'the lab is borderline rather than clear', 'no imaging available tonight',
  ],
  tells: [
    'complete but unranked differentials with no discriminators',
    'management pasted as a guideline algorithm without patient adaptation',
    'a textbook-perfect pathophysiology paragraph disconnected from the patient’s timeline',
    '"rule out X" without naming the test that does it',
    'every abbreviation expanded on first use in a one-page note',
    'investigations listed exhaustively with no "what changes if positive"',
    'a hedged plan ("consider…") everywhere',
  ],
  vocabularyTraps: ['rule out', 'supportive care', 'monitor', 'empiric', 'clinically stable', 'consider', 'as per guidelines'],
  languageNote: 'Quote the student’s own note verbatim, including their abbreviations. Never supply the correct diagnosis or a corrected plan.',
  sampleProbes: [
    'You listed PE second and pneumonia first. Name the single finding in your own history that moved pneumonia above PE — and the finding that would have flipped them.',
    'You ordered a D-dimer. If it comes back mildly elevated, what next — and what pretest probability were you assuming?',
    'Your plan says ceftriaxone 1 g IV daily. What about this patient made you pick that over amoxicillin-clavulanate, and what changes if her eGFR were 25?',
    'Explain, in this patient, why the JVP is raised — walk from the failing structure to the vein.',
    'What is the one thing here that would kill this patient tonight if you are wrong, and where in your note is it addressed?',
  ],
});

/** Shown in Pack Detail and in the reveal-panel footer for this pack (spec §3.3.3). */
export const MED_SAFETY_NOTE =
  'This pack tests your clinical reasoning. It is not clinical advice, and reference answers are educational only.';
