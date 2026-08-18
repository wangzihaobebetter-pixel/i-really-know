/**
 * Pre-baked sample runs, part B (ML · Chemistry · Policy evaluation · Nursing).
 * See defs-a.ts for the contract: every `quote` is a verbatim substring.
 */
import type { SampleDef } from './kit';
import mlMaterial from './material/ml-project.md?raw';
import chemMaterial from './material/chem-organic.md?raw';
import econMaterial from './material/econ-policy.md?raw';
import nursingMaterial from './material/nursing-carePlan.md?raw';

export const mlSample: SampleDef = {
  id: 'ml-project',
  title: 'SMS spam classification with TF-IDF and logistic regression',
  packId: 'ml',
  material: mlMaterial,
  level: 'masters',
  blurb: 'Applied ML mini-project: TF-IDF plus logistic regression on the UCI SMS corpus, with error analysis.',
  preset: 'standard',
  difficulty: 'standard',
  probes: [
    {
      dimensionId: 'baseline',
      kind: 'provenance',
      quote: 'Accuracy: 0.978',
      question: 'Your test set is 86.6% ham. What accuracy does a classifier that always predicts ham achieve, and which number in your metrics list is the one that actually shows you beat it?',
      whyThisProbe: 'Accuracy on an imbalanced corpus is the most reported and least informative number in the report.',
      keyPoints: [
        'The majority-class baseline is 86.6% accuracy.',
        '97.8% is a real gain but the headline overstates it.',
        'F1 or recall on spam is the number that carries the claim.',
      ],
      ownedLooksLike: 'States the baseline, computes the gap, and points at F1 or recall instead.',
      surfaceLooksLike: 'Says accuracy is high so the model is good.',
      variant: {
        question: 'Your ROC-AUC is 0.984. On this class balance, name one deployment failure that AUC would completely hide.',
        whyThisProbe: 'Same misuse of an aggregate metric, moved to the threshold-free one.',
      },
    },
    {
      dimensionId: 'metric',
      kind: 'counterfactual',
      quote: 'Recall (spam): 0.857',
      question: 'You are missing about 14% of spam. Suppose the deployment target is 95% recall. Roughly what happens to precision, and how many extra false positives per 1,000 messages should the user expect?',
      whyThisProbe: 'Moving along the precision–recall curve is the difference between reading metrics and using them.',
      keyPoints: [
        'Lowering the threshold trades precision for recall.',
        'At 13.4% prevalence, small precision drops produce many false positives in absolute terms.',
        'An order-of-magnitude estimate is what is being asked for, not a decimal.',
      ],
      ownedLooksLike: 'Reasons in absolute counts at the stated prevalence, not just in rates.',
      surfaceLooksLike: 'Says precision would decrease.',
    },
    {
      dimensionId: 'leakage',
      kind: 'method',
      quote: 'Built a TF-IDF representation with unigrams and bigrams',
      question: 'At what point in your pipeline is the TF-IDF vocabulary and IDF vector computed? Say exactly which split it sees, and what would be contaminated if you got that wrong.',
      whyThisProbe: 'The write-up never states the fit scope. This is the leak that is invisible in the metrics.',
      keyPoints: [
        'IDF must be fit on train only.',
        'Fitting on the full corpus leaks test-set term statistics.',
        'The effect is optimistic test metrics, most visibly on rare spam tokens.',
      ],
      ownedLooksLike: 'Names the fit scope explicitly and the direction of the optimism.',
      surfaceLooksLike: 'Says the pipeline was standard or used sklearn correctly.',
    },
    {
      dimensionId: 'hyper',
      kind: 'provenance',
      quote: 'noticeably helped recall on the minority class at a small precision cost',
      question: 'What does class_weight="balanced" actually do to the loss function, and roughly what weight does it assign a spam example in your corpus?',
      whyThisProbe: 'A setting chosen from a sweep can still be a black box; the weight is computable from the class counts they reported.',
      keyPoints: [
        'It reweights each class inversely to its frequency in the loss.',
        'n / (2 × n_spam) = 5572 / (2 × 747) ≈ 3.7.',
        'It shifts the decision boundary, not the ranking quality.',
      ],
      ownedLooksLike: 'Computes roughly 3.7 from their own numbers and separates the boundary from the ranking.',
      surfaceLooksLike: 'Says it handles class imbalance.',
    },
    {
      dimensionId: 'diagnosis',
      kind: 'blindspot',
      quote: 'I read through the 17 false negatives on the test set.',
      question: 'You looked at test-set errors and then proposed model changes. Name the methodological problem with that loop, and what you should have used instead.',
      whyThisProbe: 'The error analysis is the best part of the report and it quietly burns the test set.',
      keyPoints: [
        'Inspecting the test set and iterating turns it into a second validation set.',
        'Reported test numbers become optimistic.',
        'Error analysis belongs on validation data, with test held back.',
      ],
      ownedLooksLike: 'Names test-set contamination honestly without over-claiming its size.',
      surfaceLooksLike: 'Defends it because no model was retrained yet.',
    },
  ],
  fragilities: [
    {
      quote: 'No stemming or lemmatisation — I wanted to compare against a stemmed version as a follow-up',
      note: 'A comparison named but not run; the choice is currently unjustified either way.',
    },
    {
      quote: 'a small character-level CNN or character n-gram model might catch them',
      note: 'A remedy proposed with no argument that character features separate these specific examples.',
    },
  ],
};

