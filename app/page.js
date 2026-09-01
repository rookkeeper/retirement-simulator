"use client";

import { useMemo, useState } from "react";
import { ASSETS, observations } from "../lib/demoData.mjs";
import { simulateScenario } from "../lib/simulate.mjs";

const STEPS = ["Plan", "Accounts", "Allocation", "Spending", "Costs", "Review"];
const money = value => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

function Info({ asset }) {
  return <span className="info"><button aria-label={`About ${asset.label}`}>i</button><span className="popover"><b>{asset.label}</b><small>{asset.proxy}</small><p>This prototype uses a deterministic stand-in. Production will use a source-reviewed long-history total-return series and display its exact range and citation here.</p></span></span>;
}

function NumberField({ label, value, onChange, suffix, min = 0, step = 1 }) {
  return <label className="field"><span>{label}</span><div className="inputWrap"><input type="number" value={value} min={min} step={step} onChange={e => onChange(Number(e.target.value))}/>{suffix && <em>{suffix}</em>}</div></label>;
}

function PathChart({ result, mode, setMode }) {
  const width = 980, height = 350, pad = 42;
  const maxY = Math.max(...result.cohorts.flatMap(c => c.path.map(p => p.real)), 1);
  const firstYear = observations[0].year;
  const lastYear = observations.at(-1).year;
  const xFor = p => mode === "relative"
    ? pad + ((p.retirementYear - 1) / Math.max(1, result.cohorts[0].path.length - 1)) * (width - pad * 2)
    : pad + ((p.year - firstYear) / (lastYear - firstYear)) * (width - pad * 2);
  const yFor = v => height - pad - Math.sqrt(v / maxY) * (height - pad * 2);
  return <section className="chartCard">
    <div className="chartHead"><div><span className="eyebrow">ALL COHORTS</span><h2>Portfolio paths</h2></div><div className="segmented"><button className={mode === "relative" ? "active" : ""} onClick={() => setMode("relative")}>Years retired</button><button className={mode === "calendar" ? "active" : ""} onClick={() => setMode("calendar")}>Calendar year</button></div></div>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Inflation-adjusted portfolio paths">
      {[0, .25, .5, .75, 1].map(n => <g key={n}><line x1={pad} x2={width-pad} y1={height-pad-n*(height-pad*2)} y2={height-pad-n*(height-pad*2)} className="grid"/><text x="4" y={height-pad-n*(height-pad*2)+4}>{money(maxY*n*n).replace("$", "$ ")}</text></g>)}
      {result.cohorts.map((c, i) => <polyline key={c.startYear} points={c.path.map(p => `${xFor(p)},${yFor(p.real)}`).join(" ")} className={c.survived ? "path success" : "path failure"} style={{ opacity: .16 + (i/result.cohorts.length)*.3 }}/>) }
      <text x={pad} y={height-10}>{mode === "relative" ? "Year 1" : firstYear}</text><text x={width-pad-46} y={height-10}>{mode === "relative" ? `Year ${result.cohorts[0].path.length}` : lastYear}</text>
    </svg>
    <p className="chartNote">Balances are shown in cohort-start purchasing-power dollars. The square-root scale keeps both depleted and high-growth paths legible.</p>
  </section>;
}

