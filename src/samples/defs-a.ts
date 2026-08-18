/**
 * Pre-baked sample runs, part A (CS · Biology · Medicine · Statistics).
 * These make the whole product usable on first open with no API key at all:
 * real submissions, real examiner probes, hand-written by discipline.
 * Every `quote` must be a verbatim substring of its material — enforced by
 * `npm run verify:samples`.
 */
import type { SampleDef } from './kit';
import csMaterial from './material/cs-algorithms.md?raw';
import bioMaterial from './material/bio-molecular.md?raw';
import medMaterial from './material/med-case.md?raw';
import statsMaterial from './material/stats-regression.md?raw';

export const csSample: SampleDef = {
  id: 'cs-algorithms',
  title: 'LRU cache with O(1) operations',
  packId: 'cs',
  material: csMaterial,
  level: 'masters',
  blurb: 'A graduate CS write-up of an LRU cache: hash map plus doubly linked list, complexity argument, tests.',
  preset: 'standard',
  difficulty: 'standard',
  probes: [
    {
      dimensionId: 'alternatives',
      kind: 'method',
      quote: 'which CPython implements with essentially the same structure internally',
      question: 'You rejected OrderedDict partly because the assignment said "implement your own". Set that aside: name one measurable way your hand-rolled version differs from CPython’s, and one way it is strictly worse.',
      whyThisProbe: 'A student who read about OrderedDict can name it; one who understands it can say what the C implementation buys you.',
      keyPoints: [
        'CPython’s OrderedDict is C-level: lower constant factors and less per-node Python object overhead.',
        'The hand-rolled version pays a Python object plus attribute lookups per node.',
        'Asymptotics are identical; the difference is constants and memory.',
      ],
      ownedLooksLike: 'Separates asymptotics from constants, and names object overhead or C-level dispatch as the real difference.',
      surfaceLooksLike: 'Says the built-in is "more optimised" or "faster" with no mechanism.',
      variant: {
        question: 'Your cache stores ints. If values were 10 MB numpy arrays instead, which of your design choices would you revisit first, and why?',
        whyThisProbe: 'Moves the same trade-off into a regime where the constant factors dominate.',
      },
    },
    {
      dimensionId: 'invariants',
      kind: 'counterfactual',
      quote: '# Sentinel head/tail — let insert/remove skip None checks.',
      question: 'Delete both sentinel nodes and keep everything else. Name the first method that breaks and the exact input sequence that breaks it.',
      whyThisProbe: 'Sentinels are the classic copied idiom. Owning them means knowing precisely which None check they are standing in for.',
      keyPoints: [
        'Without sentinels, _remove must handle node.prev or node.next being None.',
        'The first eviction from a one-element cache is where it shows.',
        'Sentinels convert boundary cases into the general case.',
      ],
      ownedLooksLike: 'Names _remove or _add_to_front and walks a concrete tiny sequence such as put/put on cap = 1.',
      surfaceLooksLike: 'Says the code would "need null checks" without naming a method or an input.',
    },
    {
      dimensionId: 'edges',
      kind: 'blindspot',
      quote: 'if len(self.map) == self.cap:',
      question: 'What does your cache do if it is constructed with capacity 0, and is that behaviour reachable through the public API?',
      whyThisProbe: 'The equality test hides an assumption that capacity is at least one. It is the cheapest real bug in this file.',
      keyPoints: [
        'With cap = 0 the first put evicts the tail sentinel, corrupting the list.',
        'An == test assumes the size never exceeds cap; >= would be defensive.',
        'Nothing in the constructor rejects capacity 0.',
      ],
      ownedLooksLike: 'Traces the sentinel being evicted and notices the constructor never validates capacity.',
      surfaceLooksLike: 'Says it would "probably error" or that capacity 0 is not a real case.',
    },
    {
      dimensionId: 'complexity',
      kind: 'provenance',
      quote: 'self.head.next.prev = node',
      question: 'Your write-up claims worst-case O(1). Point at the operations in _add_to_front and put that carry that claim, and name the one operation in your code whose worst case is not O(1).',
      whyThisProbe: 'Amortised versus worst-case is the exact place where a memorised complexity claim comes apart.',
      keyPoints: [
        'Pointer surgery is genuinely constant time.',
        'Python dict insert is amortised O(1), worst case O(n) on a resize.',
        'The claim should be amortised, not worst-case.',
      ],
      ownedLooksLike: 'Distinguishes amortised from worst-case and points at the dict, not the list.',
      surfaceLooksLike: 'Restates that both structures are O(1).',
    },
    {
      dimensionId: 'testing',
      kind: 'blindspot',
      quote: 'Behaviour must match LeetCode problem 146 exactly, including that `put` on an existing key counts as an access',
      question: 'Write the smallest test that would fail if you had forgotten that a put on an existing key refreshes recency. Give the exact calls and the expected return.',
      whyThisProbe: 'They wrote the rule down. This asks whether they can turn a written requirement into a discriminating test.',
      keyPoints: [
        'Needs capacity 2, two keys, a put on the older key, then an insert forcing eviction.',
        'The test must distinguish which key survives.',
        'A test that only checks values cannot catch it.',
      ],
      ownedLooksLike: 'Gives a concrete four-or-five-call sequence with the expected get result.',
      surfaceLooksLike: 'Describes testing "the update case" without a sequence.',
    },
  ],
  fragilities: [
    {
      quote: 'I want to come back and compare memory footprints against the hand-rolled version as a follow-up',
      note: 'A stated follow-up that never happened often marks the boundary of what was actually explored.',
    },
    {
      quote: '__slots__ = ("key", "val", "prev", "next")',
      note: 'An optimisation idiom appearing once, in code that is otherwise not memory-tuned.',
    },
  ],
};

