/**
 * Sample runs, part A — clinical and biology.
 *
 * F8: every artifact below is a REAL student submission with a source URL.
 * v2's eight samples were written by an LLM to be examinable and Wang rejected
 * the build for it. The corpus these come from is
 * `research/ireallyknow/01-student-submissions.md`, and where that file could
 * not find real work it says so — which is why v3 ships no chemistry sample at
 * all rather than the instructor-authored "Joe Student" template the corpus
 * explicitly rejected (corpus §7.1).
 *
 * The material is a VERBATIM EXCERPT, quoted for analysis, not the paper.
 * MICUSP text is copyright the Regents of the University of Michigan under a
 * Fair Use statement; the corpus is explicit that paper text must not be
 * redistributed in a shipped product. Each sample links out to the original.
 *
 * Every `quote` must be a verbatim substring of its material and every sample
 * must carry a source URL — both enforced by `npm run verify:samples`.
 */
import type { SampleDef } from './kit';
import antepartum from './material/nur-antepartum.md?raw';
import emergencyContraception from './material/nur-emergency-contraception.md?raw';
import motorOil from './material/bio-motor-oil.md?raw';
import plantCompetition from './material/bio-plant-competition.md?raw';

export const antepartumSample: SampleDef = {
  id: 'nur-antepartum',
  title: 'High-Risk Antepartum Case Study',
  packId: 'med',
  material: antepartum,
  level: 'undergraduate',
  blurb: 'A nursing case study that reads as competent and contains almost no inference. Every number in the data dump is an anchor the student never uses.',
  preset: 'standard',
  difficulty: 'standard',
  source: {
    url: 'https://micusp.elicorpora.info/view?pid=NUR.G0.05.1',
    corpus: 'MICUSP — Michigan Corpus of Upper-level Student Papers',
    who: 'Nursing · Final Year Undergraduate · Report · A-graded',
    markers: 'The second paragraph restates the first in plain English — "13 + 0/7 weeks pregnant, which means she is at 13 weeks gestation" — definitional paraphrase presented as clinical reasoning. The corpus calls this the single most instructive artifact it found, because it reads as competent and contains no inference, and it was graded A.',
    terms: 'Copyright the Regents of the University of Michigan; site posts a Fair Use statement. Short excerpt shown for analysis, full paper at the source URL.',
    originalLength: '2,725 words',
  },
  probes: [
    {
      dimensionId: 'findings',
      kind: 'concept',
      quote: 'Hgb 10 g/dl, Hct 32%',
      question: 'Hgb 10, Hct 32 in a twin pregnancy at 13 weeks — is that a finding, or is that normal? What would change your answer?',
      whyThisProbe: 'The number is in the write-up and is never used. A student who understands plasma volume expansion in a twin gestation can say why this value is read differently here than in a singleton; one who transcribed the chart cannot.',
      keyPoints: [
        'Plasma volume expands faster than red cell mass, and more so in a twin gestation — a dilutional fall is expected.',
        'The reference threshold for anaemia in pregnancy is trimester-specific, not a single cut-off.',
        'What would change the answer: MCV, ferritin, the pre-pregnancy baseline, symptoms.',
      ],
      ownedLooksLike: 'Separates dilutional change from true anaemia and names one test that would settle it.',
      surfaceLooksLike: 'Says the value is "low" and recommends iron, with no mechanism and no threshold.',
      variant: {
        question: 'You have the same patient at 28 weeks with Hgb 9.4. Has anything changed about how you read it, and what do you do differently?',
        whyThisProbe: 'Moves the same value into a trimester where the expected physiology is different.',
      },
    },
    {
      dimensionId: 'patho',
      kind: 'blindspot',
      quote: 'She also has scleroderma with contracted elbow and fingers.',
      question: 'Scleroderma is one clause in your history and never appears again. Name one way it changes the management of this specific pregnancy, and one way it changes the delivery plan.',
      whyThisProbe: 'A comorbidity mentioned and then dropped is the clearest signal available that a fact was transcribed rather than reasoned with.',
      keyPoints: [
        'Scleroderma carries renal crisis risk and hypertensive disease risk, which changes what BP readings mean here.',
        'Contracted fingers and elbows affect vascular access, positioning and monitoring in labour.',
        'It also raises the question of which medications must be reviewed before conception.',
      ],
      ownedLooksLike: 'Connects the comorbidity to a decision, not just to a risk list.',
      surfaceLooksLike: 'Repeats that scleroderma is an autoimmune connective tissue disease.',
    },
    {
      dimensionId: 'risk',
      kind: 'counterfactual',
      quote: 'BP: 110/60, weight 120lbs, (a gain of 5 lbs)',
      question: 'A 5 lb gain by 13 weeks in a di-di twin pregnancy with a BMI of 18.4. Is that adequate? Tell me the number you are comparing it against and where it comes from.',
      whyThisProbe: 'The write-up reports the gain and never evaluates it. This asks for the comparator — the step that separates recording from assessing.',
      keyPoints: [
        'Twin gestation weight-gain targets are higher than singleton and are stratified by pre-pregnancy BMI.',
        'A BMI of 18.4 is underweight, which raises the recommended range further.',
        'The honest answer may be "I do not remember the exact range" — naming the comparator still shows the reasoning.',
      ],
      ownedLooksLike: 'Names BMI-stratified twin guidance and notices the underweight starting point.',
      surfaceLooksLike: 'Says the gain "seems fine" or "is within normal limits" with no comparator.',
    },
    {
      dimensionId: 'provenance',
      kind: 'provenance',
      quote: 'which means she is at 13 weeks gestation',
      question: 'This sentence restates the notation immediately before it. What did you intend it to establish for the reader that the notation did not?',
      whyThisProbe: 'Aimed at the passage, never at the person. Definitional paraphrase is the most common way a submission fills space that analysis should occupy, and asking what work the sentence does is answerable by anyone who meant something by it.',
      keyPoints: [
        'Restating notation in plain words is a legitimate move when the audience may not read the notation.',
        'It is not a legitimate substitute for saying what 13 weeks implies for this plan.',
        'What 13 weeks does establish: the screening window, the viability discussion, the visit interval.',
      ],
      ownedLooksLike: 'Either defends it as audience-facing plain language, or concedes it and says what should have followed.',
      surfaceLooksLike: 'Repeats the sentence a third time.',
    },
    {
      dimensionId: 'investigation',
      kind: 'method',
      quote: 'She is rubella equivocal.',
      question: 'An equivocal rubella result at 13 weeks. What do you do with it during this pregnancy, and what do you do about it afterwards?',
      whyThisProbe: 'Equivocal is neither positive nor negative, and the two timeframes have different answers. It tests whether the student read the word or the result.',
      keyPoints: [
        'Live vaccine is contraindicated during pregnancy, so the action is postpartum vaccination.',
        'During pregnancy the action is counselling on exposure avoidance.',
        'Equivocal may warrant a repeat titre rather than assuming non-immunity.',
      ],
      ownedLooksLike: 'Splits the answer by timeframe and names the contraindication as the reason.',
      surfaceLooksLike: 'Says she should be vaccinated, with no mention of timing.',
    },
  ],
  fragilities: [
    {
      quote: 'Urine is negative for glucose, nitrates and leukocytes, trace for protein.',
      note: 'Trace protein is recorded and never interpreted. In a twin pregnancy with a connective tissue disease, that is the value most worth a sentence, and it does not get one.',
    },
  ],
  /* Illustrative outcomes — see WorkedOutcome in kit.ts. Labelled as such
     everywhere they render. The artifact and the probes are real; no student
     sat this examination. */
  worked: [
    { selfGrade: 'owned', score: 1, verdictLine: 'Named iron deficiency, but read the value against a non-pregnant threshold and did not reach plasma volume expansion.' },
    { selfGrade: 'owned', score: 0, verdictLine: 'Restated the definition of scleroderma. No management consequence was reached.' },
    { selfGrade: 'notmine', score: 3, verdictLine: 'Named BMI-stratified twin guidance unprompted and flagged the underweight starting point as raising the target.' },
    { selfGrade: 'owned', score: 1, verdictLine: 'Defended the sentence as plain language for the reader, but did not say what should have followed it.' },
    { selfGrade: 'owned', score: 1, verdictLine: 'Correct on postpartum vaccination; did not address what happens during the pregnancy.' },
  ],
};

