# Historical Retirement Lab

Historical Retirement Lab is an interactive retirement backtesting tool that evaluates a portfolio and an inflation-adjusted withdrawal strategy across every complete rolling historical period available. Users can configure account types, asset allocation, spending, taxes, fees, and retirement horizon, then compare survival rates, ending balances, and portfolio paths across historical cohorts.

The current version is a functional prototype using demonstration return data. Production use will require validated historical datasets and expanded account-level tax modeling.

## Development

```bash
npm install
npm test
npm run dev
```

See [`PRODUCT_TECH_SPEC.md`](PRODUCT_TECH_SPEC.md) for the production data and tax-engine boundary.
