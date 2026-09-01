# Historical Retirement Lab

## Product and technical specification, v0.1

### Product promise

Given a starting portfolio, account mix, target asset allocation, after-tax first-year spending rate, annual fee, and survival horizon, replay the plan across every complete rolling historical window and show whether it survived every observed cohort.

This is a historical stress test, not a forecast or guarantee.

### Initial user experience

The guided walkthrough has six steps:

1. Starting portfolio and required horizon.
2. Percent held in taxable, tax-deferred, and tax-free accounts.
3. Target asset allocation. Each allocation is rebalanced annually.
4. After-tax first-year spending as a percentage of initial wealth. The dollar target grows with recorded inflation.
5. Editable suggested tax and fee assumptions.
6. Review assumptions and run the historical test.

The result screen reports:

- Yes or no: did every complete cohort survive?
- Survival rate, successful and failed cohort counts.
- Total number of complete windows.
- Minimum, median, and maximum inflation-adjusted ending balance.
- Every cohort path, switchable between calendar time and years since retirement.
- Explicit data, proxy, tax, and historical-backtest caveats.

### Asset universe

| UI label | Production target | Disclosure requirement |
| --- | --- | --- |
| U.S. stocks | Broad U.S. total-return proxy | Source, range, fund mismatch |
| U.S. bonds | U.S. Treasury total-return proxy | Duration and rebalance assumption |
| International stocks | Long-history developed ex-U.S. proxy | Country coverage and shorter range |
| Cash | U.S. Treasury-bill total return | Not a bank-deposit series |
| U.S. technology proxy | Fama-French Business Equipment, value-weighted | VGT-like exposure, not literal VGT |

Only complete years shared by every selected nonzero-weight series are eligible. The UI shows the shared range and completed cohort count.

### Annual event order

For every cohort and year:

1. Calculate the inflation-adjusted after-tax spending target.
2. Gross up the withdrawal for the simplified tax estimate.
3. Fail the cohort if available assets cannot fund the withdrawal.
4. Deduct the withdrawal.
5. Apply that calendar year's weighted total return.
6. Deduct the annual fee.
7. Rebalance to the target asset allocation.
8. Inflate next year's spending target.

### Tax and fee scope

The first release accepts editable suggested defaults. Its initial calculation uses a blended effective withdrawal-tax rate plus one annual portfolio fee. The user-facing text must say this is an approximation.

The domain model nevertheless reserves three account buckets: taxable, tax-deferred, and tax-free. A later engine will track balances and allocations per account, taxable cost basis, return character, progressive brackets, required distributions, and selectable withdrawal ordering. Default withdrawal order is taxable, then tax-deferred, then Roth.

### Core domain objects

```text
Scenario
  startingBalance
  horizonYears
  afterTaxWithdrawalRate
  annualFeeRate
  taxAssumptions
  accounts[]
    taxTreatment
    startingBalance
    targetAllocation{}

AnnualObservation
  year
  inflation
  totalReturnByAsset{}
  provenance{}

CohortResult
  startYear
  survived
  failureYear?
  endingRealBalance
  annualPath[]

AggregateResult
  completedCohorts
  survivedAll
  survivalRate
  minMedianMaxEndingRealBalance
  cohorts[]
```

The scenario object is the stable boundary for both the walkthrough and a future agent skill. A brokerage connector may propose a scenario, but users must review inferred balances, holdings, tax treatments, and proxy mappings before running it.

### Validation requirements

- Allocations within each account total 100%.
- Account balances total the displayed starting portfolio.
- Only complete cohorts are evaluated.
- Withdrawal happens before the year's return.
- Zero withdrawal never ends below the same cohort with a positive withdrawal.
- A zero-return control never compounds from investments.
- Scale invariance holds when tax assumptions are percentage-based.
- Known guide checkpoints are regression tests after production datasets are imported.
- Extreme ending balances expose their exact start year and annual audit trail.

### Current implementation boundary

Implemented now:

- Responsive six-step walkthrough.
- Allocation and account validation.
- Annual rebalancing rolling-cohort engine.
- Inflation-adjusted spending and balances.
- Simplified effective taxes and annual fee.
- Result summary and dual-axis cohort-path visualization.
- Engine tests for cohort counts, scale invariance, allocation validation, and withdrawal dominance.

Not yet production-ready:

- Bundled observations are deterministic demonstration data, visibly labeled in the UI.
- Source-reviewed historical asset and inflation series are not yet imported.
- Account-level tax lots and withdrawal mechanics are not yet implemented.
- The known numerical checkpoints in the reference guide cannot run until production data is installed.

### Next implementation sequence

1. Build a reproducible data-ingestion pipeline with immutable raw downloads, hashes, normalized annual observations, provenance, and licenses.
2. Import S&P/broad U.S., Treasury, T-bill, international, Fama-French Business Equipment, and CPI series.
3. Reproduce all guide checkpoints before removing the demo-data banner.
4. Upgrade the simulator from one blended portfolio to independent account buckets.
5. Add cohort drill-down, failure-year table, CSV export, and scenario permalink.
6. Define the agent-skill contract around the versioned Scenario schema.