export const contraceptionSample: SampleDef = {
  id: 'nur-emergency-contraception',
  title: 'Case Study Analysis of Emergency Contraception',
  packId: 'med',
  material: emergencyContraception,
  level: 'undergraduate',
  blurb: 'Dense with borrowed numbers — 17%, 88%, 72 hours, 120 hours — each footnoted, none interrogated. The highest-value provenance surface in the corpus.',
  preset: 'quick',
  difficulty: 'defense',
  source: {
    url: 'https://micusp.elicorpora.info/view?pid=NUR.G0.01.1',
    corpus: 'MICUSP — Michigan Corpus of Upper-level Student Papers',
    who: 'Nursing · Final Year Undergraduate · Essay · A-graded',
    markers: 'Four cited statistics in four sentences, none of them unpacked. A student who wrote the sentence from a source can cite it; a student who understands it can tell you what the denominator is. The gap between those two is measurable and is not an accusation.',
    terms: 'Copyright the Regents of the University of Michigan; Fair Use statement on the site. Excerpt for analysis only.',
    originalLength: '4,817 words',
  },
  probes: [
    {
      dimensionId: 'provenance',
      kind: 'provenance',
      quote: 'an average 88% success rate of preventing pregnancy',
      question: 'Where does 88% come from, and 88% relative to what baseline? Give me the denominator.',
      whyThisProbe: 'This is the corpus’ own proposed probe for this passage. A cited number with no denominator is the most common form of borrowed authority in student writing, and the question is answerable by anyone who read the source.',
      keyPoints: [
        'The figure is a reduction against expected pregnancies without treatment, not an absolute per-act rate.',
        'The expected baseline is itself modelled, not observed, which is why the number varies between sources.',
        'Timing matters: efficacy is not flat across the 120-hour window.',
      ],
      ownedLooksLike: 'Distinguishes "88% of expected pregnancies prevented" from "88% of users do not conceive".',
      surfaceLooksLike: 'Repeats the 88% and points at the footnote.',
      variant: {
        question: 'Two sources give different efficacy figures for the same regimen. Name one methodological choice that would produce that gap.',
        whyThisProbe: 'Same target — where a number comes from — approached through disagreement rather than through a single citation.',
      },
    },
    {
      dimensionId: 'investigation',
      kind: 'counterfactual',
      quote: 'the probability of becoming pregnant peaks at 17% upon ovulation',
      question: 'Your first number is a per-act probability at peak fertility. Your second is an efficacy rate. Can those two be multiplied together to get a risk after treatment? Say why or why not.',
      whyThisProbe: 'Two borrowed numbers in adjacent sentences that do not compose. The passage never claims they do — this asks whether the student knows they cannot.',
      keyPoints: [
        'The 88% is already defined relative to an expected-pregnancy baseline, so multiplying double-counts.',
        'The 17% is cycle-day-conditional; the efficacy figure is averaged across cycle days.',
        'Composing them requires knowing which baseline each was computed against.',
      ],
      ownedLooksLike: 'Notices the baselines are different objects and refuses the multiplication.',
      surfaceLooksLike: 'Does the arithmetic.',
    },
    {
      dimensionId: 'management',
      kind: 'method',
      quote: 'hormonal pills or a copper-T Intra-Uterine Device (IUD)',
      question: 'You list two options as though they were interchangeable. Name one patient for whom the copper IUD is clearly the better choice, and say what makes it better for her specifically.',
      whyThisProbe: 'A list is not a comparison. This asks for the discriminating factor, which is where a memorised pair of options comes apart.',
      keyPoints: [
        'Copper IUD efficacy is far less affected by BMI than oral levonorgestrel.',
        'It also provides ongoing contraception, which changes the decision for someone who wants it.',
        'It requires a trained inserter and is not always accessible within the window.',
      ],
      ownedLooksLike: 'Names a specific patient factor — BMI, time since intercourse, desire for ongoing contraception.',
      surfaceLooksLike: 'Says the IUD is "more effective" without saying for whom or why.',
    },
  ],
  fragilities: [
    {
      quote: 'if a woman takes no preventative measure, an unplanned pregnancy may result',
      note: 'A sentence that cannot be false. It reads as an argument and commits to nothing — the most probe-able pattern in undergraduate writing.',
    },
  ],
};

