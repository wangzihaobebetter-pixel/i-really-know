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
      concept: 'Physiologic anaemia in twin pregnancy',
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
      zh: {
        question: '13 周的双胎，Hgb 10、Hct 32 —— 这是一个异常发现，还是正常的？什么会让你改口？',
        keyPoints: [
          '血浆容量的扩张快于红细胞量，双胎更明显 —— 稀释性下降是预期之内的。',
          '妊娠期贫血的参考阈值按孕期分段，不是一条统一的线。',
          '能让你改口的东西：MCV、铁蛋白、孕前基线、有没有症状。',
        ],
        ownedLooksLike: '把稀释性下降和真正的贫血分开，并说出一项能定性的检查。',
        surfaceLooksLike: '只说这个值「偏低」、建议补铁，既没有机制也没有阈值。',
      },
      variant: {
        question: 'You have the same patient at 28 weeks with Hgb 9.4. Has anything changed about how you read it, and what do you do differently?',
        whyThisProbe: 'Moves the same value into a trimester where the expected physiology is different.',
      },
    },
    {
      dimensionId: 'patho',
      concept: 'Scleroderma management in pregnancy',
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
      zh: {
        question: '硬皮病在你的病史里只出现了一句，后面再没提过。说出它改变这一次妊娠管理的一个具体点，以及它改变分娩方案的一个具体点。',
        keyPoints: [
          '硬皮病带来肾危象和高血压疾病的风险，这直接改变了这里的血压读数意味着什么。',
          '手指和肘部挛缩会影响静脉通路、体位摆放和产程监护。',
          '它同时提出一个问题：哪些药物必须在孕前就复核。',
        ],
        ownedLooksLike: '把这个合并症连到一个决定上，而不是连到一串风险词上。',
        surfaceLooksLike: '重复一遍硬皮病是一种自身免疫性结缔组织病。',
      },
    },
    {
      dimensionId: 'risk',
      concept: 'BMI-stratified weight gain for twins',
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
      zh: {
        question: 'BMI 18.4 的双绒双羊双胎，到 13 周增重 5 磅。这够吗？告诉我你在跟哪个数字比，以及那个数字从哪来。',
        keyPoints: [
          '双胎的增重目标高于单胎，并且按孕前 BMI 分层。',
          'BMI 18.4 属于偏瘦，这会把推荐区间再往上抬。',
          '诚实的答案可以是「我不记得确切区间」—— 说得出你在跟什么比，推理就已经站住了。',
        ],
        ownedLooksLike: '说得出按 BMI 分层的双胎增重区间，并注意到她的起点是偏瘦。',
        surfaceLooksLike: '说增重「看着还行」或「在正常范围内」，但拿不出参照。',
      },
    },
    {
      dimensionId: 'provenance',
      concept: 'What a restated clinical notation adds',
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
      zh: {
        question: '这句话把它前面那行记录又说了一遍。你原本想让它给读者建立什么，是那行记录没给到的？',
        keyPoints: [
          '当读者未必读得懂专业记录时，用白话复述是正当的写法。',
          '但它不能替代「13 周对这个方案意味着什么」这句该说而没说的话。',
          '13 周真正确立的是：筛查窗口、生存力讨论、随访间隔。',
        ],
        ownedLooksLike: '要么把它辩护成写给非专业读者看的白话，要么承认它多余并说出本该接上的是什么。',
        surfaceLooksLike: '把同一句话第三次复述一遍。',
      },
    },
    {
      dimensionId: 'investigation',
      concept: 'Rubella vaccination timing in pregnancy',
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
      zh: {
        question: '13 周查出风疹抗体结果可疑。这次妊娠期间你怎么处理，妊娠结束之后又怎么处理？',
        keyPoints: [
          '活疫苗在妊娠期属于禁忌，所以动作是产后接种。',
          '妊娠期间的动作是就暴露规避做宣教。',
          '结果可疑可能需要复查滴度，而不是直接当作没有免疫力。',
        ],
        ownedLooksLike: '按时间段把答案劈成两半，并说出禁忌症就是那条分界线的原因。',
        surfaceLooksLike: '说她应该接种疫苗，但不提时机。',
      },
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
      zh: {
        question: '88% 是从哪来的？相对于什么基线的 88%？把分母告诉我。',
        keyPoints: [
          '这个数字是相对于「不干预时的预期妊娠数」的下降，不是每次性行为的绝对概率。',
          '那个预期基线本身是模型算出来的、不是观察到的，所以不同来源给的数字才会不一样。',
          '时机很重要：在 120 小时窗口里，有效性并不是一条平线。',
        ],
        ownedLooksLike: '能把「预期妊娠减少了 88%」和「88% 的使用者不会怀孕」分开。',
        surfaceLooksLike: '把 88% 再念一遍，然后指向脚注。',
      },
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
      zh: {
        question: '你的第一个数字是受孕高峰期单次性行为的概率，第二个是有效率。这两个能相乘得到用药后的风险吗？说出能或不能的理由。',
        keyPoints: [
          '88% 本身已经是相对于「预期妊娠」基线定义的，再乘一次就是重复计算。',
          '17% 是按周期日条件化的；而有效率是跨周期日平均出来的。',
          '要把两个数合起来，前提是知道每一个各自是相对哪个基线算的。',
        ],
        ownedLooksLike: '看出这两个数的基线不是同一个东西，并拒绝做这个乘法。',
        surfaceLooksLike: '直接把两个数乘起来。',
      },
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
      zh: {
        question: '你把两个方案并列得像是可以互换。说出一个含铜宫内节育器明显更优的具体病人，以及对她而言更优在哪。',
        keyPoints: [
          '含铜宫内节育器的有效性受 BMI 影响远小于口服左炔诺孕酮。',
          '它同时提供长期避孕，这对一个本来就想要长期避孕的人会改变整个决定。',
          '但它需要受过训练的置入者，在时间窗内未必找得到。',
        ],
        ownedLooksLike: '说得出一个具体的病人因素 —— BMI、距性行为的时间、是否还想要长期避孕。',
        surfaceLooksLike: '只说宫内节育器「更有效」，不说对谁、也不说为什么。',
      },
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
      zh: {
        question: '你报告了机油对捕食行为的影响。这个影响有多大？你凭什么说它不是噪声？',
        keyPoints: [
          '一个效应需要量级和离散度，光有方向不算。',
          '样本量小的时候，只报均值差几乎说明不了什么。',
          '说出用了什么检验、它假设了什么，是最低限度站得住的答案。',
        ],
        ownedLooksLike: '给出一个带离散度的量级，或者干脆说清楚这个设计分不出它和噪声。',
        surfaceLooksLike: '说处理组「捕食减少了」，然后就没了。',
      },
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
      zh: {
        question: '机油会在水面形成油膜，它本身也有化学毒性。你测到的是这两者中的哪一个？什么对照能把它们分开？',
        keyPoints: [
          '表面油膜会改变氧交换，也会挡住昆虫接触水面。',
          '一层惰性膜 —— 矿物油，或者一个漂浮隔层 —— 才能把物理效应和化学效应分开。',
          '没有这个对照，数据里这两种机制是分不开的。',
        ],
        ownedLooksLike: '提出一个惰性油膜对照，并说明什么结果指向哪一种机制。',
        surfaceLooksLike: '说这项研究「控制了其他变量」。',
      },
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
      zh: {
        question: '把开头这句话删掉。这段摘要少了什么？',
        keyPoints: [
          '社会意义的开场能立起利害关系，但它不承载这项研究自己的任何主张。',
          '摘要的第一句是全文最贵的位置。',
          '这项研究自己的问题放在那个位置会更好。',
        ],
        ownedLooksLike: '承认它是铺垫，或者拿出理由把它辩护成该期刊的惯例。',
        surfaceLooksLike: '说它「提供了背景」，但说不出是什么的背景。',
      },
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
      zh: {
        question: '举出一对物种，它们的竞争优劣会随某个环境条件反转，并说出那个条件。',
        keyPoints: [
          '沿资源梯度出现竞争反转，是这件事的标准演示。',
          '养分水平、水分供应和光照是常见的反转条件。',
          '他自己的实验里大概就设了某个条件；把它说出来就够了。',
        ],
        ownedLooksLike: '用一对物种和一条梯度把这个说法坐实，最好是来自他自己的数据。',
        surfaceLooksLike: '换一批词把原句再说一遍。',
      },
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
      zh: {
        question: '你的实验里限制性资源是哪一个？设计里的什么让你确定是它、而不是别的？',
        keyPoints: [
          '要谈竞争，先得证明某个资源确实是限制性的。',
          '密度梯度或者加资源处理，才是把这件事确立下来的手段。',
          '没有这一步，观察到的差异也可能是干扰或化感作用。',
        ],
        ownedLooksLike: '说出那个资源，以及设计里把它单独隔离出来的那一处。',
        surfaceLooksLike: '说植物「在争养分和光照」。',
      },
    },
  ],
  fragilities: [
    {
      quote: 'is often central to its ability to survive in a given environment',
      note: '"Often" and "a given environment" are both hedges. Together the sentence cannot be wrong, which is why it can open a paper without a citation.',
    },
  ],
};
