/**
 * Sample runs, part B — computer science, machine learning, statistics, physics.
 * Same rules as part A: real artifacts, source URLs, verbatim excerpts.
 * See `research/ireallyknow/01-student-submissions.md`.
 */
import type { SampleDef } from './kit';
import graphC from './material/cs-graph-c.md?raw';
import sportsGambling from './material/ml-sports-gambling.md?raw';
import tuberculosis from './material/stats-tuberculosis.md?raw';
import planck from './material/phys-planck.md?raw';

export const graphSample: SampleDef = {
  id: 'cs-graph-c',
  title: 'Course-prerequisite graph, submitted as Project23.cpp',
  packId: 'cs',
  material: graphC,
  level: 'undergraduate',
  blurb: 'A real submitted assignment with a real silent bug, and the instructor’s own grading criteria sitting in the same repository.',
  preset: 'standard',
  difficulty: 'defense',
  source: {
    url: 'https://github.com/fazeelkhalid/graph-real-time-problems',
    corpus: 'Public student repository (UTA CSE course materials)',
    who: 'Undergraduate · C programming assignment · self-published',
    markers: 'The richest single artifact in the corpus. (1) The spec says "All the code must be in C" and "Submit courses_graph.c"; the submitted file is Project23.cpp — real submissions violate their own spec routinely. (2) A real, silent bug: malloc(count * sizeof(char)) allocates count bytes for an array of count pointers. It compiles and often appears to work. (3) The instructor’s Grading_Criteria.txt is co-located, giving a ground-truth map from artifact to what an examiner was told to check — normally the expensive part.',
    terms: 'Public GitHub repository, self-published by the student. Short excerpt shown; full repository at the source URL.',
    originalLength: 'Project23.cpp, 3,791 bytes',
  },
  probes: [
    {
      dimensionId: 'invariants',
      concept: 'Pointer-array allocation size',
      kind: 'blindspot',
      quote: '*allNodes = (char **)malloc(count * sizeof(char));',
      question: 'This line allocates count * sizeof(char) for a char**. Walk me through what that actually buys you on a 64-bit machine.',
      whyThisProbe: 'The corpus’ own probe for this line. A student who wrote it can explain what they intended; a student who pasted it cannot. It is also precisely the class of error the rubric’s 14 Valgrind points exist to catch.',
      keyPoints: [
        'sizeof(char) is 1, so this allocates count bytes.',
        'The array needs count pointers — 8 bytes each on a 64-bit target — so it is 8× short.',
        'It compiles cleanly and often appears to work, because the heap frequently has slack past the allocation.',
        'The correct expression is sizeof(char *), or better, sizeof(**allNodes).',
      ],
      ownedLooksLike: 'Computes both sizes, names the factor of 8, and explains why it does not crash immediately.',
      surfaceLooksLike: 'Says it "allocates memory for the nodes" or that it should use sizeof(char*), with no account of why it seems to work.',
      variant: {
        question: 'The grading criteria award 14 points for a clean Valgrind run and take all of them away for any invalid read or write. Which line in this excerpt loses those points, and what would Valgrind actually print?',
        whyThisProbe: 'Same defect, approached through the instructor’s own rubric rather than through the arithmetic.',
      },
    },
    {
      dimensionId: 'edges',
      concept: 'Handling a failed allocation',
      kind: 'counterfactual',
      quote: 'if ((*allNodes)[i] == NULL)',
      question: 'This detects a failed allocation and then prints. Execution continues to the next line. What happens next, and what did you intend to happen?',
      whyThisProbe: 'A check whose result is not acted on is the signature of an error path that was written from a template. The concrete consequence is one line away.',
      keyPoints: [
        'The very next statement is strcpy into that NULL pointer — an immediate segfault.',
        'Detecting and not handling is worse than not detecting, because it looks defensive.',
        'The intended handling is return, exit, or unwinding the partial allocation.',
      ],
      ownedLooksLike: 'Names strcpy on the following line as the crash site.',
      surfaceLooksLike: 'Says it "prints an error message so the user knows".',
    },
    {
      dimensionId: 'design',
      concept: 'Buffer length and the NUL terminator',
      kind: 'method',
      quote: 'malloc(sizeof(char) * 31)',
      question: 'Why 31? Name what that number encodes, and what happens to a node name that needs 31 characters.',
      whyThisProbe: 'A magic number is either a decision or a copy. If it is a decision, the student can name the constraint it came from.',
      keyPoints: [
        '31 is presumably a 30-character name plus the NUL terminator.',
        'strcpy of a 31-character name writes 32 bytes and overflows by one.',
        'The bound belongs in a named constant checked at the read site, not repeated at the allocation.',
      ],
      ownedLooksLike: 'Accounts for the terminator and identifies the off-by-one at the boundary.',
      surfaceLooksLike: 'Says 31 is "long enough for a course name".',
    },
  ],
  fragilities: [
    {
      quote: 'strcpy((*allNodes)[i], "");',
      note: 'Zeroing a freshly allocated buffer by copying an empty string. Harmless in intent, but it is the write that turns the failed-allocation path from a printed message into a crash.',
    },
  ],
  worked: [
    { selfGrade: 'owned', score: 0, verdictLine: 'Said it allocates memory for the node array. Did not reach sizeof(char) being 1, and did not account for why the program still runs.' },
    { selfGrade: 'owned', score: 1, verdictLine: 'Identified that the error is not handled; did not name strcpy on the following line as the crash site.' },
    { selfGrade: 'notmine', score: 3, verdictLine: 'Accounted for the NUL terminator unprompted and located the off-by-one at a 31-character name.' },
  ],
};

