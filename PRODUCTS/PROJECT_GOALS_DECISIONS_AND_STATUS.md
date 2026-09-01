# Historical Retirement Simulator

## Project goals, decision record, current status, and remaining work

**Document status:** Project handoff and working product record  
**Current implementation stage:** Functional prototype using demonstration data  
**Repository:** `arcturus-labs/retirement-simulator`  
**Last consolidated:** September 2026

---

## 1. Purpose of this document

This document consolidates the goals of the historical retirement simulator, the product and modeling decisions made during its initial design discussion, the current implementation status, and the remaining work required to turn the prototype into a credible historical analysis tool.

It is intentionally broader than a conventional technical specification. It records not only what the product should do, but also why particular choices were made and which parts of the current implementation are approximations.

The project began with an earlier historical retirement-withdrawal study as a reference. The goal is not to reproduce that study or its spreadsheet architecture. The goal is to use its central method, rolling historical cohorts, as the basis for a more general and interactive portfolio simulator.

---

## 2. Core product goal

The simulator should answer the following question:

> Given a starting portfolio, an asset allocation, an initial after-tax spending rate, and a required retirement horizon, how would that plan have performed if retirement had begun in every historical year for which a complete simulation window is available?

For example, suppose a person specifies:

- A $2 million starting portfolio.
- A 40-year retirement horizon.
- A portfolio containing U.S. stocks, U.S. bonds, international stocks, cash, and a technology-stock proxy.
- A first-year after-tax withdrawal equal to 4% of the initial portfolio.
- Annual spending increases based on the inflation observed in each historical period.
- Annual portfolio rebalancing.
- Simplified assumptions for taxes and fees.

The simulator should test that plan against every complete 40-year historical window supported by the selected data. If the common dataset covers 80 years, only the historical start years with a complete subsequent 40-year period should be included. Incomplete cohorts must never be silently included.

The simulator is a historical stress test. It is not a Monte Carlo forecast and it does not claim that historical survival guarantees future survival.

---

## 3. Historical rolling-cohort method

The defining idea is to use actual historical sequences rather than average returns.

A cohort beginning in 1976 uses the investment returns and inflation recorded in 1976, 1977, 1978, and so on through the specified horizon. The next cohort begins in 1977 and uses the overlapping sequence beginning one year later. The simulation repeats this process for every start year with a complete window.

This matters because retirement outcomes are affected by sequence-of-returns risk. Two periods can have similar average returns but produce very different retirement results when losses occur at different points relative to withdrawals.

The number of tested cohorts depends on:

- The earliest common year supported by all selected nonzero-weight asset series.
- The latest year for which all required return and inflation observations exist.
- The requested retirement horizon.

The interface must disclose the historical range and exact number of complete cohorts used in each result.

---

## 4. Required inputs

### 4.1 Starting portfolio

The user specifies the total starting portfolio in dollars.

When withdrawals, fees, and taxes are percentage-based, many survival results are scale-invariant. Doubling the starting portfolio while keeping all percentages unchanged should double the dollar balances without changing which cohorts survive. The dollar input remains important because the user-facing results and spending amounts should be concrete.

### 4.2 Survival horizon

The user specifies the number of years the portfolio must support spending. Examples include 30, 40, and 45 years, but the product should not be limited to a few hard-coded horizons.

The simulation evaluates only complete historical windows of the requested length.

### 4.3 Portfolio allocation

The user specifies the percentage allocated to each supported asset class. The selected percentages must total 100%.

The initial asset universe is:

- U.S. stocks.
- U.S. bonds.
- International stocks.
- Cash.
- U.S. technology stocks represented by a long-history technology proxy.

Real estate and commodities are explicitly excluded from the initial scope.

### 4.4 Account types

The planned model recognizes three account categories:

- Taxable brokerage accounts.
- Tax-deferred accounts, such as traditional IRAs and 401(k)s.
- Tax-free accounts, such as Roth IRAs.

