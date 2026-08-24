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
import vicar from './material/essay-vicar.md?raw';
import puberty from './material/epi-puberty.md?raw';

export const graphSample: SampleDef = {
  id: 'cs-graph-c',
  title: 'Course-prerequisite graph, submitted as Project23.cpp',
  packId: 'cs',
  material: graphC,
  level: 'undergraduate',
  blurb: 'A real submitted assignment with a real silent bug, and the instructor’s own grading criteria sitting in the same repository.',
  zhBlurb: '一份真实提交的作业，里面有一个真实的、不出声的 bug，而助教自己的评分标准就躺在同一个仓库里。',
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
      zh: {
        question: '这行代码按 count × sizeof(char) 给 char** 分配了内存。在 64 位机器上，它实际买到了什么？带我走一遍。',
        whyThisProbe: '语料为这一行自带的问题。写下它的人能说出自己想干什么；粘贴它的人说不出。而这恰恰是评分标准里那 14 分 Valgrind 项存在的意义。',
        keyPoints: [
          'sizeof(char) 是 1，所以这里只分配了 count 个字节。',
          '这个数组需要 count 个指针 —— 64 位目标上每个 8 字节 —— 所以少了 8 倍。',
          '它编译无警告、而且经常看起来能跑，因为堆在分配之后往往还有空余。',
          '正确的写法是 sizeof(char *)，更好的是 sizeof(**allNodes)。',
        ],
        ownedLooksLike: '把两个尺寸都算出来，说出差了 8 倍，并解释它为什么不会当场崩。',
        surfaceLooksLike: '说它「给节点分配了内存」，或者说应该用 sizeof(char*)，但讲不出它看起来为什么能跑。',
      },
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
      zh: {
        question: '这里检测到了分配失败，然后打印。执行会继续走到下一行。接下来会发生什么？你原本想让它发生什么？',
        whyThisProbe: '检测了结果却不据此行动，是「错误处理是照模板写的」的典型特征。而具体后果就在下一行。',
        keyPoints: [
          '紧接着的下一条语句就是往那个 NULL 指针里 strcpy —— 立刻段错误。',
          '检测到却不处理，比根本不检测更糟，因为它看起来像做了防御。',
          '本该有的处理是 return、exit，或者回滚已经分配的部分。',
        ],
        ownedLooksLike: '指出下一行的 strcpy 就是崩溃点。',
        surfaceLooksLike: '说它「打印了一条错误信息让用户知道」。',
      },
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
      zh: {
        question: '为什么是 31？说出这个数字编码了什么，以及一个需要 31 个字符的节点名会怎样。',
        whyThisProbe: '一个魔法数字要么是一个决定，要么是一次复制。如果是决定，学生说得出它来自哪条约束。',
        keyPoints: [
          '31 大概是 30 个字符的名字加上 NUL 终止符。',
          '对一个 31 字符的名字做 strcpy 会写 32 字节，正好溢出一个。',
          '这个上限该放在一个具名常量里、在读入处校验，而不是在分配处重复一遍。',
        ],
        ownedLooksLike: '把终止符算进去，并指出边界上那个差一错误。',
        surfaceLooksLike: '说 31「对课程名来说够长了」。',
      },
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
  zhBlurb: '一份 CS229 期末项目，全部主张压在一个数字上 —— 51.5% —— 既没有置信区间，也没有保本线。',
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
      zh: {
        question: '51.5% 是在多少场比赛上跑出来的？扣掉抽水之后，保本胜率是多少？',
        whyThisProbe: '语料自带的问题。这就是这篇论文的全部主张，而问题的两半都是作者要提出这个主张就必然知道的东西。',
        keyPoints: [
          '标准 -110 赔率下，保本线大约在 52.4%。',
          '所以 51.5% 在保本线之下：这个头条结果是亏钱的。',
          '没有 n 就不知道标准误 —— 500 场的话，95% 区间大约是 ±2.2 个百分点。',
        ],
        ownedLooksLike: '说出保本线在 52.4% 附近，并注意到 51.5% 在它下面。',
        surfaceLooksLike: '说模型「跑赢了市场」，或者说 51.5%「高于随机」。',
      },
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
      zh: {
        question: '一个跑在 NBA 赛程上的循环模型，有一条很明显的路可以偷看未来。说出最可能泄漏的那个特征，以及你的划分方式得长成什么样才能堵住它。',
        whyThisProbe: '跑在体育数据上的序列模型，几乎默认会通过赛季聚合特征泄漏。这一问没有指认任何过错，它要的是机制。',
        keyPoints: [
          '用整个赛季算出来的赛季均值，会泄漏进这个赛季更早的比赛里。',
          '休息天数、伤病状态、赔率变动，只要取错时间戳，全都是被未来污染过的。',
          '划分必须严格按时间顺序，特征要按每场比赛当天为准来计算。',
        ],
        ownedLooksLike: '说得出「按当时为准」的特征计算方式，以及按时间顺序切分。',
        surfaceLooksLike: '说他们做了训练/测试划分并且打乱了数据。',
      },
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
      zh: {
        question: '这句话是在解释另一个队的结果。什么证据能把你这个解释，和同样能解释那 2% 差距的另外两三个解释区分开？',
        whyThisProbe: '对着这句话，不是对着作者。给别人的结果安一个因果故事，那是一个主张，而主张就有检验方式。',
        keyPoints: [
          '别的可能：数据更少、特征更差、评估窗口不同，或者盘口本来就有效。',
          '要区分它们需要消融实验，而不是一个听起来合理的机制。',
          '「可能是」这三个字承担了太多 —— 诚实的写法是把候选一条条列出来。',
        ],
        ownedLooksLike: '说出至少一个竞争性解释，以及能把它们分开的消融实验。',
        surfaceLooksLike: '把「高斯分布不适合这份数据」再说一遍。',
      },
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
  zhBlurb: '一份拿过 USCLAP 奖的入门统计项目，「局限性」那一节写得很好，但全文没有一处真的依赖它。',
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
      zh: {
        question: '被剔掉的是哪些地区、多少个国家-年？这会把你的 ANOVA 往哪个方向推？',
        whyThisProbe: '语料自带的问题。这句话是对的，也是通用的。这一问的每一部分都能从作者真正跑过的分析里答出来 —— 这正是把套话式的免责声明和真正想过的局限区分开的办法。',
        keyPoints: [
          '结核监测的缺失不是随机的 —— 它集中在卫生系统能力弱的地方。',
          '而那些恰恰是高死亡、低检出的情形，所以剔掉它们会削弱你报告的那个关系本身。',
          '所以方向是可预测的，不只是「可能引入偏倚」。',
        ],
        ownedLooksLike: '说出一个方向，并把它和「哪些地区会缺失、为什么缺」连起来。',
        surfaceLooksLike: '重复一遍「缺失数据可能造成偏倚」。',
      },
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
      zh: {
        question: '你跑了 ANOVA，然后又对各地区做了两两 t 检验。那一共是多少次比较？你对此做了什么处理？',
        whyThisProbe: '一个得过奖的项目里真实存在、且可核查的技术缺口：全文没提多重比较校正。这一问要一个计数和一个决定，两者都有确切答案。',
        keyPoints: [
          '六个 WHO 地区意味着 15 次两两比较。',
          'α = 0.05 且不校正时，族系错误率超过 50%。',
          'Tukey HSD 或 Bonferroni 是标准做法；说「我们没有校正」只要给出理由，也是站得住的答案。',
        ],
        ownedLooksLike: '把比较次数算出来，并说出一种校正方法，或者给出不做校正的理由。',
        surfaceLooksLike: '说 t 检验「验证了 ANOVA 的结果」。',
      },
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
      zh: {
        question: '检出率是一个分母为估计发病数的比值。死亡率也用同一个估计值做了标化。这个共用的分母，对两者之间的相关会造成什么？',
        whyThisProbe: '这篇论文的头条关系，可能有一部分是共用分母造成的假象 —— 一个真实的统计问题，而那节套话式的「局限性」够不到它。',
        keyPoints: [
          '两个共用分母的比值，即使分子彼此独立，也会出现伪相关。',
          '这两个量都依赖 WHO 用模型估计出来的发病数。',
          '该做的复核是：换成绝对计数之后，这个关系还在不在。',
        ],
        ownedLooksLike: '认出共用分母带来的伪相关，并提出用绝对计数去复核。',
        surfaceLooksLike: '重复一句「相关不等于因果」。',
      },
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
  zhBlurb: '「与公认值吻合得很好」—— 而整段摘要里一个不确定度都没有。本科实验报告最经典的那一手。',
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
      zh: {
        question: '把「吻合得很好」用数字定义出来。你的结果距离公认值有多少个标准误？',
        whyThisProbe: '这个说法就是全文的结论，而整段摘要一个不确定度都没给，所以这句话要么是某个算出来的量的简写，要么是它的替代品。',
        keyPoints: [
          '吻合说的是差值相对于合成不确定度有多大。',
          '一个标准误以内不值一提；三个以内仍算吻合；超出就需要一个交代。',
          '没有不确定度，这句话不携带任何信息。',
        ],
        ownedLooksLike: '把「吻合」表述成差值相对于不确定度的关系，并说出自己的结果大致落在哪。',
        surfaceLooksLike: '说这个值「接近」公认值。',
      },
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
      zh: {
        question: '你的斜率给出的是 h/e。说出这条斜率里最大的两项系统误差，以及每一项把你的 h 往哪个方向推。',
        whyThisProbe: '能说出方向的系统误差，是「做过这个实验」和「懂这个实验」之间的分界。两个候选对这套装置来说都是标准答案。',
        keyPoints: [
          '阳极反向光电流会让测到的截止电压偏小。',
          '接触电位差影响的是截距，不是斜率。',
          '非单色光和光阴极逸出功不均匀，会把截止点抹宽。',
        ],
        ownedLooksLike: '说出一项系统误差并把方向说对，并且能区分影响斜率的和影响截距的。',
        surfaceLooksLike: '列出「人为误差」和「设备限制」。',
      },
    },
  ],
  fragilities: [
    {
      quote: 'We qualitatively determine',
      note: '"Qualitatively determine" in a paper whose purpose is to measure a constant. The word concedes the measurement is not the argument, and nothing later resolves it.',
    },
  ],
};

