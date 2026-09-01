export const ASSETS = [
  { id: "usStocks", label: "U.S. stocks", proxy: "S&P 500 total-return stand-in", color: "#176B87" },
  { id: "usBonds", label: "U.S. bonds", proxy: "10-year Treasury total-return stand-in", color: "#64CCC5" },
  { id: "international", label: "International stocks", proxy: "Developed ex-U.S. stand-in", color: "#DAA520" },
  { id: "cash", label: "Cash", proxy: "3-month Treasury bill stand-in", color: "#8A94A6" },
  { id: "technology", label: "U.S. technology proxy", proxy: "Fama-French Business Equipment stand-in", color: "#B85C8E" }
];

// Deterministic demonstration observations exercise the complete engine while
// licensed/source-reviewed historical series are being assembled.
export const observations = Array.from({ length: 97 }, (_, i) => {
  const year = 1928 + i;
  const shock = [2, 3, 46, 61, 73].includes(i) ? -0.24 : [12, 26, 54, 82].includes(i) ? 0.25 : 0;
  const cycle = Math.sin(i * 1.71) * 0.115 + Math.cos(i * 0.43) * 0.045;
  const inflationShock = [45, 46, 47, 48].includes(i) ? 0.055 : 0;
  return {
    year,
    inflation: Math.max(-0.018, 0.026 + Math.sin(i * 0.31) * 0.018 + inflationShock),
    usStocks: -0.02 + 0.115 + cycle + shock,
    usBonds: 0.045 + Math.sin(i * 0.53) * 0.055 - shock * 0.12,
    international: 0.09 + Math.sin(i * 1.29 + 1.2) * 0.14 + shock * 0.85,
    cash: 0.028 + Math.sin(i * 0.27) * 0.018,
    technology: 0.125 + Math.sin(i * 1.93 + 0.7) * 0.205 + shock * 1.28
  };
});