export default function Home() {
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState({ startingBalance: 2000000, horizon: 30, withdrawalRate: 4, effectiveTaxRate: 12, annualFee: .15, taxable: 55, deferred: 30, roth: 15, allocation: { usStocks: 45, usBonds: 25, international: 15, cash: 5, technology: 10 } });
  const [mode, setMode] = useState("relative");
  const [showResults, setShowResults] = useState(false);
  const update = (key, value) => setConfig(c => ({ ...c, [key]: value }));
  const allocationTotal = Object.values(config.allocation).reduce((a,b)=>a+b,0);
  const accountTotal = config.taxable + config.deferred + config.roth;
  const result = useMemo(() => { try { return simulateScenario(config, observations); } catch { return null; } }, [config]);

  const panels = [
    <div className="panel" key="plan"><span className="eyebrow">STEP 1</span><h1>Shape the retirement you want to test.</h1><p className="lede">We’ll replay your plan across every complete historical window available.</p><div className="grid2"><NumberField label="Starting portfolio" value={config.startingBalance} step={50000} onChange={v=>update("startingBalance",v)}/><NumberField label="Years it must last" value={config.horizon} min={10} onChange={v=>update("horizon",v)}/></div></div>,
    <div className="panel" key="accounts"><span className="eyebrow">STEP 2</span><h1>Where is the money held?</h1><p className="lede">These buckets affect the simplified tax estimate and future withdrawal order.</p><div className="grid3"><NumberField label="Taxable brokerage" value={config.taxable} suffix="%" onChange={v=>update("taxable",v)}/><NumberField label="Tax-deferred" value={config.deferred} suffix="%" onChange={v=>update("deferred",v)}/><NumberField label="Roth / tax-free" value={config.roth} suffix="%" onChange={v=>update("roth",v)}/></div><div className={`total ${accountTotal===100?"ok":"bad"}`}>{accountTotal}% allocated</div></div>,
    <div className="panel" key="allocation"><span className="eyebrow">STEP 3</span><h1>Build the portfolio mix.</h1><p className="lede">The target mix is restored once per year after returns and spending.</p><div className="assetList">{ASSETS.map(asset=><div className="assetRow" key={asset.id}><span className="dot" style={{background:asset.color}}/><span>{asset.label} <Info asset={asset}/></span><div className="allocationInput"><input type="number" value={config.allocation[asset.id]} onChange={e=>setConfig(c=>({...c,allocation:{...c.allocation,[asset.id]:Number(e.target.value)}}))}/><b>%</b></div></div>)}</div><div className={`total ${allocationTotal===100?"ok":"bad"}`}>{allocationTotal}% allocated</div></div>,
    <div className="panel" key="spending"><span className="eyebrow">STEP 4</span><h1>Set your after-tax spending.</h1><p className="lede">This first-year amount rises with the inflation recorded in each historical cohort.</p><NumberField label="Initial withdrawal rate" value={config.withdrawalRate} suffix="%" step={.1} onChange={v=>update("withdrawalRate",v)}/><div className="callout"><span>Year-one spending</span><strong>{money(config.startingBalance*config.withdrawalRate/100)}</strong><small>available after estimated taxes</small></div></div>,
    <div className="panel" key="costs"><span className="eyebrow">STEP 5</span><h1>Add a simple cost layer.</h1><p className="lede">Editable defaults keep this useful without pretending to be a tax return.</p><div className="grid2"><NumberField label="Effective withdrawal tax" value={config.effectiveTaxRate} suffix="%" step={.5} onChange={v=>update("effectiveTaxRate",v)}/><NumberField label="Annual portfolio fee" value={config.annualFee} suffix="%" step={.05} onChange={v=>update("annualFee",v)}/></div><div className="notice">Taxable-first withdrawal is the documented default. This prototype uses one blended effective rate; account-level basis, income character, and tax brackets are reserved for the next engine version.</div></div>,
    <div className="panel" key="review"><span className="eyebrow">STEP 6</span><h1>Review the experiment.</h1><div className="reviewGrid"><div><span>Starting portfolio</span><b>{money(config.startingBalance)}</b></div><div><span>After-tax spending</span><b>{money(config.startingBalance*config.withdrawalRate/100)}</b></div><div><span>Horizon</span><b>{config.horizon} years</b></div><div><span>Complete cohorts</span><b>{result?.cohortCount || 0}</b></div><div><span>Annual fee</span><b>{config.annualFee}%</b></div><div><span>Annual rebalancing</span><b>On</b></div></div><div className="dataWarning"><b>Demonstration dataset</b><p>The engine is operational, but these bundled returns are deterministic stand-ins. Do not use this preview for financial decisions. Production data ingestion and regression validation are still required.</p></div></div>
  ];

  if (showResults && result) return <main><header className="topbar"><div className="brand"><span>HR</span><b>Historical Retirement Lab</b></div><button className="textButton" onClick={()=>setShowResults(false)}>← Edit scenario</button></header><div className="results"><div className="resultsHero"><div><span className="eyebrow">HISTORICAL BACKTEST</span><h1>{result.survivedAll ? "Every completed cohort survived." : `${result.failures} cohorts ran out of money.`}</h1><p>{result.successes} of {result.cohortCount} complete {config.horizon}-year windows funded the planned after-tax spending.</p></div><div className={result.survivedAll?"verdict yes":"verdict no"}><small>Survival rate</small><strong>{(result.survivalRate*100).toFixed(1)}%</strong></div></div><div className="metrics"><div><span>Minimum ending</span><b>{money(result.min)}</b></div><div><span>Median ending</span><b>{money(result.median)}</b></div><div><span>Maximum ending</span><b>{money(result.max)}</b></div><div><span>Tested windows</span><b>{result.cohortCount}</b></div></div><PathChart result={result} mode={mode} setMode={setMode}/><div className="disclaimer"><b>Historical evidence, not a guarantee.</b> This preview uses demonstration returns and a simplified flat tax estimate. Future markets, inflation, taxes, and investor behavior can differ materially.</div></div></main>;

  const canContinue = (step !== 1 || accountTotal === 100) && (step !== 2 || allocationTotal === 100);
  return <main><header className="topbar"><div className="brand"><span>HR</span><b>Historical Retirement Lab</b></div><span className="prototype">PROTOTYPE · DEMO DATA</span></header><div className="shell"><aside><p>YOUR SCENARIO</p>{STEPS.map((label,i)=><button key={label} onClick={()=>setStep(i)} className={i===step?"current":i<step?"done":""}><span>{i<step?"✓":i+1}</span>{label}</button>)}</aside><section className="workspace">{panels[step]}<footer className="actions"><button className="secondary" disabled={step===0} onClick={()=>setStep(s=>s-1)}>Back</button>{step<5?<button className="primary" disabled={!canContinue} onClick={()=>setStep(s=>s+1)}>Continue</button>:<button className="primary" onClick={()=>setShowResults(true)}>Run historical test</button>}</footer></section></div></main>;
}