/**
 * Argument writing. The essay pack had no sample at all, so a humanities
 * student opening the app with no key had nothing in their own subject to try
 * — the packs were written and then never given anything to bite on.
 *
 * This paper is a good target precisely because it is competent. Its argument
 * turns on a definition the writer stipulates for herself ("in the sense that
 * I will be using it"), and a stipulated definition is the single most common
 * place where an essay can be fluent, well-evidenced, and still unable to
 * survive one question from the person marking it.
 */
export const vicarSample: SampleDef = {
  id: 'essay-vicar',
  title: 'The Vicar of Wakefield as a failed Christian morality story',
  packId: 'essay',
  material: vicar,
  level: 'undergraduate',
  blurb: 'The whole argument rests on a definition the writer wrote herself, one paragraph in. Every probe here walks back to that sentence.',
  zhBlurb: '整篇论证压在作者自己在第二段下的一个定义上。这里每一个问题最后都走回那一句话。',
  preset: 'standard',
  difficulty: 'standard',
  source: {
    url: 'https://micusp.elicorpora.info/view?pid=ENG.G0.02.1',
    corpus: 'MICUSP — Michigan Corpus of Upper-level Student Papers',
    who: 'English · Final Year Undergraduate · Argumentative Essay',
    markers: 'The thesis is a negative claim ("a failed Christian morality story") resting on a definition the writer stipulates herself in paragraph two. Nothing in the paper tests whether a different, equally reasonable definition would reverse the verdict — which is the question a supervisor asks first and the one no amount of re-reading the essay can answer.',
    terms: 'Copyright the Regents of the University of Michigan; Fair Use statement on the site. Excerpt for analysis only.',
    originalLength: '1,900 words',
  },
  probes: [
    {
      dimensionId: 'definition',
      kind: 'concept',
      quote: 'A Christian morality story, in the sense that I will be using it, is defined as a story that seeks to teach the reader lessons about the importance of Christian morals.',
      question: 'You defined this term for yourself. Name a book that your definition excludes but that most readers would call a Christian morality story — and say whether that is a cost you accept.',
      whyThisProbe: 'The verdict of the whole essay is decided by this sentence, and a stipulated definition is only honest work if the writer knows what it throws away. The answer is not in the paper.',
      keyPoints: [
        'A stipulated definition has to be narrower than ordinary use to do any work.',
        'What it excludes is the price of the argument, and the price should be named.',
        'If nothing is excluded, the definition is not doing the work the thesis claims it does.',
      ],
      ownedLooksLike: 'Names a specific excluded case and either defends the exclusion or concedes the definition is too tight.',
      surfaceLooksLike: 'Restates the definition in different words.',
      zh: {
        question: '这个定义是你自己下的。举出一本被你的定义排除在外、但多数读者都会叫它基督教道德故事的书 —— 并说这个代价你认不认。',
        whyThisProbe: '整篇文章的判决由这一句决定，而自定义的定义只有在作者知道自己扔掉了什么时才算诚实的工作。答案不在文章里。',
        keyPoints: [
          '自定义的定义必须比日常用法更窄，才可能干活。',
          '它排除掉的东西就是这个论证的代价，而代价应该被说出来。',
          '如果什么都没被排除，这个定义就没在做论点声称它在做的事。',
        ],
        ownedLooksLike: '举出一个被排除的具体例子，然后要么为这个排除辩护，要么承认定义收得太紧。',
        surfaceLooksLike: '换一批词把定义再说一遍。',
      },
    },
    {
      dimensionId: 'counterfactual',
      kind: 'counterfactual',
      quote: 'the Vicar of Wakefield is ultimately a failed Christian morality story',
      question: 'Suppose we define the genre by intent rather than by effect — the author meant to teach Christian morals. Which paragraphs of your essay survive that change, and which collapse?',
      whyThisProbe: 'The essay never states which of its two possible criteria — what the book intends, or what its plot rewards — it is grading against, and the whole argument swings on that choice.',
      keyPoints: [
        'Intent and effect are separate criteria and the essay uses evidence for both.',
        'Under an intent criterion the narrator’s constant moralising is evidence FOR the genre, not against it.',
        'A defensible answer picks one criterion and accepts what it costs.',
      ],
      ownedLooksLike: 'Separates the two criteria and traces which evidence belongs to which.',
      surfaceLooksLike: 'Repeats that the book fails because the characters are rewarded with money.',
      zh: {
        question: '假设我们改用「意图」而不是「效果」来定义这个体裁 —— 作者本来就想教基督教道德。你文章里哪些段落还站得住，哪些当场垮掉？',
        whyThisProbe: '这篇文章从没说清它拿哪一条标准在打分 —— 是这本书想教什么，还是它的情节奖赏了什么 —— 而整个论证就悬在这个选择上。',
        keyPoints: [
          '意图和效果是两条不同的标准，而这篇文章两边的证据都用了。',
          '在意图这条标准下，叙述者不停地讲道德，反而是支持这个体裁的证据，不是反对的。',
          '站得住的答案会选定一条标准，并接受它的代价。',
        ],
        ownedLooksLike: '把两条标准分开，并追出哪些证据属于哪一条。',
        surfaceLooksLike: '重复一遍「这本书失败是因为人物最后得到了钱」。',
      },
    },
    {
      dimensionId: 'evidence',
      kind: 'method',
      quote: 'The moral lesson that we see here is, endure poverty, be good to those around you, and God will reward you with vast material riches.',
      question: 'This is your reading of what the plot teaches, not something the text states. What in the novel would have to be different for this reading to be wrong?',
      whyThisProbe: 'The sentence is the essay’s central piece of evidence and it is an inference from plot outcomes. An inference the writer cannot falsify is a paraphrase of their own thesis.',
      keyPoints: [
        'The claim is inferred from who ends up rewarded, not from any stated moral.',
        'A rival reading — reward as narrative convention rather than as moral teaching — fits the same events.',
        'Naming what would falsify it is what separates a reading from a restatement.',
      ],
      ownedLooksLike: 'Offers a concrete alternative reading of the same endings and says why theirs is better.',
      surfaceLooksLike: 'Cites more examples of characters being rewarded.',
      zh: {
        question: '这是你对情节在教什么的读法，不是原文说过的话。小说里什么东西不一样，才会让这个读法是错的？',
        whyThisProbe: '这句话是全文的核心证据，而它是从情节结局推出来的。一个作者自己没法证伪的推断，只是他自己论点的另一种说法。',
        keyPoints: [
          '这个主张是从「谁最后得了好处」推出来的，不是从任何写明的道德推出来的。',
          '有一个对手读法 —— 奖赏只是叙事惯例、不是道德教诲 —— 同样能解释这批事件。',
          '说得出什么能证伪它，才是读法和复述之间的区别。',
        ],
        ownedLooksLike: '对同一批结局给出一个具体的替代读法，并说出为什么自己的更好。',
        surfaceLooksLike: '再举几个人物得到奖赏的例子。',
      },
    },
    {
      dimensionId: 'objection',
      kind: 'blindspot',
      quote: 'This is not to say, however, that The Vicar of Wakefield is completely devoid of morals.',
      question: 'This concession is the strongest objection to your own thesis. Why does it not sink the argument — and where in the essay do you answer it?',
      whyThisProbe: 'The writer raises the objection and then moves on. A concession that is never answered is a hole the marker will walk straight into.',
      keyPoints: [
        'The concession admits the book teaches morals, which is most of what the thesis denies.',
        'The essay’s available reply is that the morals changed rather than disappeared.',
        'That reply narrows the thesis from "failed" to "different", and the essay never makes that move explicit.',
      ],
      ownedLooksLike: 'Sees that the concession forces the thesis to narrow, and states the narrower thesis.',
      surfaceLooksLike: 'Says the concession is only a small point.',
      zh: {
        question: '这句让步是对你自己论点最强的反对。它为什么没有把论证击沉 —— 你在文章的哪一处回答了它？',
        whyThisProbe: '作者提出了这个反对，然后就走开了。一句从没被回答的让步，是阅卷人会一脚踩进去的洞。',
        keyPoints: [
          '这句让步承认了这本书在教道德，而那正是论点否认的大部分内容。',
          '文章手上能用的回应是：道德变了，而不是消失了。',
          '这个回应会把论点从「失败」收窄成「不同」，而文章从没把这一步挑明。',
        ],
        ownedLooksLike: '看出这句让步逼着论点收窄，并把那个更窄的论点说出来。',
        surfaceLooksLike: '说这句让步只是个小问题。',
      },
    },
  ],
  fragilities: [
    {
      quote: 'in the sense that I will be using it',
      note: 'The hinge of the essay. Everything the paper proves is proved about the writer’s own definition, and nothing in the paper defends choosing it.',
    },
    {
      quote: 'It is clear that',
      note: 'Used to open the conclusion. "It is clear that" is where a writer asserts what the argument was supposed to have shown.',
    },
  ],
};

