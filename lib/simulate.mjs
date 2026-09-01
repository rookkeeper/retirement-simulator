export function normalizedAllocation(allocation) {
  const total = Object.values(allocation).reduce((a, b) => a + Number(b || 0), 0);
  if (Math.abs(total - 100) > 0.001) throw new Error("Allocation must total 100%.");
  return Object.fromEntries(Object.entries(allocation).map(([k, v]) => [k, Number(v) / 100]));
}

export function simulateScenario(config, rows) {
  const allocation = normalizedAllocation(config.allocation);
  const horizon = Number(config.horizon);
  const cohorts = [];
  for (let start = 0; start + horizon <= rows.length; start++) {
    const path = [];
    let balance = Number(config.startingBalance);
    let realSpending = balance * (Number(config.withdrawalRate) / 100);
    let nominalSpending = realSpending;
    let cumulativeInflation = 1;
    let survived = true;
    let failureYear = null;
    for (let offset = 0; offset < horizon; offset++) {
      const row = rows[start + offset];
      const grossNeeded = nominalSpending / Math.max(0.01, 1 - Number(config.effectiveTaxRate) / 100);
      if (balance < grossNeeded) {
        balance = 0;
        survived = false;
        failureYear = row.year;
      } else if (survived) {
        balance -= grossNeeded;
        const grossReturn = Object.entries(allocation).reduce((sum, [asset, weight]) => sum + weight * row[asset], 0);
        balance *= Math.max(0, 1 + grossReturn - Number(config.annualFee) / 100);
      }
      cumulativeInflation *= 1 + row.inflation;
      path.push({
        year: row.year,
        retirementYear: offset + 1,
        nominal: balance,
        real: balance / cumulativeInflation
      });
      nominalSpending *= 1 + row.inflation;
    }
    cohorts.push({ startYear: rows[start].year, survived, failureYear, endingBalance: path.at(-1).real, path });
  }
  const endings = cohorts.map(c => c.endingBalance).sort((a, b) => a - b);
  const median = endings.length % 2 ? endings[(endings.length - 1) / 2] : (endings[endings.length / 2 - 1] + endings[endings.length / 2]) / 2;
  const successes = cohorts.filter(c => c.survived).length;
  return {
    cohorts,
    cohortCount: cohorts.length,
    successes,
    failures: cohorts.length - successes,
    survivedAll: successes === cohorts.length,
    survivalRate: cohorts.length ? successes / cohorts.length : 0,
    min: endings[0] ?? 0,
    median: median ?? 0,
    max: endings.at(-1) ?? 0
  };
}
