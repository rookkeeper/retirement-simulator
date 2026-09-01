#!/usr/bin/env python3
"""Build the simulator's versioned annual dataset from downloaded source files.

Requires: xlrd>=2.0.1 (see requirements.txt).
"""

from __future__ import annotations

import csv
import hashlib
import json
import math
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path

try:
    import xlrd
except ImportError as exc:  # pragma: no cover - an environment/setup error
    raise SystemExit("Install the data tooling first: python -m pip install -r scripts/data/requirements.txt") from exc

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data" / "raw"
NORMALIZED = ROOT / "data" / "normalized"
METADATA = ROOT / "data" / "metadata"


def is_number(value: object) -> bool:
    return isinstance(value, (int, float)) and math.isfinite(float(value))


def read_nyu_returns() -> tuple[dict[int, float], dict[int, float], dict[int, float], dict[int, float]]:
    book = xlrd.open_workbook(RAW / "nyu-stern" / "histretSP.xls")
    sheet = book.sheet_by_name("Returns by year")
    stocks: dict[int, float] = {}
    bonds: dict[int, float] = {}
    cash: dict[int, float] = {}
    for row in range(sheet.nrows):
        year = sheet.cell_value(row, 0)
        if not is_number(year) or int(year) != year or int(year) < 1900:
            continue
        values = [sheet.cell_value(row, column) for column in (1, 3, 4)]
        if not all(is_number(value) for value in values):
            continue
        year = int(year)
        stocks[year] = float(values[0])
        cash[year] = float(values[1])
        bonds[year] = float(values[2])

    inflation_sheet = book.sheet_by_name("Inflation Rate")
    inflation: dict[int, float] = {}
    for row in range(inflation_sheet.nrows):
        year = inflation_sheet.cell_value(row, 0)
        value = inflation_sheet.cell_value(row, 2)
        if is_number(year) and int(year) == year and int(year) >= 1900 and is_number(value):
            inflation[int(year)] = float(value)
    return stocks, bonds, cash, inflation


def read_annual_section(archive: Path, marker: str, column: str) -> dict[int, float]:
    with zipfile.ZipFile(archive) as zipped:
        names = zipped.namelist()
        text = zipped.read(names[0]).decode("latin-1")
    lines = text.splitlines()
    marker_index = next(index for index, line in enumerate(lines) if marker in line)
    header_index = marker_index + 1
    while not lines[header_index].strip():
        header_index += 1
    headers = [cell.strip() for cell in next(csv.reader([lines[header_index]]))]
    column_index = headers.index(column)
    values: dict[int, float] = {}
    for line in lines[header_index + 1 :]:
        if not line.strip():
            break
        cells = next(csv.reader([line]))
        year_text = cells[0].strip()
        try:
            year = int(year_text)
        except ValueError:
            continue
        if year < 1900 or len(cells) <= column_index:
            continue
        value_text = cells[column_index].strip()
        try:
            value = float(value_text)
        except ValueError:
            continue
        if value <= -99:
            continue
        values[year] = value / 100
    return values