The distinction is important even though tax-deferred withdrawals are taxable. A taxable brokerage account may incur taxes on dividends, interest, and realized gains while the money is invested, and withdrawals generally include a mixture of untaxed cost basis and taxable gains. A tax-deferred account generally avoids annual tax drag but treats distributions as ordinary income. Qualified Roth withdrawals are generally tax-free.

The mature product should allow a different asset allocation within each account bucket. The percentages inside each account should total 100%, and the account balances should reconcile to the total starting portfolio.

### 4.5 Spending and withdrawal rate

The user specifies the first-year withdrawal as a percentage of the initial portfolio.

The percentage represents money available to spend **after taxes**, not the gross amount removed from investment accounts. The simulator therefore needs to gross up account withdrawals when taxes are modeled.

The first-year spending amount establishes a real spending target. It is not recalculated each year as a percentage of the current portfolio. Each subsequent year's spending amount increases based on the inflation recorded in that cohort.

Example:

```text
Starting portfolio:       $2,000,000
Initial withdrawal rate:          4%
Year-one after-tax spending: $80,000
```

If inflation during the first simulated year is 3%, the next year's after-tax spending target becomes $82,400 regardless of whether the portfolio increased or decreased.

### 4.6 Taxes and fees

The initial product should include simple taxes and fees without presenting itself as a tax-planning engine.

The chosen first-version approach is:

- Suggested defaults that users can edit.
- One annual portfolio fee percentage.
- A simplified effective tax assumption for grossing up after-tax spending.
- Clear disclosure that the result is approximate and not personalized tax advice.

The product architecture should preserve the three account buckets even while the first tax calculation remains simplified.

---

## 5. Required outputs

### 5.1 Overall historical-survival answer

The primary output is a clear yes or no:

> Did the strategy survive every complete historical cohort in the tested dataset?

This should be accompanied by the historical survival percentage, not presented as a future guarantee.

### 5.2 Cohort counts

The results must include:

- Total number of complete historical cohorts.
- Number of surviving cohorts.
- Number of failed cohorts.
- Survival percentage.

This prevents a result based on 20 complete windows from appearing equivalent to one based on 70 complete windows.

### 5.3 Ending-balance distribution

After the requested horizon, report the inflation-adjusted:

- Minimum ending portfolio balance.
- Median ending portfolio balance.
- Maximum ending portfolio balance.

Failed portfolios should reach zero and remain at zero. Extreme outcomes should be traceable to their exact historical starting years.

### 5.4 Cohort-path graph

The product should overlay the path of every historical cohort.

Two time-axis views are required:

1. **Years since retirement.** This aligns every cohort at retirement year one and makes sequence outcomes directly comparable.
2. **Calendar years.** This places each cohort within actual historical time and makes major market and inflation periods visible.

The vertical axis should default to inflation-adjusted purchasing-power dollars. A nominal-dollar view can be offered as an additional toggle.

The chart needs to remain legible when the strongest cohorts end with balances many times larger than the starting portfolio. A transformed scale, such as square root or logarithmic, can be used if it is clearly labeled.

---

## 6. Decision record in question-and-answer form

This section records the major clarification questions and the decisions reached during the product discussion.

### Q1. Which asset classes should the first version support?

**Decision:** Support U.S. stocks, U.S. bonds, international stocks, cash, and a technology-stock allocation. Do not include real estate or commodities in the first version.

**Reasoning:** These categories cover the intended common portfolio components without expanding the initial dataset and modeling work too far.

### Q2. How should the technology allocation be modeled?

**Decision:** Use a long-history technology proxy rather than literal VGT history.

**Preferred production proxy:** The Fama-French Business Equipment industry portfolio, using annual value-weighted returns, is the initial candidate. It includes computers, software, and electronic equipment.