export const gamblingSample: SampleDef = {
  id: 'ml-sports-gambling',
  title: 'The Bank is Open: AI in Sports Gambling',
  packId: 'ml',
  material: sportsGambling,
  level: 'undergraduate',
  blurb: 'A CS229 final project whose entire claim is one number — 51.5% — reported with no confidence interval and no break-even threshold.',
  preset: 'standard',
  difficulty: 'defense',
  source: {
    url: 'https://cs229.stanford.edu/proj2018/report/3.pdf',
    corpus: 'Stanford CS229 Fall 2018 public project archive (242 reports)',
    who: 'Alexandre Bucquet and Vishnu Sarukkai · undergraduate final project · 6 pages',
    markers: '51.5% is the entire claim of the paper and is presented without a confidence interval or a break-even threshold. "This may be because…" is unhedged speculation about someone else’s method, stated as explanation. Two named undergraduates writing under a deadline, not a lab — the reasoning-to-polish ratio is the realistic one.',
    terms: 'Publicly published by Stanford CS229; copyright the authors. Excerpt for analysis, full report at the source URL.',
    originalLength: '6 pages',
  },
  probes: [
    {
      dimensionId: 'metric',
      kind: 'concept',
      quote: 'our best models can beat the house 51.5% of the time',
      question: '51.5% over how many games — and what is the break-even win rate against the vig?',
      whyThisProbe: 'The corpus’ own probe. This is the paper’s whole claim, and both halves of the question are things the authors must have known to make the claim at all.',
      keyPoints: [
        'Standard -110 pricing puts break-even at roughly 52.4%.',
        '51.5% is therefore below break-even: the headline result loses money.',
        'Without n, the standard error is unknown — over 500 games, ±2.2 points at 95%.',
      ],
      ownedLooksLike: 'Names a break-even near 52.4% and notices 51.5% is beneath it.',
      surfaceLooksLike: 'Says the model "beats the market" or that 51.5% is "above chance".',
      variant: {
        question: 'Your model is right 51.5% of the time on a held-out season. Write down the bet sizing that turns that into a positive expected return, or explain why none exists.',
        whyThisProbe: 'Same target — what the number is worth — approached through the decision it is supposed to support.',
      },
    },
    {
      dimensionId: 'leakage',
      kind: 'blindspot',
      quote: 'We use Neural Networks as well as recurrent models for this task',
      question: 'A recurrent model over NBA games has an obvious way to see the future. Name the feature most likely to leak, and say what your split would have to look like to stop it.',
      whyThisProbe: 'Sequence models on sports data leak through season-aggregate features almost by default. The question names no fault; it asks for the mechanism.',
      keyPoints: [
        'Season-long averages computed over the full season leak into earlier games.',
        'Rest days, injury status and line movement are all future-conditioned if taken at the wrong timestamp.',
        'The split has to be strictly chronological, with features computed as-of each game date.',
      ],
      ownedLooksLike: 'Names an as-of computation and a chronological split.',
      surfaceLooksLike: 'Says they used a train/test split and shuffled the data.',
    },
    {
      dimensionId: 'honesty',
      kind: 'provenance',
      quote: 'This may be because high-dimensional Gaussians are not the most appropriate way to model NFL point totals and point spreads.',
      question: 'This explains another team’s result. What evidence would distinguish your explanation from the two or three other explanations for the same 2% gap?',
      whyThisProbe: 'Aimed at the sentence, not at the authors. A causal story attached to someone else’s result is a claim, and a claim has a test.',
      keyPoints: [
        'Alternatives: less data, worse features, a different evaluation window, or the line simply being efficient.',
        'Distinguishing them needs an ablation, not a plausible mechanism.',
        '"May be" is doing a lot of work — the honest form is to list the candidates.',
      ],
      ownedLooksLike: 'Names at least one competing explanation and the ablation that would separate them.',
      surfaceLooksLike: 'Restates that Gaussians are a poor fit for this data.',
    },
  ],
  fragilities: [
    {
      quote: 'results that are similar to those of the sports books',
      note: 'Similar to the books is the null result for this task — the books are the benchmark. Stated as an achievement in the abstract.',
    },
  ],
};