export const motorOilSample: SampleDef = {
  id: 'bio-motor-oil',
  title: 'The Effects of Motor Oil on Aquatic Insect Predation',
  packId: 'bio',
  material: motorOil,
  level: 'undergraduate',
  blurb: 'An abstract that opens on societal framing rather than on the study’s own question. The metadata records no figures in a paper that discusses results.',
  preset: 'quick',
  difficulty: 'standard',
  source: {
    url: 'https://micusp.elicorpora.info/view?pid=BIO.G0.03.2',
    corpus: 'MICUSP — Michigan Corpus of Upper-level Student Papers',
    who: 'Biology · Final Year Undergraduate · Research Paper · A-graded',
    markers: 'The student is writing the shape of a paper before writing its content. The corpus also notes what the metadata says is missing: no tables, graphs or figures, in an experimental ecology paper that has a results discussion. An effect narrated rather than computed.',
    terms: 'Copyright the Regents of the University of Michigan; Fair Use statement on the site. Excerpt for analysis only.',
    originalLength: '2,685 words',
  },
  probes: [
    {
      dimensionId: 'precision',
      kind: 'blindspot',
      quote: 'Urban run-off has carried a number of new pollutants',
      question: 'You report an effect of motor oil on predation. How large was it, and how do you know it is not noise?',
      whyThisProbe: 'The corpus’ own probe for this artifact. The paper discusses results and the metadata records no figure anywhere in it, so the effect size is the thing most likely to have been narrated rather than computed.',
      keyPoints: [
        'An effect needs a magnitude and a spread, not just a direction.',
        'With small n, a difference in means says very little without variance.',
        'Naming the test and what it assumed is the minimum defensible answer.',
      ],
      ownedLooksLike: 'Gives a magnitude with a spread, or says plainly that the design could not distinguish it from noise.',
      surfaceLooksLike: 'Says the treatment group "showed reduced predation" and stops.',
    },
    {
      dimensionId: 'controls',
      kind: 'counterfactual',
      quote: 'including motor oil and other petroleum products',
      question: 'Motor oil forms a surface film and it is also chemically toxic. Which of those two your result is measuring — and what control separates them?',
      whyThisProbe: 'A confound that is invisible unless the student designed the experiment rather than ran it. It has a concrete answer, which makes it fair.',
      keyPoints: [
        'A surface film alters oxygen exchange and the insects’ access to the surface.',
        'An inert film — mineral oil, or a floating barrier — separates physical from chemical effect.',
        'Without that control the two mechanisms are not distinguishable in the data.',
      ],
      ownedLooksLike: 'Proposes an inert-film control and says what result would implicate which mechanism.',
      surfaceLooksLike: 'Says the study "controlled for other variables".',
    },
    {
      dimensionId: 'limits',
      kind: 'concept',
      quote: 'Modern technology and urbanization have brought about some important consequences for freshwater ecosystems.',
      question: 'Delete this opening sentence. What does the abstract lose?',
      whyThisProbe: 'Aimed at the passage. If a sentence can be removed with nothing lost, the student can usually say so — and saying so is a stronger answer than defending it.',
      keyPoints: [
        'Societal framing sets stakes but carries no claim of the study’s own.',
        'An abstract’s first sentence is the most expensive real estate in the paper.',
        'The study’s own question would serve better in that position.',
      ],
      ownedLooksLike: 'Concedes it is scaffolding, or defends it as journal-specific convention with a reason.',
      surfaceLooksLike: 'Defends it as "providing context" without saying context for what.',
    },
  ],
  fragilities: [
    {
      quote: 'into urban and suburban ponds, streams…',
      note: 'The elision is the corpus’. The excerpt ends before the study states its own question, which is itself the pattern being examined.',
    },
  ],
};

