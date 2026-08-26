'use client'
export const DEFAULT_PRICING = { price_per_completed: 2.5, monthly_cap: 5000 }
export function estRevenue(fee, completedCount) { return Number(fee || 0) * Number(completedCount || 0) }
export function fmtINR(v) { const n = Number(v || 0); return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: n < 100 ? 2 : 0 })}` }
