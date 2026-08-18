# Determinants of hourly wages: OLS estimation and diagnostics

**Course:** STAT 225 — Applied Regression  
**Submitted:** 3 December 2025

## Research question

What is the marginal effect of education (in years) on hourly wages, holding experience, gender, and region fixed? I use the cross-section from `wage_sample.csv` (n = 935, drawn from the 2018 CPS extract distributed with the course).

## Model

I fit an OLS regression of `log(wage)` on `educ`, `exper`, `exper²`, `female`, and a full set of region fixed effects (Midwest, South, West, with Northeast as the reference):

```
log(wage) = β0 + β1·educ + β2·exper + β3·exper² + β4·female + Σk γk·regionk + ε
```

Standard errors are HC1 (heteroskedasticity-robust). I exclude 12 observations with `wage ≤ 0` and top-code wages at the 99th percentile to reduce leverage from extreme values. Estimation is in R 4.4.1 using `lm()` with `vcovHC()` for robust inference.

## Results

`β1` (educ) = **0.092** (SE 0.006, p < 0.001). A one-year increase in education is associated with a 9.2% increase in predicted wages, holding experience, gender, and region fixed. `β4` (female) = **−0.118** (SE 0.019, p < 0.001): conditional on education and experience, women earn about 11.8% less than men in this sample. The quadratic in experience peaks at ≈28 years, consistent with the canonical Mincer profile. Region fixed effects range from −0.07 (South) to +0.09 (Northeast). R² = 0.31.

## Diagnostics

- **Residual-vs-fitted:** mild fan shape; HC1 SE addresses the resulting heteroskedasticity.
- **Breusch–Pagan test** for heteroskedasticity: p = 0.04. Borderline — I keep HC1 SE rather than HC0.
- **Variance inflation factors:** all regressors below 2.5, including the experience / experience² pair, which I had expected to be elevated.
- **Ramsey RESET (cubic + quartic terms):** F = 1.92, p = 0.15. No strong evidence of omitted non-linearity beyond the experience quadratic.
- **Cook's distance:** no observation above 4/n; the maximum is 0.012.
- **Normality of residuals:** Shapiro–Wilk p = 0.08; not rejected, so I do not pursue a Box–Cox transform.

## Conclusion

The education coefficient is stable across specifications with and without region FE and with HC0 vs HC1 SE, and its magnitude sits squarely in the published Mincer return range. The gender gap is large and statistically significant at conventional levels, but it is a *conditional* average and does not yet adjust for occupation or hours of work — this is what I would want to add next, ideally with a Heckman correction to address labour-force selection.