export const bioSample: SampleDef = {
  id: 'bio-molecular',
  title: 'siNRF2 knockdown reduces HO-1 induction',
  packId: 'bio',
  material: bioMaterial,
  level: 'undergraduate',
  blurb: 'Undergraduate Western blot report: siRNA against NRF2 cuts tBHP-driven HO-1 induction by about 63% in HeLa cells.',
  preset: 'standard',
  difficulty: 'standard',
  probes: [
    {
      dimensionId: 'data2claim',
      kind: 'provenance',
      quote: 'The reduction in HO-1 induction in siNRF2 vs siControl under tBHP was therefore about 63% (8.4 → 3.1)',
      question: 'Show me how 8.4 and 3.1 become 63%. Then tell me what that percentage would be if you had instead normalised each condition to its own vehicle control.',
      whyThisProbe: 'A ratio of ratios is where normalisation choices hide. The arithmetic is easy; knowing what the denominator means is not.',
      keyPoints: [
        '(8.4 − 3.1) / 8.4 ≈ 0.63, a reduction in the induction ratio.',
        'Both values are already normalised to siControl vehicle, not to their own vehicle.',
        'Changing the denominator changes what the number claims.',
      ],
      ownedLooksLike: 'Does the arithmetic and notices the shared denominator is a choice with consequences.',
      surfaceLooksLike: 'Repeats 63% and says it shows NRF2 is important.',
      variant: {
        question: 'Your knockdown is ~70% efficient and HO-1 induction falls ~63%. What would you conclude if knockdown were 70% and induction fell only 20%?',
        whyThisProbe: 'Tests whether the dose–response reasoning is real or the number was simply reported.',
      },
    },
    {
      dimensionId: 'controls',
      kind: 'concept',
      quote: 'β-actin loading control: confirms equal loading across lanes',
      question: 'Name one failure your β-actin control rules out, and one failure that would leave β-actin looking perfectly even.',
      whyThisProbe: 'Loading controls are the most recited and least understood object in a blot.',
      keyPoints: [
        'It rules out unequal protein loaded or grossly unequal transfer.',
        'It does not rule out uneven transfer confined to the high-molecular-weight region.',
        'Nor antibody or ECL problems specific to the HO-1 blot.',
      ],
      ownedLooksLike: 'Names a molecular-weight-dependent transfer or detection failure that β-actin cannot see.',
      surfaceLooksLike: 'Says it "shows the experiment worked" or "confirms equal loading".',
    },
    {
      dimensionId: 'perturbation',
      kind: 'counterfactual',
      quote: 'did not run a time course to confirm that NRF2 is maximally depleted at 48 h',
      question: 'Suppose NRF2 protein had recovered to 60% of control by 48 h rather than 30%. Which single number in your Results section moves, in which direction, and does your conclusion survive?',
      whyThisProbe: 'Forces the knockdown efficiency to be treated as an input to the result rather than a reported fact.',
      keyPoints: [
        'Residual NRF2 raises the siNRF2 HO-1 induction above 3.1-fold.',
        'The 63% reduction shrinks.',
        'The direction of the conclusion survives; its magnitude does not.',
      ],
      ownedLooksLike: 'Separates the qualitative claim from the quantitative one and says which is robust.',
      surfaceLooksLike: 'Says the results would be "less clear".',
    },
    {
      dimensionId: 'precision',
      kind: 'concept',
      quote: 'qPCR to confirm that the HO-1 change is at the mRNA level rather than purely post-translational stabilisation',
      question: 'Your blot measures HO-1 protein. Give a concrete mechanism by which HO-1 protein could rise with no change in HO-1 mRNA — and say what your current data can and cannot distinguish.',
      whyThisProbe: 'They wrote the right next experiment. This checks whether they know what it would decide.',
      keyPoints: [
        'Reduced degradation or increased translation raises protein without transcription.',
        'A Western cannot separate synthesis from turnover.',
        'qPCR plus a translation or proteasome inhibitor would.',
      ],
      ownedLooksLike: 'Names a specific post-transcriptional mechanism and the experiment that separates it.',
      surfaceLooksLike: 'Repeats that qPCR would confirm it, without saying what it would confirm.',
    },
    {
      dimensionId: 'limits',
      kind: 'blindspot',
      quote: '100 μM tBHP for 4 h was the only dose tested',
      question: 'If 100 μM tBHP were partly cytotoxic in siNRF2 cells specifically, how would that show up in your blot — and would it look like the result you reported?',
      whyThisProbe: 'A confound that mimics the hypothesis is the hardest one to see, and this design has one.',
      keyPoints: [
        'NRF2-knockdown cells are more sensitive to oxidative stress, so selective death is plausible.',
        'Dying cells lose signal across the board, including β-actin.',
        'Normalisation to β-actin partly masks it; trypan blue at harvest is weak evidence.',
      ],
      ownedLooksLike: 'Recognises the confound points the same direction as the hypothesis and names a control for it.',
      surfaceLooksLike: 'Says cytotoxicity would "affect the results".',
    },
  ],
  fragilities: [
    {
      quote: 'This is in line with the published literature where NRF2 dependence for HO-1 induction typically falls in the 50–80% range',
      note: 'A wide published range that any result would have landed inside offers little confirmation.',
    },
    {
      quote: 'we did not see a statistically significant difference for the basal HO-1 comparison (which we did not expect to differ)',
      note: 'A non-significant result reported as expected, with no power statement.',
    },
  ],
};