**Disclosure requirement:** The primary UI label should be “U.S. technology proxy,” not “VGT.” A small information button next to the selection should explain what the proxy contains, how far its data extends, what it approximates, and why it is not the same as owning VGT.

**Reasoning:** The project prioritizes having as many historical start dates as reasonably possible. Literal VGT history is too short for that goal.

### Q3. What should happen when an asset has a shorter history than the other assets?

**Decision:** Use long-history series and defensible proxies wherever possible, but never fabricate missing years. Run a portfolio only over the common complete date range supported by every selected nonzero-weight asset.

**Disclosure requirement:** Show the resulting shared date range and cohort count. Each asset's information pop-up should disclose its exact source and historical range.

### Q4. How should the portfolio be rebalanced?

**Decision:** Rebalance annually to the user's target percentages.

**Reasoning:** Without rebalancing, the entered allocation would describe only the starting portfolio and could drift substantially over a multi-decade cohort.

### Q5. How should the cohort-path chart display time?

**Decision:** Offer both years-since-retirement and calendar-year views.

**Reasoning:** The relative view is best for comparing cohort shapes, while the calendar view provides historical context.

### Q6. Should taxes and investment fees be included?

**Decision:** Include simple taxes and fees in the first working version while keeping the interface comprehensible.

**Reasoning:** Fees are simple to model as an annual percentage drag. Taxes are substantially more complex, but omitting them entirely would make a mature retirement tool less useful. The initial version should therefore use a disclosed approximation and reserve detailed tax mechanics for later.

### Q7. Are taxable and tax-deferred accounts effectively the same because both can be taxed?

**Decision:** No. Preserve separate taxable, tax-deferred, and tax-free account buckets.

**Reasoning:** The timing and character of taxation differ. Taxable accounts may experience annual tax drag and contain cost basis that is not taxed again when withdrawn. Tax-deferred accounts compound without annual taxes but generally produce ordinary taxable income when distributed. Roth accounts generally allow qualified tax-free withdrawals.

### Q8. Does the withdrawal rate describe pre-tax withdrawals or after-tax spending?

**Decision:** It describes money available to spend after taxes.

**Consequence:** The simulator may need to withdraw more than the stated spending target to cover taxes. The real spending target, not the gross withdrawal, is increased with inflation.

### Q9. What withdrawal order should the initial simulator use?

**Decision:** Use a conventional documented default of taxable accounts first, then tax-deferred accounts, then Roth accounts.

**Caveat:** There is no universally optimal order. A truly optimized strategy can depend on tax brackets, age, Social Security, required minimum distributions, capital gains, and estate objectives. The first version is not intended to optimize taxes.

### Q10. Should users complete one large form or a guided walkthrough?

**Decision:** Use a guided multi-step walkthrough.

**Reasoning:** Account buckets, allocations, spending, taxes, and fees create nested inputs that would be noisy in a single form.

The agreed walkthrough is:

1. Starting portfolio and survival horizon.
2. Account types and balances.
3. Asset allocation.
4. After-tax spending and inflation policy.
5. Taxes and fees.
6. Review assumptions and run the simulation.

### Q11. How should the first version obtain tax rates?

**Decision:** Provide suggested defaults that the user can edit.

**Disclosure requirement:** Defaults must be labeled as simplified assumptions. The recorded scenario should store the exact values actually used so a result can be reproduced.

### Q12. How should future agent interaction fit into the product?

**Decision:** The calculation engine and scenario schema should be independent of the walkthrough UI.

**Future direction:** An agent skill should eventually guide the user through the analysis, populate the same scenario schema, and potentially read connected Vanguard or Fidelity account information. The agent should fill known values, map holdings to supported proxies, and ask the user only about missing or ambiguous information.

**Safety and review requirement:** Any inferred balances, account tax treatments, holdings, and proxy mappings must be shown to the user for review before the scenario is run.

---

## 7. Modeling rules adopted from the reference study

### 7.1 Beginning-of-year withdrawal

Withdrawals occur at the beginning of each simulated year.