export const chemSample: SampleDef = {
  id: 'chem-organic',
  title: 'Synthesis and characterisation of acetylsalicylic acid',
  packId: 'chem',
  material: chemMaterial,
  level: 'undergraduate',
  blurb: 'Organic chemistry lab write-up: acetylation of salicylic acid with NMR, IR and melting-point data.',
  preset: 'standard',
  difficulty: 'standard',
  probes: [
    {
      dimensionId: 'quant',
      kind: 'provenance',
      quote: '**Percent yield: 59.8%.**',
      question: 'Recompute the theoretical yield out loud from your masses, and tell me why acetic anhydride at 7.3 equivalents does not appear anywhere in that calculation.',
      whyThisProbe: 'Limiting-reagent logic is the single most mechanical thing in the report and the easiest to have copied.',
      keyPoints: [
        '7.24 mmol × 180.16 g/mol = 1.304 g theoretical.',
        'Salicylic acid is limiting; the anhydride is in large excess.',
        'Excess reagent never enters the theoretical yield.',
      ],
      ownedLooksLike: 'Does the arithmetic and states why the excess reagent is irrelevant.',
      surfaceLooksLike: 'Reads the numbers back from the report.',
      variant: {
        question: 'If your salicylic acid had been 5% wet by mass, what would the true percent yield be, and which direction is your reported number wrong?',
        whyThisProbe: 'Same calculation with an error term that must be propagated rather than recalled.',
      },
    },
    {
      dimensionId: 'mechanism',
      kind: 'concept',
      quote: 'phenoxide pKa ≈ 10 vs carboxylic acid pKa ≈ 3',
      question: 'You used two pKa values to argue about nucleophilicity. Explain why the more acidic group is the less nucleophilic one here — and name the condition under which your argument would fail.',
      whyThisProbe: 'The report states the right conclusion from an argument that is not quite the right argument.',
      keyPoints: [
        'Carboxylate is delocalised over two oxygens, lowering nucleophilicity.',
        'Acidity and nucleophilicity are different properties, related through charge delocalisation.',
        'Under strongly basic conditions the carboxylate would dominate by concentration.',
      ],
      ownedLooksLike: 'Separates thermodynamic acidity from kinetic nucleophilicity and gives a failing condition.',
      surfaceLooksLike: 'Repeats that phenoxide is more nucleophilic because the pKa is higher.',
    },
    {
      dimensionId: 'characterization',
      kind: 'counterfactual',
      quote: '2.34 (s, 3H, COCH₃)',
      question: 'If your product were still mostly unreacted salicylic acid, which peaks in this ¹H NMR list would disappear and which would remain? Name the single peak that carries your identity claim.',
      whyThisProbe: 'Peak assignment can be table-driven; deciding which signal is diagnostic cannot.',
      keyPoints: [
        'The 2.34 singlet is the acetyl methyl and is absent in salicylic acid.',
        'Aromatic signals persist with shifted positions.',
        'The methyl singlet is the diagnostic peak.',
      ],
      ownedLooksLike: 'Names the acetyl singlet as the discriminator and predicts the aromatic shift.',
      surfaceLooksLike: 'Restates the assignments in order.',
    },
    {
      dimensionId: 'conditions',
      kind: 'counterfactual',
      quote: 'at 85 °C for 15 minutes',
      question: 'You ran this at 85 °C for 15 minutes. What specifically would you observe, in your own data, if you had run it at 140 °C for an hour instead?',
      whyThisProbe: 'Condition choices are usually inherited from the handout; the observable consequence is not.',
      keyPoints: [
        'Higher temperature and longer time increase hydrolysis and side products.',
        'Melting point would broaden and depress.',
        'Extra TLC spots and altered NMR integration would appear.',
      ],
      ownedLooksLike: 'Predicts changes in their own three characterisation outputs.',
      surfaceLooksLike: 'Says the yield would be lower or the product impure.',
    },
    {
      dimensionId: 'error',
      kind: 'blindspot',
      quote: 'The biggest source of yield loss is probably transfer during the recrystallisation',
      question: 'You attribute the missing 40% mostly to transfer loss. Give a rough number for how much mass 30 mL of ethanol/water per gram can hold in solution, and say whether transfer loss can really be the biggest term.',
      whyThisProbe: 'Error analysis that names a plausible cause without sizing it is the field-standard way to avoid the question.',
      keyPoints: [
        'Recrystallisation loss to the mother liquor is inherent and often 10 to 30%.',
        'Solubility at the final temperature sets the floor.',
        'Transfer loss is usually smaller than dissolved-product loss.',
      ],
      ownedLooksLike: 'Ranks the loss terms and identifies the mother liquor as the dominant one.',
      surfaceLooksLike: 'Repeats transfer loss or invokes human error.',
    },
  ],
  fragilities: [
    {
      quote: 'only one spot was visible, but I cannot rule out trace impurities below the limit of detection',
      note: 'A correct hedge that does the work of a sensitivity estimate without providing one.',
    },
    {
      quote: 'The mixed-melting-point test with authentic ASA showed no depression, supporting identity',
      note: 'Strong evidence, stated without the amount of authentic material used.',
    },
  ],
};