export const medSample: SampleDef = {
  id: 'med-case',
  title: '58-year-old man with acute inferior STEMI',
  packId: 'med',
  material: medMaterial,
  level: 'professional',
  blurb: 'Emergency department case write-up: inferior STEMI, five-item differential, cath-lab activation plan.',
  preset: 'defense',
  difficulty: 'defense',
  probes: [
    {
      dimensionId: 'ddx',
      kind: 'method',
      quote: '**Acute pulmonary embolism.** Less likely given the focal inferior ST elevation',
      question: 'You ranked PE second. Name the single finding in your own documentation that pushed it below STEMI — and the finding that, had it been present, would have moved it back to the top.',
      whyThisProbe: 'A ranked differential is only reasoning if the student can name the discriminator that produced the order.',
      keyPoints: [
        'Focal inferior ST elevation with reciprocal change in I/aVL is territorial, not global.',
        'A flipping finding would be right-heart strain with clear lungs and profound hypoxaemia.',
        'Troponin rise alone does not separate them.',
      ],
      ownedLooksLike: 'Names a specific discriminator and a concrete flip condition.',
      surfaceLooksLike: 'Repeats that the ECG pattern is not typical for PE.',
      variant: {
        question: 'Same patient, but the ECG shows only 0.5 mm of inferior ST elevation and the first troponin is normal. What is your top diagnosis now and what do you do in the next 20 minutes?',
        whyThisProbe: 'Removes the finding that made the answer easy and checks whether the reasoning still runs.',
      },
    },
    {
      dimensionId: 'investigation',
      kind: 'counterfactual',
      quote: 'The absence of RV involvement has not been confirmed because right-sided leads were not yet obtained',
      question: 'V4R comes back with 1.5 mm of ST elevation. Name the specific medication in your plan that becomes dangerous, and what you would do instead.',
      whyThisProbe: 'They flagged the missing lead. This tests whether they know what the answer would change.',
      keyPoints: [
        'RV infarction makes the patient preload dependent.',
        'Nitrates can cause profound hypotension and are the drug to withhold.',
        'Management shifts to volume loading with careful monitoring.',
      ],
      ownedLooksLike: 'Names nitrates specifically and explains preload dependence.',
      surfaceLooksLike: 'Says they would "be more careful with blood pressure".',
    },
    {
      dimensionId: 'management',
      kind: 'provenance',
      quote: 'Will give ticagrelor 180 mg PO loading dose and unfractionated heparin 70 U/kg IV bolus per protocol',
      question: 'What about this patient made ticagrelor the right P2Y12 agent rather than clopidogrel, and which single item in the history would have made you choose differently?',
      whyThisProbe: '"Per protocol" is the phrase this pack exists to interrogate.',
      keyPoints: [
        'Ticagrelor has faster onset and greater potency in primary PCI.',
        'Prior haemorrhagic stroke, active bleeding, or planned thrombolysis change the choice.',
        'The heparin dose is weight-based and PCI-specific.',
      ],
      ownedLooksLike: 'Gives a patient-specific contraindication rather than a general list.',
      surfaceLooksLike: 'Says it is the guideline-recommended agent.',
    },
    {
      dimensionId: 'risk',
      kind: 'blindspot',
      quote: 'Door-to-balloon target <90 minutes',
      question: 'You have a 90-minute target. What is the one thing that could kill this patient inside those 90 minutes that is not addressed anywhere in your plan, and where would you put it?',
      whyThisProbe: 'The named killer in inferior MI is a rhythm problem, and this plan does not mention it.',
      keyPoints: [
        'Inferior MI carries high-grade AV block and bradyarrhythmia risk from RCA occlusion.',
        'VF is the other immediate killer.',
        'Pads, atropine availability and continuous monitoring belong in the plan.',
      ],
      ownedLooksLike: 'Names AV block or VF and says where in the note it should live.',
      surfaceLooksLike: 'Says the patient will be on telemetry in the CCU.',
    },
    {
      dimensionId: 'patho',
      kind: 'concept',
      quote: '**Pericarditis.** Unlikely given the focal regional ST elevation with reciprocal changes',
      question: 'Explain, mechanically, why pericarditis produces diffuse concave elevation without reciprocal change, while an occluded RCA produces the pattern you actually see.',
      whyThisProbe: 'Separates a memorised discriminator from an understood one.',
      keyPoints: [
        'Pericardial inflammation is global, so injury current is not territorial.',
        'Coronary occlusion injures one wall, and the opposite lead sees it as reciprocal depression.',
        'Reciprocal change is the geometric signature of a regional process.',
      ],
      ownedLooksLike: 'Explains reciprocal change as a vector or geometry argument.',
      surfaceLooksLike: 'Restates that pericarditis is diffuse and MI is focal.',
    },
  ],
  fragilities: [
    {
      quote: 'this workup would only proceed after cardiac aetiologies are excluded',
      note: 'A differential item with no action attached does no work in the plan.',
    },
    {
      quote: 'the patient will get CT angiography of the aorta if the cath-lab activation turns out to be inappropriate',
      note: 'A contingency with no stated trigger and no timing.',
    },
  ],
};

