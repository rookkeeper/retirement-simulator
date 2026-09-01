# Historical data

The `raw/` directory contains the downloaded source files used to build the simulator dataset. Raw files are not edited in place.

Run the normalizer with the data-tooling dependency installed:

```bash
python -m pip install -r scripts/data/requirements.txt
python scripts/data/normalize.py
```

Generated files:

- `normalized/returns-long.csv` — all available source observations in decimal-return form.
- `normalized/annual-observations.csv` — the complete common annual range used by the simulator.
- `metadata/sources.json` — source fields, transformations, coverage, and raw-file SHA-256 checksums.

The first normalized build uses NYU Stern/Damodaran's annual S&P 500, 10-year Treasury, 3-month Treasury bill, and CPI series; Kenneth French's value-weighted `BusEq` industry portfolio for the U.S. technology proxy; and Kenneth French's Developed ex-U.S. market factor plus risk-free rate for international stocks. The FRED CPI-U download is retained as an inflation cross-check.

International data begins in 1991 for complete calendar years, so it determines the common range whenever international stocks have a nonzero allocation. Missing years are not interpolated or fabricated.