export const econSample: SampleDef = {
  id: 'econ-policy',
  title: 'Medicaid expansion and the low-income uninsured rate',
  packId: 'epi',
  material: econMaterial,
  level: 'masters',
  blurb: 'Program-evaluation problem set: difference-in-differences on the 2014 Medicaid expansion using ACS data.',
  preset: 'defense',
  difficulty: 'defense',
  probes: [
    {
      dimensionId: 'design',
      kind: 'method',
      quote: 'The identifying assumption is parallel trends',
      question: 'Parallel trends is an assumption about a counterfactual you never observe. State precisely what it says here, and explain why your pre-period test is evidence for it rather than proof of it.',
      whyThisProbe: 'Nearly every DiD write-up states the assumption correctly and then treats a pre-trend test as having verified it.',
      keyPoints: [
        'It says treated states would have followed control trends absent expansion, in the post period.',
        'Pre-period parallelism is observable; post-period counterfactual parallelism is not.',
        'A passed pre-trend test is consistent with, but does not establish, the assumption.',
      ],
      ownedLooksLike: 'Locates the assumption in the unobserved post period and calls the test suggestive.',
      surfaceLooksLike: 'Says the parallel-trends assumption was tested and holds.',
      variant: {
        question: 'Name a concrete state-level event in 2015 that would violate parallel trends while leaving your pre-period graph looking perfect.',
        whyThisProbe: 'Forces the abstract assumption into a specific, checkable threat.',
      },
    },
    {
      dimensionId: 'bias',
      kind: 'counterfactual',
      quote: 'excluding the 7 late expanders from the control set to keep treatment timing clean',
      question: 'You dropped the 7 late expanders. Name the direction that biases your estimate, and describe the states you have effectively made your control group.',
      whyThisProbe: 'A sample restriction made for cleanliness silently redefines the estimand.',
      keyPoints: [
        'Never-expanders differ systematically from late expanders on politics and baseline uninsurance.',
        'The control group becomes the most resistant states, not the average non-expander.',
        'The estimate is a local effect for that comparison, not a national one.',
      ],
      ownedLooksLike: 'Describes the changed estimand rather than only naming a bias direction.',
      surfaceLooksLike: 'Says it keeps the design clean.',
    },
    {
      dimensionId: 'causal',
      kind: 'blindspot',
      quote: 'the DiD picks up the joint effect of expansion *and* the broader mandate, not expansion alone',
      question: 'You correctly flagged this. Now defend the opposite position: give the argument that the DiD still isolates expansion, and say what would have to be true for it.',
      whyThisProbe: 'They wrote the caveat. This asks whether they can reason on both sides of it, which is what owning it means.',
      keyPoints: [
        'The mandate and exchange subsidies applied nationally, in both groups.',
        'A common national shock differences out in DiD.',
        'It only survives if the national policies affected both groups equally, which income composition makes doubtful.',
      ],
      ownedLooksLike: 'Notes that national shocks difference out and then names why the equal-effect condition fails here.',
      surfaceLooksLike: 'Restates the limitation.',
    },
    {
      dimensionId: 'measure',
      kind: 'provenance',
      quote: 'approximately **−14.7 percentage points**',
      question: 'Derive −14.7 from your own descriptive numbers, then say what you would have to assume for that arithmetic to be the actual regression estimate.',
      whyThisProbe: 'The gap between a two-by-two difference and a regression coefficient is where DiD understanding lives.',
      keyPoints: [
        'Treated 41.7 → post average versus control 42.2 → post average, differenced.',
        'The simple arithmetic equals the regression only with two periods, two groups and no weighting.',
        'With nine years, fixed effects and clustering, they diverge.',
      ],
      ownedLooksLike: 'Does the subtraction and names the conditions under which it coincides with the coefficient.',
      surfaceLooksLike: 'Points at the reported estimate.',
    },
    {
      dimensionId: 'analysis',
      kind: 'method',
      quote: '95% CI from a state-clustered bootstrap',
      question: 'You clustered on state with 43 states. Name the specific statistical problem with that number of clusters and what you would do about it.',
      whyThisProbe: 'Cluster-robust inference is routinely invoked at exactly the sample size where it starts to fail.',
      keyPoints: [
        'Cluster-robust standard errors are asymptotic in the number of clusters.',
        'Around 40 clusters they are downward biased, so intervals are too narrow.',
        'Wild cluster bootstrap or a t-distribution correction is the standard fix.',
      ],
      ownedLooksLike: 'Names the few-clusters problem and the direction of the bias.',
      surfaceLooksLike: 'Says clustering accounts for within-state correlation.',
    },
  ],
  fragilities: [
    {
      quote: 'The panel is unbalanced in years because not every state reports every year',
      note: 'Unbalanced panels interact with fixed effects and weighting; no handling is described.',
    },
    {
      quote: 'I tested this assumption visually and with a placebo test using 2010–2013 data',
      note: 'A visual test and a placebo test are reported without their results.',
    },
  ],
};