/**
 * Epidemiology. The pack probes design, bias, measure, power, analysis,
 * counterfactual and causal language — and had nothing to probe.
 *
 * This literature review is the right artifact because its whole argument is
 * carried by one word. "The timing of pubertal development ITSELF is a
 * significant indicator of an increased risk" turns a set of associations into
 * a claim about a cause, and every study it reviews measured exposure by
 * asking adolescents to recall it. A student can write this paragraph, cite it
 * correctly, be graded well, and still not be able to say what design would
 * license the word "itself" — which is exactly the gap this product exists to
 * find, and exactly what no amount of re-reading the paper reveals.
 */
export const pubertySample: SampleDef = {
  id: 'epi-puberty',
  title: 'Negative effects of early-onset puberty in girls',
  packId: 'epi',
  material: puberty,
  level: 'undergraduate',
  blurb: 'Careful, well-cited, and it says "itself" about a cause it never had the design to isolate. The most examinable sentence in the paper is one word long.',
  zhBlurb: '谨慎、引用扎实，然后它对一个自己从没有设计去分离的原因用了「本身」两个字。全文最值得考的那句话，只有两个字。',
  preset: 'standard',
  difficulty: 'defense',
  source: {
    url: 'https://micusp.elicorpora.info/view?pid=PSY.G0.03.1',
    corpus: 'MICUSP — Michigan Corpus of Upper-level Student Papers',
    who: 'Psychology · Final Year Undergraduate · Report (literature review)',
    markers: 'Exposure is self-reported pubertal timing; the outcome is lifetime rates of major depression; the framing sentence upgrades both into "the timing itself". Association, measurement and causation are three separate problems here and the paper treats them as one.',
    terms: 'Copyright the Regents of the University of Michigan; Fair Use statement on the site. Excerpt for analysis only.',
    originalLength: '3,871 words',
  },
  probes: [
    {
      dimensionId: 'causal',
      kind: 'concept',
      quote: 'It is thought that the timing of pubertal development itself is a significant indicator of an increased risk of these negative effects on adolescent girls.',
      question: 'The word doing the work here is "itself". What study design would you need before you could keep that word — and does any study in your review have it?',
      whyThisProbe: 'Every source in the review reports an association. "Itself" claims the exposure, and not what travels with it, produces the outcome. The paper never states which it is arguing.',
      keyPoints: [
        'Association between timing and depression is compatible with a common cause acting on both.',
        'Isolating timing needs variation in timing that is unrelated to family, body composition and social environment.',
        'A literature review of observational studies cannot supply that, so "itself" is unearned.',
      ],
      ownedLooksLike: 'Names a confounder that moves both puberty timing and depression, and says what design would break the link.',
      surfaceLooksLike: 'Repeats that the studies found a significant relationship.',
      zh: {
        question: '这里真正干活的词是「本身」。你需要什么样的研究设计，才配保留这两个字 —— 你综述里有哪一项研究具备它吗？',
        whyThisProbe: '综述里的每一项来源报告的都是关联。「本身」声称的是这个暴露、而不是与它同行的东西，造成了这个结局。文章从没说清自己在论证哪一个。',
        keyPoints: [
          '时机与抑郁之间的关联，同样可以由一个同时作用于两者的共同原因解释。',
          '要把时机单独隔离出来，需要与家庭、体成分、社会环境无关的时机变异。',
          '一篇观察性研究的综述提供不了这种变异，所以「本身」这两个字没挣到。',
        ],
        ownedLooksLike: '说出一个同时推动青春期时机和抑郁的混杂因素，并说出什么设计能斩断这条链。',
        surfaceLooksLike: '重复一遍这些研究发现了显著关系。',
      },
    },
    {
      dimensionId: 'bias',
      kind: 'method',
      quote: "A self-report method was then used to assess the timing of each student's pubertal development.",
      question: 'If a currently depressed girl recalls her own pubertal timing differently from a girl who is not, which direction does that push the result — and why is that worse than ordinary noise?',
      whyThisProbe: 'Differential misclassification of exposure by outcome status is the specific failure this measurement invites, and it does not average out with a larger sample.',
      keyPoints: [
        'Non-differential error usually biases toward the null; error that depends on the outcome can bias either way.',
        'Recalled timing in an already-depressed adolescent is plausibly linked to the outcome.',
        'Height and weight records are an objective check, which is why the study used them.',
      ],
      ownedLooksLike: 'Distinguishes differential from non-differential misclassification and picks a direction with a reason.',
      surfaceLooksLike: 'Says self-report is "less reliable".',
      zh: {
        question: '如果一个当下正抑郁的女孩，对自己青春期时机的回忆和不抑郁的女孩不一样，这会把结果往哪边推 —— 为什么这比普通的噪声更糟？',
        whyThisProbe: '暴露的错分随结局状态而变，正是这种测量方式招来的那个具体失败，而且它不会随着样本变大而抵消掉。',
        keyPoints: [
          '非差异性误差通常把结果推向零；而依赖于结局的误差可以往任一方向偏。',
          '一个已经抑郁的青少年所回忆的时机，很可能与结局本身相连。',
          '身高体重记录是一个客观校验，这也正是那项研究用它的原因。',
        ],
        ownedLooksLike: '区分差异性与非差异性错分，并带着理由挑一个方向。',
        surfaceLooksLike: '说自我报告「不太可靠」。',
      },
    },
    {
      dimensionId: 'measure',
      kind: 'concept',
      quote: 'Compared with on-time girls, early-maturing girls had significantly elevated lifetime rates of major depression',
      question: '"Lifetime rates" — measured on adolescents. What does that quantity include that a rate measured over the year after puberty would not, and which one does your argument actually need?',
      whyThisProbe: 'A lifetime prevalence in a young sample mixes episodes that preceded puberty with episodes that followed it. The argument is about what puberty caused afterwards.',
      keyPoints: [
        'Lifetime prevalence counts anything ever, including before the exposure.',
        'A claim about consequences of early puberty needs incidence after it.',
        'Using lifetime rates can make a pre-existing difference look like a consequence.',
      ],
      ownedLooksLike: 'Separates prevalence from incidence and notices the temporal ordering problem.',
      surfaceLooksLike: 'Says lifetime rates show the effect is large.',
      zh: {
        question: '「终身患病率」—— 而测量对象是青少年。这个量包含了什么，是「青春期之后那一年的发病率」不会包含的？你的论证真正需要的是哪一个？',
        whyThisProbe: '在一个年轻样本里量终身患病率，会把青春期之前和之后的发作混在一起。而论证谈的是青春期之后造成了什么。',
        keyPoints: [
          '终身患病率把「曾经发生过的」全都算进去，包括暴露之前。',
          '一个关于「早熟造成了什么后果」的主张，需要的是它之后的发病率。',
          '用终身患病率，会把本来就存在的差异看成是后果。',
        ],
        ownedLooksLike: '把患病率和发病率分开，并注意到时间先后的问题。',
        surfaceLooksLike: '说终身患病率显示效应很大。',
      },
    },
    {
      dimensionId: 'design',
      kind: 'alternative',
      quote: 'Three different cohorts of adolescent students from nine high schools were interviewed and given questionnaires tapping into all psychological variables thought to be associated with depression.',
      question: 'Nine high schools, students who are present to be interviewed. Name one girl this sampling frame systematically misses, and say which way her absence bends the finding.',
      whyThisProbe: 'Selection into the frame is invisible in the write-up and is the one bias a reader cannot detect from the reported numbers.',
      keyPoints: [
        'The frame is enrolled, attending students.',
        'Girls out of school — including some with the most severe outcomes — cannot enter it.',
        'Losing the severe tail attenuates the association rather than inventing one.',
      ],
      ownedLooksLike: 'Names a concrete excluded group and reasons about the direction of the resulting bias.',
      surfaceLooksLike: 'Says the sample "may not be representative".',
      zh: {
        question: '九所高中，能被访到的在校学生。说出这个抽样框系统性漏掉的一类女孩，并说她的缺席会把结论往哪边掰。',
        whyThisProbe: '进入抽样框的选择过程在报告里是看不见的，而它是读者从已报告的数字里唯一察觉不到的偏倚。',
        keyPoints: [
          '这个抽样框是在册、且在校的学生。',
          '已经离开学校的女孩 —— 其中包含结局最严重的一部分 —— 根本进不来。',
          '丢掉严重的那条尾巴，会削弱这个关联，而不是凭空造出一个。',
        ],
        ownedLooksLike: '举出一个具体被排除的群体，并对由此产生的偏倚方向做出推理。',
        surfaceLooksLike: '说样本「可能不具代表性」。',
      },
    },
  ],
  fragilities: [
    {
      quote: 'It is thought that',
      note: 'Agentless. Thought by whom, on what evidence — the sentence carries the paper\'s thesis and attributes it to nobody.',
    },
    {
      quote: 'all psychological variables thought to be associated with depression',
      note: '"All" is doing a great deal of work. Adjusting for everything measured is not the same as adjusting for everything that matters.',
    },
  ],
};
