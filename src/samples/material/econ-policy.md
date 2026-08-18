# Effect of state-level Medicaid expansion on the low-income uninsured rate: a difference-in-differences analysis

**Course:** PPOL 568 — Program Evaluation, Problem Set 4  
**Submitted:** 8 April 2026

## Research question

Did the 2014 Medicaid expansion under the Affordable Care Act reduce the share of low-income adults without health insurance, and by how much?

## Identification strategy

Difference-in-differences, exploiting the fact that 24 states plus DC expanded Medicaid in January 2014 (treated) and 19 states did not (control). The identifying assumption is parallel trends: in the absence of expansion, the treated and control states would have followed parallel uninsured-rate trajectories. I tested this assumption visually and with a placebo test using 2010–2013 data.

## Data and sample

Annual state-level uninsured rate among adults aged 18–64 with household income below 138% of the federal poverty line, 2010–2018, from the American Community Survey 1-year estimates via IPUMS. Treated states are the 24 that expanded by 2014. Control states are the 19 that had not expanded by 2018 (excluding the 7 late expanders from the control set to keep treatment timing clean). The panel is unbalanced in years because not every state reports every year, but no state is missing more than one year.

## Results (descriptive)

Average uninsured rate among the target population, 2010–2018:

- Treated states: 38.4% (2010) → 41.7% (2013) → 19.6% (2014) → 14.2% (2018)
- Control states: 39.1% (2010) → 42.2% (2013) → 39.5% (2014) → 32.1% (2018)

The DiD estimate for the average post-period (2014–2018) is approximately **−14.7 percentage points** (95% CI from a state-clustered bootstrap: −17.1, −12.3). The 2013-to-2014 change is roughly 6× bigger in treated states than in control states. A simple event-study with 2013 as the omitted year shows a clear jump in 2014 followed by a continued downward drift through 2018; pre-period coefficients are small and statistically indistinguishable from zero.

## Threats to validity

1. **Parallel trends.** The pre-period graph looks reasonable, but the 2010 baseline is already slightly different between groups (treated 38.4% vs control 39.1%). This is small but I would not call it zero.
2. **Selection into treatment.** States that chose to expand differ from those that did not on political composition and pre-ACA uninsurance. I am partly addressing this with state fixed effects, but unobserved time-varying confounders (e.g. state-level outreach campaigns) are a real risk.
3. **Spillovers.** Some control-state residents may have purchased exchange coverage instead, which would bias the DiD toward zero. The treated-state estimate is plausibly a lower bound on the true effect of expansion eligibility.
4. **Composition.** The ACS target population can shift year to year if income distribution changes; I am not reweighting.
5. **Other ACA provisions.** The individual mandate and exchange subsidies also began in 2014, so the DiD picks up the joint effect of expansion *and* the broader mandate, not expansion alone.