def read_fred_december_cpi() -> dict[int, float]:
    observations: dict[int, float] = {}
    with (RAW / "fred" / "CPIAUCNS.csv").open(newline="") as handle:
        for row in csv.DictReader(handle):
            date = row["observation_date"]
            value = row["CPIAUCNS"]
            if not date.endswith("-12-01") or not value:
                continue
            try:
                observations[int(date[:4])] = float(value)
            except ValueError:
                continue
    return {
        year: observations[year] / observations[year - 1] - 1
        for year in sorted(observations)
        if year - 1 in observations and observations[year - 1] > 0
    }


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> None:
    stocks, bonds, cash, inflation = read_nyu_returns()
    technology = read_annual_section(
        RAW / "ken-french" / "30_Industry_Portfolios_CSV.zip",
        "Average Value Weighted Returns -- Annual",
        "BusEq",
    )
    international_factors = read_annual_section(
        RAW / "ken-french" / "Developed_ex_US_3_Factors_CSV.zip",
        "Annual Factors: January-December",
        "Mkt-RF",
    )
    international_rf = read_annual_section(
        RAW / "ken-french" / "Developed_ex_US_3_Factors_CSV.zip",
        "Annual Factors: January-December",
        "RF",
    )
    international = {
        year: international_factors[year] + international_rf[year]
        for year in international_factors.keys() & international_rf.keys()
    }
    fred_inflation = read_fred_december_cpi()

    series = {
        "usStocks": stocks,
        "usBonds": bonds,
        "international": international,
        "cash": cash,
        "technology": technology,
        "inflation": inflation,
    }
    common_years = sorted(set.intersection(*(set(values) for values in series.values())))
    if not common_years:
        raise SystemExit("No complete common years found")

    NORMALIZED.mkdir(parents=True, exist_ok=True)
    METADATA.mkdir(parents=True, exist_ok=True)

    with (NORMALIZED / "returns-long.csv").open("w", newline="") as handle:
        writer = csv.writer(handle, lineterminator="\n")
        writer.writerow(["year", "series_id", "return_decimal"])
        for series_id, values in series.items():
            for year in sorted(values):
                writer.writerow([year, series_id, f"{values[year]:.12f}"])

    with (NORMALIZED / "annual-observations.csv").open("w", newline="") as handle:
        writer = csv.writer(handle, lineterminator="\n")
        writer.writerow(["year", "usStocks", "usBonds", "international", "cash", "technology", "inflation"])
        for year in common_years:
            writer.writerow([year] + [f"{series[key][year]:.12f}" for key in ("usStocks", "usBonds", "international", "cash", "technology", "inflation")])

    shared_inflation_years = sorted(set(inflation) & set(fred_inflation))
    inflation_differences = [abs(inflation[year] - fred_inflation[year]) for year in shared_inflation_years]
    raw_files = sorted(path for path in (RAW / "nyu-stern").glob("*") if path.is_file()) + sorted(path for path in (RAW / "ken-french").glob("*") if path.is_file()) + sorted(path for path in (RAW / "fred").glob("*") if path.is_file())
    source_catalog = {
        "nyu-stern-histretSP": {
            "publisher": "Aswath Damodaran, NYU Stern",
            "url": "https://www.stern.nyu.edu/~adamodar/pc/datasets/histretSP.xls",
            "source_page": "https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/histretSP.html",
            "format": "Excel workbook",
            "notes": "Annual U.S.-dollar returns; the workbook identifies the stock series as including dividends and the bond series as a 10-year Treasury return.",
        },
        "ken-french-30-industry": {
            "publisher": "Eugene F. Fama and Kenneth R. French",
            "url": "https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/ftp/30_Industry_Portfolios_CSV.zip",
            "source_page": "https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/data_library.html",
            "format": "CSV inside ZIP archive",
            "notes": "Annual value-weighted industry returns; BusEq is used as the U.S. technology proxy.",
        },
        "ken-french-developed-ex-us-3-factors": {
            "publisher": "Eugene F. Fama and Kenneth R. French",
            "url": "https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/ftp/Developed_ex_US_3_Factors_CSV.zip",
            "source_page": "https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/data_library.html",
            "format": "CSV inside ZIP archive",
            "notes": "Annual Developed ex-U.S. factors in U.S. dollars; market total return is reconstructed as Mkt-RF + RF.",
        },
        "fred-CPIAUCNS": {
            "publisher": "Federal Reserve Bank of St. Louis (FRED), BLS CPI-U",
            "url": "https://fred.stlouisfed.org/graph/fredgraph.csv?id=CPIAUCNS",
            "source_page": "https://fred.stlouisfed.org/series/CPIAUCNS",
            "format": "CSV",
            "notes": "Monthly, not-seasonally-adjusted CPI-U levels retained for an independent December-to-December inflation check.",
        },
    }
    series_metadata = {
        "usStocks": {"source_id": "nyu-stern-histretSP", "field": "S&P 500 (includes dividends)", "transformation": "Convert percentage to decimal fraction.", "total_return": True, "coverage": {"start_year": min(stocks), "end_year": max(stocks)}},
        "usBonds": {"source_id": "nyu-stern-histretSP", "field": "US T. Bond (10-year)", "transformation": "Convert percentage to decimal fraction.", "total_return": True, "coverage": {"start_year": min(bonds), "end_year": max(bonds)}},
        "international": {"source_id": "ken-french-developed-ex-us-3-factors", "field": "Mkt-RF + RF", "transformation": "Add annual market excess return and risk-free return; convert percentage to decimal fraction.", "total_return": True, "coverage": {"start_year": min(international), "end_year": max(international)}},
        "cash": {"source_id": "nyu-stern-histretSP", "field": "3-month T.Bill", "transformation": "Convert percentage to decimal fraction.", "total_return": True, "coverage": {"start_year": min(cash), "end_year": max(cash)}},
        "technology": {"source_id": "ken-french-30-industry", "field": "BusEq, value-weighted", "transformation": "Select annual value-weighted BusEq return; convert percentage to decimal fraction.", "total_return": True, "coverage": {"start_year": min(technology), "end_year": max(technology)}},
        "inflation": {"source_id": "nyu-stern-histretSP", "field": "CPIAUCNS annual rate", "transformation": "Convert percentage to decimal fraction; retain annual CPI rate.", "total_return": False, "coverage": {"start_year": min(inflation), "end_year": max(inflation)}},
    }
    manifest = {
        "dataset_version": "2026-09-01-v1",
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "frequency": "annual",
        "return_unit": "decimal fraction",
        "calendar": "calendar year",
        "common_complete_range": {"start_year": common_years[0], "end_year": common_years[-1], "count": len(common_years)},
        "sources": source_catalog,
        "series": series_metadata,
        "inflation_cross_check": {
            "source_id": "fred-CPIAUCNS",
            "method": "December CPI divided by prior December CPI minus one",
            "years_compared": len(shared_inflation_years),
            "max_absolute_difference": max(inflation_differences, default=0),
        },
        "raw_files": [{"path": str(path.relative_to(ROOT)), "sha256": sha256(path), "bytes": path.stat().st_size} for path in raw_files],
    }
    (METADATA / "sources.json").write_text(json.dumps(manifest, indent=2) + "\n")

    print(f"Wrote {len(common_years)} complete common annual observations: {common_years[0]}-{common_years[-1]}")
    print(f"International coverage: {min(international)}-{max(international)}")
    print(f"Maximum NYU/FRED inflation difference: {manifest['inflation_cross_check']['max_absolute_difference']:.12g}")


if __name__ == "__main__":
    main()