The intended annual order is:

1. Determine that year's inflation-adjusted after-tax spending target.
2. Determine the gross account withdrawal required under the selected tax approximation.
3. Fail the cohort if the portfolio cannot fund the required withdrawal.
4. Deduct the withdrawal.
5. Apply the calendar year's asset returns to the remaining balances.
6. Apply investment fees.
7. Rebalance to target allocations.
8. Increase the next year's spending target using that year's inflation.

This ordering must be explicit because taking withdrawals before versus after annual returns can materially change outcomes.

### 7.2 Failure definition

A cohort fails when the available portfolio cannot fund the scheduled gross withdrawal required to provide the after-tax spending target. Once failed, its displayed portfolio balance remains zero.

### 7.3 Real-dollar presentation

The primary balance presentation should use constant purchasing-power dollars. Every cohort begins with the same user-entered starting value, and later balances are deflated by the cumulative inflation observed within that cohort.

### 7.4 Historical interpretation

The correct language is:

> None of the completed historical cohorts in the tested dataset depleted the portfolio under the selected assumptions.

The product must not call this a guarantee or state that depletion is mathematically impossible.

---

## 8. Data-source direction

The production dataset has not yet been assembled. The intended source direction is:

| Asset or variable | Initial source direction | Important caveat |
| --- | --- | --- |
| U.S. stocks | Broad U.S. total-return series or long-history S&P 500 total-return proxy | A large-cap index is not identical to the total U.S. market |
| U.S. bonds | U.S. Treasury total-return series | Bond duration must be specified and disclosed |
| International stocks | Long-history developed ex-U.S. total-return proxy | Likely to limit the common starting year |
| Cash | 3-month U.S. Treasury-bill total return | Not the same as a bank deposit or money-market fund |
| Technology stocks | Fama-French Business Equipment, annual value-weighted | Long-history sector proxy, not literal VGT |
| Inflation | Annual CPI inflation or a validated annual inflation field aligned with the return data | Calendar-year alignment must be tested |

Every production series should retain:

- Original source URL and publisher.
- Download date.
- Raw file checksum.
- Licensing or redistribution notes.
- Original column names and units.
- Transformation and normalization steps.
- Earliest and latest valid years.
- Missing-value and overlap handling.

The normalized application dataset should be immutable and versioned so a historical result can be reproduced later.

---

## 9. Current project status

### 9.1 Repository status

The project source was packaged as a ZIP because automated writes to the requested GitHub repository were blocked by integration permissions. The ZIP was downloaded and pushed manually by the project owner to:

```text
https://github.com/arcturus-labs/retirement-simulator
```

The local prototype source was originally represented by a clean commit containing the application, simulation engine, tests, README, and product specification.

### 9.2 Implemented interface

The prototype includes:

- A responsive six-step guided walkthrough.
- Starting portfolio and horizon inputs.
- Taxable, tax-deferred, and Roth account-percentage inputs.
- Portfolio allocation inputs for the five agreed asset classes.
- Validation that account percentages and allocation percentages total 100%.
- Information popovers beside each asset class.
- An after-tax withdrawal-rate input and derived first-year spending amount.
- Editable effective tax and annual-fee assumptions.
- A review screen.
- A results screen with a historical-survival verdict.
- Minimum, median, and maximum ending balances.
- Total tested window count.
- An overlaid cohort-path chart.
- Both calendar-year and years-since-retirement chart modes.
- Prominent demonstration-data and historical-backtest warnings.

### 9.3 Implemented calculation engine

The prototype engine currently supports:

- Rolling complete cohorts.
- Beginning-of-year withdrawals.
- Inflation-adjusted spending.
- A blended asset return based on the target allocation.
- Annual fee drag.
- A simplified blended effective tax gross-up.
- Annual target-weight rebalancing at the conceptual portfolio level.
- Real and nominal balances in each annual path.
- Failure year and ending-balance aggregation.