export const plantCompetitionSample: SampleDef = {
  id: 'bio-plant-competition',
  title: 'Lab 3: Plant Competition',
  packId: 'bio',
  material: plantCompetition,
  level: 'undergraduate',
  blurb: 'Titled by its position in the course, not by its finding. Two textbook-general opening sentences carrying no citation.',
  preset: 'quick',
  difficulty: 'foundations',
  source: {
    url: 'https://micusp.elicorpora.info/view?pid=BIO.G0.03.1',
    corpus: 'MICUSP — Michigan Corpus of Upper-level Student Papers',
    who: 'Biology · Final Year Undergraduate · Research Paper · A-graded',
    markers: 'The artifact is organised around the assignment rather than the finding — it is called "Lab 3". 1,255 words including references for a full experimental write-up means the discussion is thin by construction, which is exactly where "why did you conclude that?" bites. The opening two sentences are textbook-general and carry no citation: a hedge that sounds authoritative and commits to nothing.',
    terms: 'Copyright the Regents of the University of Michigan; Fair Use statement on the site. Excerpt for analysis only.',
    originalLength: '1,255 words including notes and references',
  },
  probes: [
    {
      dimensionId: 'mechanism',
      kind: 'concept',
      quote: 'Different species possess differential competitive abilities, which are often dependent upon environmental conditions.',
      question: 'Name one pair of species where the competitive ranking reverses with an environmental condition, and name the condition.',
      whyThisProbe: 'The sentence asserts that competitive ability depends on conditions. That claim is either something the student can instantiate or something they copied — and instantiating it is a fair, answerable request.',
      keyPoints: [
        'Competitive reversal along a resource gradient is the standard demonstration.',
        'Nutrient level, water availability and light are the usual reversing conditions.',
        'The student’s own experiment presumably had a condition; naming it is enough.',
      ],
      ownedLooksLike: 'Instantiates the claim with a pair and a gradient, ideally from their own data.',
      surfaceLooksLike: 'Rephrases the sentence with different words.',
    },
    {
      dimensionId: 'methodchoice',
      kind: 'method',
      quote: 'The ability of a species to compete for limited resources',
      question: 'Which resource was limiting in your experiment, and what in your design makes you sure it was that one and not another?',
      whyThisProbe: '"Limited resources" is the paper’s premise. A competition experiment that cannot name its limiting resource has not established that competition occurred at all.',
      keyPoints: [
        'Competition requires demonstrating a resource was actually limiting.',
        'A density series or a resource-addition treatment is what establishes it.',
        'Without that, an observed difference may be interference or allelopathy.',
      ],
      ownedLooksLike: 'Names the resource and the design feature that isolates it.',
      surfaceLooksLike: 'Says the plants "competed for nutrients and light".',
    },
  ],
  fragilities: [
    {
      quote: 'is often central to its ability to survive in a given environment',
      note: '"Often" and "a given environment" are both hedges. Together the sentence cannot be wrong, which is why it can open a paper without a citation.',
    },
  ],
};
