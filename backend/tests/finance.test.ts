import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateMetrics,
  runSimulation,
  revenueNeededForTargetProfit,
} from "../src/services/finance.js";
// The frontend keeps a mirror of this math for instant UI previews — assert the
// two copies never drift apart.
import { calculateMetrics as frontendCalculateMetrics } from "../../frontend/src/lib/finance.js";

test("healthy business: strong margins, no burn, Excellent", () => {
  const m = calculateMetrics({
    revenue: 10000,
    cogs: 4000,
    operatingExpenses: 3000,
    cashOnHand: 50000,
  });

  assert.equal(m.grossProfit, 6000);
  assert.equal(m.grossMarginPct, 60);
  assert.equal(m.netProfit, 3000);
  assert.equal(m.netMarginPct, 30);
  assert.equal(m.totalExpenses, 7000);
  assert.equal(m.burnRatePerMonth, 0);
  assert.equal(m.runwayMonths, null); // profitable = infinite runway
  assert.equal(m.healthScore, 96);
  assert.equal(m.healthLabel, "Excellent");
});

test("loss-making business: burn rate and finite runway", () => {
  const m = calculateMetrics({
    revenue: 5000,
    cogs: 3000,
    operatingExpenses: 3000,
    cashOnHand: 10000,
  });

  assert.equal(m.netProfit, -1000);
  assert.equal(m.netMarginPct, -20);
  assert.equal(m.burnRatePerMonth, 1000);
  assert.equal(m.runwayMonths, 10); // 10000 cash / 1000 monthly burn
  assert.equal(m.healthScore, 42);
  assert.equal(m.healthLabel, "At Risk");
});

test("zero revenue: margins are 0, not NaN or Infinity", () => {
  const m = calculateMetrics({
    revenue: 0,
    cogs: 500,
    operatingExpenses: 500,
    cashOnHand: 2000,
  });

  assert.equal(m.grossMarginPct, 0);
  assert.equal(m.netMarginPct, 0);
  assert.ok(Number.isFinite(m.healthScore));
});

test("break-even: zero net profit counts as no burn", () => {
  const m = calculateMetrics({
    revenue: 8000,
    cogs: 4000,
    operatingExpenses: 4000,
    cashOnHand: 1000,
  });

  assert.equal(m.netProfit, 0);
  assert.equal(m.burnRatePerMonth, 0);
  assert.equal(m.runwayMonths, null);
});

test("negative cash with losses clamps runway at 0", () => {
  const m = calculateMetrics({
    revenue: 1000,
    cogs: 1000,
    operatingExpenses: 1000,
    cashOnHand: -500,
  });

  assert.equal(m.runwayMonths, 0);
});

test("health label boundaries", () => {
  // Score mapping checks via distinctive inputs:
  // Critical <30, At Risk <50, Stable <70, Healthy <85, Excellent >=85
  const critical = calculateMetrics({
    revenue: 1000,
    cogs: 900,
    operatingExpenses: 900,
    cashOnHand: 0,
  });
  assert.equal(critical.healthScore < 30, true);
  assert.equal(critical.healthLabel, "Critical");

  const excellent = calculateMetrics({
    revenue: 10000,
    cogs: 3000,
    operatingExpenses: 2000,
    cashOnHand: 0,
  });
  assert.equal(excellent.healthLabel, "Excellent");
});

test("simulation: price increase raises revenue and profit", () => {
  const result = runSimulation({
    base: { revenue: 10000, cogs: 4000, operatingExpenses: 3000, cashOnHand: 5000 },
    priceChangePct: 10,
    volumeChangePct: 0,
    costChangePct: 0,
    expenseChangePct: 0,
  });

  assert.equal(result.projected.revenue, 11000);
  assert.equal(result.after.netProfit, 4000);
  assert.equal(result.profitDelta, 1000);
  assert.equal(result.before.netProfit, 3000);
});

test("simulation: price and volume compound, not add", () => {
  const result = runSimulation({
    base: { revenue: 10000, cogs: 4000, operatingExpenses: 0, cashOnHand: 0 },
    priceChangePct: 10,
    volumeChangePct: 10,
    costChangePct: 0,
    expenseChangePct: 0,
  });

  // 1.1 * 1.1 = 1.21, i.e. +21%, not +20%
  assert.equal(result.projected.revenue, 12100);
  // COGS scales with volume only: 4000 * 1.1
  assert.equal(result.projected.cogs, 4400);
});

test("revenueNeededForTargetProfit solves at current margin", () => {
  const base = {
    revenue: 10000,
    cogs: 4000,
    operatingExpenses: 3000,
    cashOnHand: 0,
  };
  // 30% net margin → need 5000 extra revenue for 1500 profit
  assert.equal(revenueNeededForTargetProfit(base, 1500), 5000);
});

test("revenueNeededForTargetProfit returns NaN at non-positive margin", () => {
  const base = {
    revenue: 10000,
    cogs: 8000,
    operatingExpenses: 3000,
    cashOnHand: 0,
  };
  assert.ok(Number.isNaN(revenueNeededForTargetProfit(base, 1000)));
});

test("frontend mirror produces identical metrics to the backend", () => {
  const cases = [
    { revenue: 10000, cogs: 4000, operatingExpenses: 3000, cashOnHand: 50000 },
    { revenue: 5000, cogs: 3000, operatingExpenses: 3000, cashOnHand: 10000 },
    { revenue: 0, cogs: 500, operatingExpenses: 500, cashOnHand: 2000 },
    { revenue: 8000, cogs: 4000, operatingExpenses: 4000, cashOnHand: 1000 },
  ];

  for (const inputs of cases) {
    assert.deepEqual(calculateMetrics(inputs), frontendCalculateMetrics(inputs));
  }
});
