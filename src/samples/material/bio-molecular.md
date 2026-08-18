# Effect of siRNA knockdown of NRF2 on HO-1 induction in HeLa cells under tBHP-induced oxidative stress

**Course:** BIOL 482 — Molecular Cell Biology  
**Lab partner:** [redacted]  
**Date performed:** 18–22 September 2025  
**Submitted:** 29 September 2025

## Hypothesis

If NRF2 is the dominant transcription factor driving the antioxidant response in HeLa cells, then siRNA-mediated knockdown of NRF2 should substantially reduce induction of the downstream target heme oxygenase-1 (HO-1) when cells are challenged with tert-butyl hydroperoxide (tBHP).

## Background (brief)

NRF2 (NFE2L2) is a cap'n'collar basic leucine zipper transcription factor that, under oxidative stress, accumulates in the nucleus and binds antioxidant response elements (AREs) in the promoters of detoxifying genes including HO-1, NQO1, and GCLM. KEAP1 is the main negative regulator. tBHP is a membrane-permeant organic peroxide commonly used to model oxidative stress in vitro.

## Methods

**Cell culture.** HeLa cells (ATCC CCL-2) were maintained in DMEM + 10% FBS + 1% penicillin/streptomycin at 37 °C / 5% CO₂. Cells were seeded at 2.0 × 10⁵ cells/well in 6-well plates 24 h before transfection.

**siRNA transfection.** Cells were transfected with 50 nM final concentration of either ON-TARGETplus siRNA targeting NRF2 (Horizon Discovery, L-003755-00-0005) or non-targeting control siRNA (D-001810-10-05), using Lipofectamine RNAiMAX (Thermo, 13778150) at 6 μL/mL in Opti-MEM. Knockdown was allowed for 48 h.

**Oxidative challenge.** At 48 h post-transfection, cells were treated with 100 μM tBHP (Sigma, 458139) in serum-free medium for 4 h. Vehicle control wells received an equivalent volume of ethanol (final 0.1% v/v).

**Cell lysis.** Cells were washed twice in cold PBS and lysed in RIPA buffer (Thermo, 89901) supplemented with 1× Halt protease and phosphatase inhibitor cocktail (Thermo, 78442). Lysates were cleared at 14,000 × g for 10 min at 4 °C. Protein concentration was measured by BCA assay (Pierce, 23227).

**SDS-PAGE and Western blot.** 20 μg total protein per lane was resolved on 4–12% Bis-Tris gels (Thermo, NP0321) in MOPS buffer, then transferred to PVDF (Immobilon-P, IPVH00010) at 100 V for 90 min in 25 mM Tris / 192 mM glycine / 20% methanol. Membranes were blocked in 5% non-fat milk in TBST for 1 h at RT.

**Antibodies.** Primary antibodies: rabbit anti-NRF2 (Cell Signaling, 12721, 1:1000), rabbit anti-HO-1 (Cell Signaling, 5853, 1:1000), mouse anti-β-actin (Sigma A1978, 1:5000). HRP-conjugated secondaries: anti-rabbit IgG (CST 7074, 1:3000) and anti-mouse IgG (CST 7076, 1:3000). All antibodies diluted in 5% BSA in TBST. Primary incubation overnight at 4 °C; secondary 1 h at RT. ECL was SuperSignal West Pico (Thermo, 34580). Blots were imaged on a Bio-Rad ChemiDoc MP.

**Densitometry.** Band intensity was quantified in ImageJ (FIJI distribution, v2.14.0) with background subtraction from a same-size lane. HO-1 and NRF2 signals were normalised to β-actin from the same lane.

## Results

NRF2 protein was reduced by approximately 70% in siNRF2 lanes compared with siControl (mean of n=3; representative blot in Figure 1A). In vehicle-treated cells, HO-1 was barely detectable in both conditions. After 4 h of 100 μM tBHP, HO-1 was strongly induced in siControl cells (≈8.4-fold over siControl vehicle, normalised to β-actin). In siNRF2 cells, tBHP-induced HO-1 was reduced to ≈3.1-fold over siControl vehicle (Figure 1B). The reduction in HO-1 induction in siNRF2 vs siControl under tBHP was therefore about 63% (8.4 → 3.1). NRF2 itself was modestly induced by tBHP in siControl cells (≈1.6-fold), consistent with the KEAP1/NRF2 stabilisation mechanism.

[Figure 1: representative blot and quantification. (A) Western blot showing NRF2, HO-1, and β-actin bands in four conditions: siControl vehicle, siNRF2 vehicle, siControl + 100 μM tBHP, siNRF2 + 100 μM tBHP. (B) Bar chart of densitometric quantification, n=3 biological replicates, error bars SEM.]

## Controls

- Non-targeting siRNA control: rules out off-target effects of the transfection and the siRNA machinery itself.
- Vehicle control (0.1% ethanol): controls for the solvent used to deliver tBHP.
- β-actin loading control: confirms equal loading across lanes; in this experiment the β-actin bands were within 10% by densitometry.
- Secondary-only control (not shown): no signal, confirming the primaries are specific.

## Discussion

The data support the hypothesis that NRF2 contributes substantially to HO-1 induction under tBHP-driven oxidative stress in HeLa cells: knocking down NRF2 reduces HO-1 induction by about 63%. This is in line with the published literature where NRF2 dependence for HO-1 induction typically falls in the 50–80% range, depending on cell type and stimulus.

Several limitations should be flagged. First, n=3 is small and we did not see a statistically significant difference for the basal HO-1 comparison (which we did not expect to differ), so the power for smaller effects is low. Second, we chose 48 h as the knockdown timepoint based on the manufacturer's recommendation but did not run a time course to confirm that NRF2 is maximally depleted at 48 h in our hands. Third, 100 μM tBHP for 4 h was the only dose tested; we did not establish that this is sub-lethal in our conditions beyond trypan blue exclusion at the time of harvest.

I would want to repeat this with a wider tBHP dose response, an NRF2 rescue with a siRNA-resistant ORF, and qPCR to confirm that the HO-1 change is at the mRNA level rather than purely post-translational stabilisation.