### 9.4 Implemented tests

Four engine tests were written and passed:

- Only complete rolling cohorts are counted.
- Percentage-based scenarios are scale-invariant.
- Allocations not totaling 100% are rejected.
- A positive-withdrawal scenario cannot end with more money than an otherwise identical zero-withdrawal scenario.

### 9.5 What is only represented in the UI or specification

The current engine does **not** yet maintain separate balances and asset allocations for taxable, tax-deferred, and Roth accounts. The walkthrough collects account percentages, but the current calculation uses one blended portfolio and one effective tax rate.

Likewise, the documented taxable-first withdrawal order is not yet implemented as an account-level sequence because the engine does not yet contain independent account balances.

These are important distinctions. The prototype demonstrates the intended interaction and exercises the rolling-cohort architecture, but it is not yet an account-aware tax simulator.

### 9.6 Current data limitation

No real historical datasets have been downloaded or installed.

The bundled annual observations are deterministic synthetic demonstration data covering nominal years 1928 through 2024. They exist only to make the walkthrough, calculation flow, outputs, and charts operational.

They must not be described as provisional market data and must not be used for investment or retirement decisions.

### 9.7 Build and deployment history

The automated calculation tests passed locally. A production Next.js build could not complete inside the original managed container because operating-system memory and network-interface calls returned environment-level errors. This was separate from application test failures.

A ChatGPT Sites project was created, but its automatically provisioned source repository returned HTTP 500 during authenticated Git pushes, including pushes of a clean small history. As a result, no Sites deployment was completed.

The GitHub repository was later created and the owner manually uploaded the ZIP source after the available GitHub integration rejected write and pull-request operations with `403 Resource not accessible by integration`.

---

## 10. Remaining work

### Phase 1. Replace demonstration data with validated history

This is the most important next step.

1. Select the exact production series for all five asset classes and inflation.
2. Confirm that each series represents total return, including distributions where applicable.
3. Download and retain immutable raw source files.
4. Build repeatable import and normalization scripts.
5. Align all observations to consistent calendar years.
6. Compute the common valid range dynamically based on nonzero allocations.
7. Display the source, range, and proxy limitations in each asset information pop-up.
8. Remove the demonstration-data warning only after the validation suite passes.

International-stock history is the most likely constraint on the earliest common cohort. The source should be chosen carefully rather than extended backward through an undocumented assumption.

### Phase 2. Reproduce the reference-study checkpoints

Before trusting the new engine, reproduce the known values from the reference guide using the corresponding proxy portfolios and assumptions.

Important checkpoints include:

- Correct counts of completed 30-year and 45-year cohorts over the guide's 1928–2022 dataset.
- VTSAX/S&P proxy historical safe-max withdrawal rates.
- Known maximum-ending-balance cohorts for 30-year and 45-year scenarios.
- Known survival percentages at selected withdrawal rates.
- Known 2% survival and ending-balance distributions.
- The zero-return “Mason Jar” control.

These checks should become permanent automated regression tests rather than one-time manual comparisons.

### Phase 3. Complete account-level simulation

1. Represent taxable, tax-deferred, and Roth accounts as independent balances.
2. Store target asset allocations inside each account.
3. Apply returns and rebalancing within the appropriate account.
4. Implement taxable-first, then tax-deferred, then Roth withdrawal ordering.
5. Gross up withdrawals so the user receives the requested after-tax spending amount.
6. Handle partial withdrawals that exhaust one account and continue into the next.
7. Add account-level annual paths to the audit output.

### Phase 4. Improve the simple tax model without overbuilding it

The agreed scope is still a simplified model, not tax preparation. A reasonable next version should add only the minimum state necessary to distinguish the account types honestly:

- Editable ordinary-income tax rate.
- Editable long-term capital-gains tax rate.
- Simplified taxable-account cost-basis percentage.
- A documented rule for dividends and interest in taxable accounts.
- Clear indication of whether tax defaults include state taxes.