export const statsSample: SampleDef = {
  id: 'stats-regression',
  title: 'Mincer-style wage regression with HC1 standard errors',
  packId: 'stats',
  material: statsMaterial,
  level: 'undergraduate',
  blurb: 'Applied regression assignment: log-wage OLS with robust SEs, Breusch–Pagan, RESET, and a Mincer return.',
  preset: 'standard',
  difficulty: 'standard',
  probes: [
    {
      dimensionId: 'interpretation',
      kind: 'concept',
      quote: 'A one-year increase in education is associated with a 9.2% increase in predicted wages',
      question: 'Your coefficient is 0.092 on log wage. Is 9.2% the right way to say that, and what is the exact percentage? Say when the difference starts to matter.',
      whyThisProbe: 'The log-coefficient approximation is the single most parroted line in applied regression.',
      keyPoints: [
        'exp(0.092) − 1 = 9.64%, not 9.2%.',
        'The approximation is good for small coefficients and degrades as they grow.',
        'It matters once coefficients exceed roughly 0.1 to 0.2.',
      ],
      ownedLooksLike: 'Gives the exponentiated value and says where the approximation breaks.',
      surfaceLooksLike: 'Confirms 9.2% because the coefficient is 0.092.',
      variant: {
        question: 'The female coefficient is −0.118. State that as an exact percentage difference, and say which direction the log approximation errs.',
        whyThisProbe: 'Same mechanism, negative coefficient, where the approximation errs the other way.',
      },
    },
    {
      dimensionId: 'handling',
      kind: 'counterfactual',
      quote: 'top-code wages at the 99th percentile to reduce leverage from extreme values',
      question: 'Top-coding the top 1% of wages: which of your coefficients does that bias, and in which direction? Would you defend the same choice if the research question were about top-end inequality?',
      whyThisProbe: 'A data-handling decision made for tidiness has a direction of bias, and this one is aimed straight at the estimand.',
      keyPoints: [
        'Compressing the right tail attenuates the education return, since education pays most at the top.',
        'The bias is toward zero for β1.',
        'For an inequality question, top-coding removes the object of study.',
      ],
      ownedLooksLike: 'Names attenuation, gives the direction, and separates the two research questions.',
      surfaceLooksLike: 'Says top-coding reduces the influence of outliers.',
    },
    {
      dimensionId: 'assumptions',
      kind: 'method',
      quote: 'for heteroskedasticity: p = 0.04. Borderline',
      question: 'You call p = 0.04 borderline and keep HC1 over HC0. What actually differs between HC0 and HC1, and at n = 935 does that choice change any conclusion in your report?',
      whyThisProbe: 'A defensible choice made for an undefended reason is the commonest form of borrowed rigour.',
      keyPoints: [
        'HC1 applies a small-sample correction of n/(n − k).',
        'At n = 935 with a handful of regressors the correction is under one percent.',
        'No conclusion in this report turns on it.',
      ],
      ownedLooksLike: 'States the correction factor and concludes honestly that it is immaterial here.',
      surfaceLooksLike: 'Says HC1 is more conservative or more robust.',
    },
    {
      dimensionId: 'provenance',
      kind: 'provenance',
      quote: 'all regressors below 2.5, including the experience / experience² pair',
      question: 'You expected VIF to be elevated for experience and its square, and it was not. Give the reason — and say what you would have to have done for it to be very high.',
      whyThisProbe: 'A surprise the student noticed but did not explain is a clean test of whether the diagnostic is understood.',
      keyPoints: [
        'VIF here is likely computed on a centred or well-spread experience variable.',
        'Raw uncentred polynomials are strongly collinear.',
        'Centring before squaring removes most of it.',
      ],
      ownedLooksLike: 'Connects centring or the variable’s range to the collinearity.',
      surfaceLooksLike: 'Says the variables happened not to be collinear.',
    },
    {
      dimensionId: 'limits',
      kind: 'blindspot',
      quote: 'does not yet adjust for occupation or hours of work',
      question: 'Adding occupation would shrink your gender coefficient. Argue the case that adding it would make the estimate worse rather than better.',
      whyThisProbe: 'Bad controls are where causal reasoning separates from mechanical adjustment.',
      keyPoints: [
        'Occupation is plausibly a mediator of the gender effect, not a confounder.',
        'Controlling for a mediator removes part of the effect of interest.',
        'The right adjustment set depends on the causal question.',
      ],
      ownedLooksLike: 'Uses the mediator argument and says what question each specification answers.',
      surfaceLooksLike: 'Says more controls give a more accurate estimate.',
    },
  ],
  fragilities: [
    {
      quote: 'The education coefficient is stable across specifications',
      note: 'Stability is asserted; the alternative specifications are not shown.',
    },
    {
      quote: 'ideally with a Heckman correction to address labour-force selection',
      note: 'A named advanced method invoked at the end with no exclusion restriction proposed.',
    },
  ],
};