export const nursingSample: SampleDef = {
  id: 'nursing-carePlan',
  title: 'Nursing care plan for CHF exacerbation',
  packId: 'med',
  material: nursingMaterial,
  level: 'undergraduate',
  blurb: 'Care plan for a 72-year-old with HFrEF exacerbation: four NANDA diagnoses, SMART goals, rationale.',
  preset: 'standard',
  difficulty: 'standard',
  probes: [
    {
      dimensionId: 'management',
      kind: 'counterfactual',
      quote: '**Furosemide 40 mg IV BID with daily BMP.**',
      question: 'Her creatinine is already up from 1.1 to 1.4. Give the criterion you would use to decide that a further creatinine rise means "keep diuresing" rather than "stop".',
      whyThisProbe: 'Cardiorenal decisions are where a care plan stops being a checklist. The rule cannot be copied.',
      keyPoints: [
        'A modest creatinine rise with ongoing decongestion is often acceptable.',
        'The decision turns on volume status, urine output and symptoms, not creatinine alone.',
        'Rising creatinine with a dry patient or hypotension means stop.',
      ],
      ownedLooksLike: 'Gives a rule that combines volume status with the renal number.',
      surfaceLooksLike: 'Says to monitor renal function and notify the provider.',
      variant: {
        question: 'Her potassium comes back at 3.1 on day two. What in your plan changes, in what order, and what must happen before the next furosemide dose?',
        whyThisProbe: 'Same drug, a different predictable complication, requiring sequencing rather than a list.',
      },
    },
    {
      dimensionId: 'findings',
      kind: 'provenance',
      quote: 'HR 102 and irregularly irregular',
      question: 'You documented an irregularly irregular pulse but no nursing diagnosis references it. Name what it most likely is, and one thing in your plan that becomes higher priority because of it.',
      whyThisProbe: 'A recorded finding that never reappears in the plan is the clearest test of whether the assessment was read or transcribed.',
      keyPoints: [
        'Irregularly irregular at 102 suggests atrial fibrillation with RVR.',
        'It raises stroke risk and worsens diastolic filling.',
        'Anticoagulation assessment and rate control move up.',
      ],
      ownedLooksLike: 'Names AF and connects it to a specific plan item such as anticoagulation.',
      surfaceLooksLike: 'Says telemetry will monitor for arrhythmias.',
    },
    {
      dimensionId: 'patho',
      kind: 'concept',
      quote: 'fluid restriction protects against worsening hyponatraemia (Na 133 on admission)',
      question: 'Explain, in this patient, why sodium is low when her total body sodium is high. Then say whether furosemide raises or lowers her sodium, and why that is not a simple answer.',
      whyThisProbe: 'Dilutional hyponatraemia in heart failure is the mechanism most often written down correctly and understood least.',
      keyPoints: [
        'Low effective circulating volume drives ADH, retaining free water.',
        'Total body sodium is high; serum sodium is diluted.',
        'Loop diuretics produce hypotonic urine and can raise serum sodium, but volume depletion can worsen the ADH drive.',
      ],
      ownedLooksLike: 'Explains ADH-driven free-water retention and gives both directions of the diuretic effect.',
      surfaceLooksLike: 'Says fluid overload dilutes the sodium.',
    },
    {
      dimensionId: 'risk',
      kind: 'blindspot',
      quote: 'Supplemental O₂ titrated to SpO₂ ≥ 94%',
      question: 'Your goal states SpO₂ ≥ 94% on room air within 24 hours of starting oxygen and diuresis. What is wrong with tying that timeframe to this patient, and what would you write instead?',
      whyThisProbe: 'A SMART goal with an unjustified deadline is the commonest defect in care plans, and this one has it.',
      keyPoints: [
        'Decongestion in HFrEF frequently takes longer than 24 hours.',
        'A missed arbitrary deadline drives inappropriate escalation.',
        'A trajectory-based criterion is more defensible than a fixed clock.',
      ],
      ownedLooksLike: 'Rewrites the goal around a trajectory and names why the fixed deadline is unsafe.',
      surfaceLooksLike: 'Defends the 24 hours because goals must be time-bound.',
    },
    {
      dimensionId: 'ddx',
      kind: 'method',
      quote: 'She admits to dietary non-adherence',
      question: 'You attributed this exacerbation to dietary non-adherence. Name two other precipitants consistent with her documented findings, and the single piece of data that would separate them.',
      whyThisProbe: 'The first plausible cause offered by the patient is the one that stops the reasoning.',
      keyPoints: [
        'New atrial fibrillation and medication non-adherence are both consistent here.',
        'Ischaemia and infection also precipitate decompensation.',
        'Comparing this ECG with a prior one, or a medication reconciliation, discriminates.',
      ],
      ownedLooksLike: 'Uses her own irregular rhythm as a competing precipitant and names a discriminating test.',
      surfaceLooksLike: 'Lists textbook precipitants without tying them to her findings.',
    },
  ],
  fragilities: [
    {
      quote: 'written and verbal discharge instructions have higher retention than verbal alone',
      note: 'A general evidence claim used as the rationale for a patient-specific intervention.',
    },
    {
      quote: 'if not, education is repeated and discharge is delayed until teach-back passes',
      note: 'A discharge-blocking criterion stated without who decides or how many attempts.',
    },
  ],
};