Progressive tax brackets, required minimum distributions, Social Security taxation, and tax-loss harvesting should remain later work unless the project scope explicitly expands.

### Phase 5. Deepen result inspection

The results should become auditable, not merely attractive.

Add:

- A table of every cohort with start year, survival status, failure year, and ending balance.
- Sorting by worst, median, and best outcomes.
- A selected-cohort detail view with annual returns, inflation, spending, fees, taxes, and balances.
- Clear identification of the cohorts producing minimum and maximum ending balances.
- A comparison against the same cohort with zero withdrawals.
- CSV export of cohort summaries and annual paths.

### Phase 6. Save and reproduce scenarios

Create a versioned scenario format containing every input and assumption used by the engine. This should support:

- Shareable scenario links or exported scenario JSON.
- Exact reruns against a specific dataset version.
- Comparison of two scenarios.
- Future population by an agent skill.

### Phase 7. Agent skill and brokerage-assisted input

After the scenario schema and engine are stable:

1. Define an agent skill that walks through the same six conceptual steps.
2. Allow the agent to populate known scenario fields conversationally.
3. Explore connections to Vanguard, Fidelity, or an aggregation service.
4. Map actual holdings to supported historical asset proxies.
5. Mark inferred mappings and confidence explicitly.
6. Require a final user review before running the simulation.

This is intentionally later work. Brokerage ingestion should not be built before the base historical engine is trustworthy.

---

## 11. Conservative additions that are important but were not deeply discussed

The following items are important enough to include, but they should not expand the initial product unnecessarily.

### 11.1 Dataset versioning

Historical providers revise data. Every result should identify the normalized dataset version used. Otherwise an old shared scenario could silently produce a different result after a data refresh.

### 11.2 Numerical precision and rounding

Calculations should retain full precision internally. Currency formatting and displayed percentages should be rounded only at the UI boundary. Tests should use explicit tolerances.

### 11.3 Invalid and extreme input handling

The product should define reasonable boundaries for negative balances, zero-year horizons, tax rates of 100% or more, allocations below zero, horizons longer than the dataset, and withdrawal rates that immediately exceed the portfolio.

### 11.4 Accessibility and chart alternatives

The overlaid chart needs an accessible textual or tabular equivalent. Success and failure cannot be distinguished by color alone.

### 11.5 Privacy for future brokerage connections

If brokerage data is connected later, the product should request the narrowest read-only access possible and should not retain account identifiers or holdings beyond what is necessary for the scenario without explicit consent.

These additions support reliability and user trust, but they do not change the agreed product concept.

---

## 12. Recommended immediate next milestone

The next milestone should be:

> Replace all demonstration observations with a reproducible, source-documented historical dataset and pass the reference regression suite for the supported overlapping portfolios.

The milestone is complete only when:

- The raw sources and normalized data are versioned.
- Every UI proxy pop-up identifies its real source and limitation.
- Cohort counts are correct for arbitrary horizons.
- Beginning-of-year withdrawal and inflation timing are verified.
- The historical checkpoints in the original guide are reproduced within documented tolerances.
- The zero-return and zero-withdrawal invariants pass.
- The demonstration-data warning can be removed honestly.

Only after that milestone should the product's numerical output be treated as a meaningful historical result.

---

## 13. Concise product definition

Historical Retirement Simulator is an interactive tool for testing whether a diversified portfolio and inflation-adjusted after-tax spending plan would have survived every complete rolling historical retirement period supported by the selected long-history asset proxies. It reports historical survival rates, cohort counts, ending-balance distributions, and every cohort's portfolio path while exposing the data sources, assumptions, and limitations behind the result.

The current repository contains a functional interaction and simulation prototype. Its calculation architecture is in place, but its bundled returns are synthetic, its taxes are blended rather than account-aware, and its production historical-data and regression-validation work remains to be completed.
