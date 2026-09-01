import test from "node:test";
import assert from "node:assert/strict";
import { simulateScenario } from "../lib/simulate.mjs";

const rows = Array.from({length: 12},(_,i)=>({year:2000+i,inflation:0,stock:.05,bond:.02}));
const config = {startingBalance:1000000,horizon:10,withdrawalRate:4,effectiveTaxRate:0,annualFee:0,allocation:{stock:60,bond:40}};

test("uses only complete rolling cohorts",()=>assert.equal(simulateScenario(config,rows).cohortCount,3));
test("is scale invariant",()=>{const a=simulateScenario(config,rows);const b=simulateScenario({...config,startingBalance:2000000},rows);assert.equal(a.survivedAll,b.survivedAll);assert.ok(Math.abs(b.median-2*a.median)<.01)});
test("rejects invalid allocation",()=>assert.throws(()=>simulateScenario({...config,allocation:{stock:90}},rows),/100%/));
test("withdrawal cannot improve ending wealth",()=>{const a=simulateScenario({...config,withdrawalRate:0},rows);const b=simulateScenario(config,rows);assert.ok(a.min>=b.max)});