export const tuberculosisSample: SampleDef = {
  id: 'stats-tuberculosis',
  title: 'Global Inequalities in Tuberculosis Mortality',
  packId: 'stats',
  material: tuberculosis,
  level: 'undergraduate',
  blurb: 'A USCLAP award-winning intro-statistics project with a well-written Limitations section that is not load-bearing anywhere.',
  preset: 'standard',
  difficulty: 'standard',
  source: {
    url: 'https://causeweb.org/usproc/sites/default/files/usclap/2025-2/usclap%203569%20-%20global%20inequalities%20in%20tuberculosis.pdf',
    corpus: 'USCLAP — Undergraduate Statistics Class Project competition (CAUSE + American Statistical Association)',
    who: 'Esther Jeon, Peggy Fu, Aileen Guan · Carleton College · Introductory Statistics · 3rd place, Fall 2025 · instructor Amanda Luby',
    markers: 'The Limitations section is well written and generic. It names confounding, missingness and ecological aggregation — the three limitations every intro-stats student is taught to name — and applies none of them back to a specific number in the paper. Correct-sounding caveats that are not load-bearing. The paper also runs a one-way ANOVA and pairwise t-tests without mentioning a multiple-comparison correction.',
    terms: 'Published openly by CAUSE/ASA as a competition winner; copyright the authors. Excerpt for analysis, full PDF at the source URL.',
    originalLength: '9 pages',
  },
  probes: [
    {
      dimensionId: 'limits',
      concept: 'Direction of bias from non-random missingness',
      kind: 'counterfactual',
      quote: 'some observations are excluded in analysis due to missing values, which may introduce bias if some regions are more prone to missing data',
      question: 'Which regions were dropped, how many country-years, and which direction would that push your ANOVA?',
      whyThisProbe: 'The corpus’ own probe. The sentence is correct and generic. Every part of this question is answerable from the analysis the authors actually ran, which is what makes a generic caveat separable from a considered one.',
      keyPoints: [
        'Missingness in TB surveillance is not random — it concentrates in low-capacity health systems.',
        'Those are also the high-mortality, low-detection cases, so dropping them attenuates the very relationship reported.',
        'The direction is therefore predictable, not merely "may introduce bias".',
      ],
      ownedLooksLike: 'Names a direction and ties it to which regions go missing and why.',
      surfaceLooksLike: 'Repeats that missing data may bias results.',
      variant: {
        question: 'Suppose the missing country-years were filled in with a regional median. Would your negative correlation get stronger or weaker, and why?',
        whyThisProbe: 'Same target — whether the caveat is load-bearing — made concrete by an imputation.',
      },
    },
    {
      dimensionId: 'assumptions',
      concept: 'Multiple comparisons after ANOVA',
      kind: 'method',
      quote: 'one-way ANOVA, pairwise t-tests, and linear regression inference',
      question: 'You ran an ANOVA and then pairwise t-tests across regions. How many comparisons was that, and what did you do about it?',
      whyThisProbe: 'A real, checkable technical gap in an award-winning project: no multiple-comparison correction is mentioned. The question asks for a count and a decision, both of which have exact answers.',
      keyPoints: [
        'Six WHO regions give 15 pairwise comparisons.',
        'At α = 0.05 uncorrected, the family-wise error rate is above 50%.',
        'Tukey HSD or Bonferroni is the standard response; saying "we did not correct" is also a defensible answer if the reason is given.',
      ],
      ownedLooksLike: 'Computes the number of comparisons and names a correction, or defends omitting one.',
      surfaceLooksLike: 'Says the t-tests confirmed the ANOVA result.',
    },
    {
      dimensionId: 'interpretation',
      concept: 'Shared-denominator correlation',
      kind: 'concept',
      quote: 'demonstrates an overall strong negative correlation between detection rate and mortality',
      question: 'Detection rate is a ratio whose denominator is estimated incidence. Mortality is also scaled by that same estimate. What does that shared denominator do to a correlation between them?',
      whyThisProbe: 'The paper’s headline relationship may be partly an artifact of shared denominators — a real statistical issue that the generic Limitations section does not reach.',
      keyPoints: [
        'Two ratios sharing a denominator are spuriously correlated even when the numerators are independent.',
        'Both quantities depend on WHO’s modelled incidence estimate.',
        'The check is whether the relationship survives using absolute counts.',
      ],
      ownedLooksLike: 'Recognises spurious correlation from a shared denominator and proposes the absolute-count check.',
      surfaceLooksLike: 'Restates that correlation is not causation.',
    },
  ],
  fragilities: [
    {
      quote: 'Thus, our findings should be interpreted as correlations only.',
      note: 'The sentence every intro-stats student is taught to write. It is true, and it does no work here — nothing later in the paper is qualified by it.',
    },
  ],
  worked: [
    { selfGrade: 'owned', score: 0, verdictLine: 'Repeated that missingness may bias results. No direction, no regions named.' },
    { selfGrade: 'shaky', score: 2, verdictLine: 'Reached 15 comparisons and named Bonferroni; did not compute the family-wise error rate.' },
    { selfGrade: 'notmine', score: 3, verdictLine: 'Identified the shared denominator unprompted and proposed re-running on absolute counts.' },
  ],
};

export const planckSample: SampleDef = {
  id: 'phys-planck',
  title: 'Measuring Planck’s Constant with the Photoelectric Effect',
  packId: 'phys',
  material: planck,
  level: 'undergraduate',
  blurb: '"In good agreement with the accepted value" — with no uncertainty stated anywhere in the abstract. The canonical undergraduate lab move.',
  preset: 'quick',
  difficulty: 'standard',
  source: {
    url: 'https://micusp.elicorpora.info/view?pid=PHY.G0.01.1',
    corpus: 'MICUSP — Michigan Corpus of Upper-level Student Papers',
    who: 'Physics · Final Year Undergraduate · Research Paper · A-graded',
    markers: '"In good agreement with the accepted value" with no uncertainty stated in the abstract. Note also that the MICUSP transcription renders the number itself as "[Formula here]" — a standing reminder that the most probe-worthy content in a quantitative submission is often in an equation, figure or table that a naive text extractor drops. A pipeline that loses formulas will systematically fail to probe the one place understanding is visible.',
    terms: 'Copyright the Regents of the University of Michigan; Fair Use statement on the site. Excerpt for analysis only.',
    originalLength: '1,690 words',
  },
  probes: [
    {
      dimensionId: 'uncertainty',
      kind: 'concept',
      quote: 'which is in good agreement with the accepted value',
      question: 'Define "good agreement" numerically. How many standard errors away from the accepted value is your result?',
      whyThisProbe: 'The claim is the paper’s conclusion and the abstract states no uncertainty at all, so the phrase is either shorthand for a computed quantity or a substitute for one.',
      keyPoints: [
        'Agreement is a statement about the discrepancy relative to the combined uncertainty.',
        'Within one standard error is unremarkable; within three is still agreement; outside that needs an account.',
        'Without an uncertainty the phrase carries no information.',
      ],
      ownedLooksLike: 'Frames agreement as discrepancy over uncertainty and names roughly where their result sat.',
      surfaceLooksLike: 'Says the value was "close to" the accepted one.',
    },
    {
      dimensionId: 'model',
      kind: 'method',
      quote: 'the stopping potential is dependent on the frequency of impinging light',
      question: 'Your slope gives h/e. Name the two largest systematic errors in that slope, and say which direction each pushes your value of h.',
      whyThisProbe: 'Systematics with a named direction is the difference between running an experiment and understanding it. Both candidates are standard for this apparatus.',
      keyPoints: [
        'Reverse photocurrent from the anode makes the measured stopping potential too small.',
        'Contact potential difference offsets the intercept rather than the slope.',
        'Non-monochromatic light and photocathode work-function inhomogeneity broaden the cut-off.',
      ],
      ownedLooksLike: 'Names a systematic and gets its direction right, and distinguishes slope effects from intercept effects.',
      surfaceLooksLike: 'Lists "human error" and "equipment limitations".',
    },
  ],
  fragilities: [
    {
      quote: 'We qualitatively determine',
      note: '"Qualitatively determine" in a paper whose purpose is to measure a constant. The word concedes the measurement is not the argument, and nothing later resolves it.',
    },
  ],
};
