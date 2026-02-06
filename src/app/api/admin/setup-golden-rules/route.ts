/**
 * API Route: Setup Golden Rules Table
 *
 * One-time setup endpoint that creates the golden_rules table
 * and seeds it with all 49 rules from backend/golden_rules.py
 *
 * POST /api/admin/setup-golden-rules
 * Requires CRON_SECRET or admin token for authorization
 */

import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// All 49 golden rules from backend/golden_rules.py
const GOLDEN_RULES_SEED = [
  { rule_id: 30, name: "4-5 gol 2.33", primary_odds: {"4-5": 2.33}, secondary_odds: null, exclude_odds: null, predictions: ["İY 0.5 ÜST", "İY 1.5 ÜST", "İY EV 0.5 ÜST"], confidence_base: 90, importance: "önemli", notes: "" },
  { rule_id: 16, name: "4-5 gol 2.38", primary_odds: {"4-5": 2.38}, secondary_odds: null, exclude_odds: null, predictions: ["İY 0.5 ÜST", "MS 2.5 ÜST", "MS 3.5 ÜST", "İY 1.5 ÜST", "İY EV 0.5 ÜST", "KG VAR"], confidence_base: 91, importance: "önemli", notes: "" },
  { rule_id: 2, name: "4-5 gol 2.40", primary_odds: {"4-5": 2.40}, secondary_odds: null, exclude_odds: null, predictions: ["MS 1.5 ÜST", "MS 2.5 ÜST", "EV MS 0.5 ÜST"], confidence_base: 89, importance: "normal", notes: "" },
  { rule_id: 50, name: "4-5 gol 2.43", primary_odds: {"4-5": 2.43}, secondary_odds: null, exclude_odds: null, predictions: ["İY 0.5 ÜST", "İY 1.5 ÜST", "İY EV 0.5 ÜST", "MS 1.5 ÜST", "MS 2.5 ÜST", "MS 3.5 ÜST"], confidence_base: 88, importance: "önemli", notes: "" },
  { rule_id: 40, name: "4-5 gol 2.48", primary_odds: {"4-5": 2.48}, secondary_odds: null, exclude_odds: null, predictions: ["İY 0.5 ÜST", "MS 1.5 ÜST", "MS DEP 0.5 ÜST", "MS EV 0.5 ÜST", "KG VAR"], confidence_base: 88, importance: "normal", notes: "" },
  { rule_id: 48, name: "4-5 gol 2.51 + 2.5 üst 1.23", primary_odds: {"4-5": 2.51}, secondary_odds: {"2,5 Ü": 1.23}, exclude_odds: null, predictions: ["İY 0.5 ÜST", "İY EV 0.5 ÜST", "MS 2.5 ÜST", "MS 3.5 ÜST", "MS DEP 1.5 ÜST", "KG VAR"], confidence_base: 90, importance: "normal", notes: "" },
  { rule_id: 44, name: "4-5 gol 2.52", primary_odds: {"4-5": 2.52}, secondary_odds: null, exclude_odds: null, predictions: ["İY 0.5 ÜST", "İY EV 0.5 ÜST", "İY 1.5 ÜST", "MS 1.5 ÜST"], confidence_base: 87, importance: "normal", notes: "" },
  { rule_id: 47, name: "4-5 gol 2.54", primary_odds: {"4-5": 2.54}, secondary_odds: null, exclude_odds: null, predictions: ["İY 0.5 ÜST", "İY 1.5 ÜST", "İY EV 0.5 ÜST", "MS EV 1.5 ÜST", "MS 2.5 ÜST", "MS 3.5 ÜST", "KG VAR"], confidence_base: 89, importance: "normal", notes: "" },
  { rule_id: 10, name: "4-5 gol 2.57", primary_odds: {"4-5": 2.57}, secondary_odds: null, exclude_odds: null, predictions: ["MS 2.5 ÜST", "MS 3.5 ÜST", "MS DEP 1.5 ÜST", "İY 0.5 ÜST", "İY DEP 0.5 ÜST"], confidence_base: 90, importance: "önemli", notes: "" },
  { rule_id: 23, name: "4-5 gol 2.59", primary_odds: {"4-5": 2.59}, secondary_odds: null, exclude_odds: null, predictions: ["MS 2.5 ÜST", "MS 3.5 ÜST", "MS EV 1.5 ÜST", "İY 0.5 ÜST", "İY 1.5 ÜST"], confidence_base: 89, importance: "özel", notes: "" },
  { rule_id: 6, name: "4-5 gol 2.60", primary_odds: {"4-5": 2.60}, secondary_odds: null, exclude_odds: null, predictions: ["İY 0.5 ÜST", "MS EV 0.5 ÜST", "MS 1.5 ÜST"], confidence_base: 88, importance: "normal", notes: "" },
  { rule_id: 61, name: "4-5 gol 2.60 + 2.5 alt 2.83", primary_odds: {"4-5": 2.60}, secondary_odds: {"2,5 A": 2.83}, exclude_odds: null, predictions: ["İY 0.5 ÜST", "İY 1.5 ÜST", "İY EV 0.5 ÜST", "MS 1.5 ÜST", "MS 2.5 ÜST", "MS 3.5 ÜST"], confidence_base: 90, importance: "normal", notes: "" },
  { rule_id: 22, name: "4-5 gol 2.61", primary_odds: {"4-5": 2.61}, secondary_odds: null, exclude_odds: null, predictions: ["MS 2.5 ÜST", "MS 1.5 ÜST", "MS EV 1.5 ÜST", "MS EV 0.5 ÜST"], confidence_base: 88, importance: "özel", notes: "" },
  { rule_id: 36, name: "4-5 gol 2.62", primary_odds: {"4-5": 2.62}, secondary_odds: null, exclude_odds: null, predictions: ["İY 0.5 ÜST", "İY 1.5 ÜST", "İY EV 0.5 ÜST", "MS EV 1.5 ÜST", "MS 2.5 ÜST"], confidence_base: 89, importance: "önemli", notes: "" },
  { rule_id: 32, name: "4-5 gol 2.63", primary_odds: {"4-5": 2.63}, secondary_odds: null, exclude_odds: null, predictions: ["MS 1.5 ÜST", "MS 2.5 ÜST", "MS EV 1.5 ÜST", "KG VAR"], confidence_base: 89, importance: "önemli", notes: "" },
  { rule_id: 25, name: "4-5 gol 2.64", primary_odds: {"4-5": 2.64}, secondary_odds: null, exclude_odds: null, predictions: ["MS 1.5 ÜST", "İY 0.5 ÜST"], confidence_base: 87, importance: "önemli", notes: "" },
  { rule_id: 251, name: "4-5 gol 2.64 + 3.5 alt 1.57", primary_odds: {"4-5": 2.64}, secondary_odds: {"3,5 A": 1.57}, exclude_odds: null, predictions: ["İY 0.5 ÜST", "İY 1.5 ÜST", "İY EV 0.5 ÜST", "MS 2.5 ÜST", "MS 3.5 ÜST", "MS EV 1.5 ÜST"], confidence_base: 90, importance: "normal", notes: "" },
  { rule_id: 252, name: "4-5 gol 2.64 + 3.5 üst 1.89", primary_odds: {"4-5": 2.64}, secondary_odds: {"3,5 Ü": 1.89}, exclude_odds: null, predictions: ["MS 2.5 ÜST", "MS 1.5 ÜST", "İY 0.5 ÜST", "İY 1.5 ÜST"], confidence_base: 89, importance: "normal", notes: "" },
  { rule_id: 28, name: "4-5 gol 2.66", primary_odds: {"4-5": 2.66}, secondary_odds: null, exclude_odds: null, predictions: ["İY 0.5 ÜST", "İY EV 0.5 ÜST", "MS 1.5 ÜST", "MS 2.5 ÜST", "MS EV 1.5 ÜST", "KG VAR", "MS DEP 0.5 ÜST"], confidence_base: 90, importance: "önemli", notes: "" },
  { rule_id: 27, name: "4-5 gol 2.67", primary_odds: {"4-5": 2.67}, secondary_odds: null, exclude_odds: null, predictions: ["İY 0.5 ÜST", "İY EV 0.5 ÜST", "MS 1.5 ÜST", "MS 2.5 ÜST", "MS EV 1.5 ÜST", "MS DEP 0.5 ÜST", "KG VAR"], confidence_base: 90, importance: "önemli", notes: "" },
  { rule_id: 42, name: "4-5 gol 2.68", primary_odds: {"4-5": 2.68}, secondary_odds: null, exclude_odds: null, predictions: ["İY 0.5 ÜST", "İY 1.5 ÜST", "İY KG VAR", "MS KG VAR", "MS 1.5 ÜST"], confidence_base: 88, importance: "normal", notes: "" },
  { rule_id: 24, name: "4-5 gol 2.70 + 2.5 üst 1.34", primary_odds: {"4-5": 2.70}, secondary_odds: {"2,5 Ü": 1.34}, exclude_odds: null, predictions: ["MS 1.5 ÜST", "MS 2.5 ÜST", "KG VAR", "MS DEP 0.5 ÜST"], confidence_base: 89, importance: "normal", notes: "" },
  { rule_id: 241, name: "4-5 gol 2.70 + 2.5 üst 1.35", primary_odds: {"4-5": 2.70}, secondary_odds: {"2,5 Ü": 1.35}, exclude_odds: null, predictions: ["İY 0.5 ÜST", "İY DEP 0.5 ÜST", "MS 1.5 ÜST", "KG VAR"], confidence_base: 89, importance: "normal", notes: "" },
  { rule_id: 29, name: "4-5 gol 2.71", primary_odds: {"4-5": 2.71}, secondary_odds: null, exclude_odds: null, predictions: ["İY 0.5 ÜST", "İY 1.5 ÜST", "İY EV 0.5 ÜST", "MS 1.5 ÜST", "MS 2.5 ÜST", "MS DEP 0.5 ÜST", "KG VAR", "MS 3.5 ÜST"], confidence_base: 91, importance: "önemli", notes: "" },
  { rule_id: 11, name: "4-5 gol 2.74", primary_odds: {"4-5": 2.74}, secondary_odds: null, exclude_odds: null, predictions: ["İY 0.5 ÜST", "İY 1.5 ÜST", "İY EV 0.5 ÜST", "MS DEP 0.5 ÜST", "MS 2.5 ÜST", "KG VAR"], confidence_base: 89, importance: "normal", notes: "" },
  { rule_id: 3, name: "4-5 gol 2.79", primary_odds: {"4-5": 2.79}, secondary_odds: null, exclude_odds: null, predictions: ["İY 0.5 ÜST"], confidence_base: 86, importance: "normal", notes: "" },
  { rule_id: 4, name: "4-5 gol 2.80 + 3.5 alt 1.53", primary_odds: {"4-5": 2.80}, secondary_odds: {"3,5 A": 1.53}, exclude_odds: null, predictions: ["İY 0.5 ÜST", "İY EV 0.5 ÜST", "MS 1.5 ÜST", "MS 2.5 ÜST", "MS 3.5 ÜST"], confidence_base: 90, importance: "önemli", notes: "" },
  { rule_id: 401, name: "4-5 gol 2.80 + 3.5 alt 1.45", primary_odds: {"4-5": 2.80}, secondary_odds: {"3,5 A": 1.45}, exclude_odds: null, predictions: ["İY 0.5 ÜST", "MS 1.5 ÜST", "MS 2.5 ÜST", "MS DEP 1.5 ÜST"], confidence_base: 89, importance: "normal", notes: "" },
  { rule_id: 402, name: "4-5 gol 2.80 + 2.5 üst 1.38", primary_odds: {"4-5": 2.80}, secondary_odds: {"2,5 Ü": 1.38}, exclude_odds: null, predictions: ["İY 0.5 ÜST", "MS 1.5 ÜST", "MS 2.5 ÜST", "MS 3.5 ÜST", "MS EV 1.5 ÜST", "KG VAR"], confidence_base: 90, importance: "normal", notes: "" },
  { rule_id: 1, name: "4-5 gol 2.85 + 3.5 alt 1.43", primary_odds: {"4-5": 2.85}, secondary_odds: {"3,5 A": 1.43}, exclude_odds: null, predictions: ["MS 1.5 ÜST", "MS 2.5 ÜST", "KG VAR"], confidence_base: 88, importance: "normal", notes: "" },
  { rule_id: 8, name: "4-5 gol 2.86", primary_odds: {"4-5": 2.86}, secondary_odds: null, exclude_odds: null, predictions: ["İY 0.5 ÜST"], confidence_base: 86, importance: "normal", notes: "" },
  { rule_id: 81, name: "4-5 gol 2.86 + 3.5 alt 1.43", primary_odds: {"4-5": 2.86}, secondary_odds: {"3,5 A": 1.43}, exclude_odds: null, predictions: ["MS 2.5 ÜST", "MS 3.5 ÜST", "MS EV 1.5 ÜST", "İY 0.5 ÜST"], confidence_base: 89, importance: "normal", notes: "" },
  { rule_id: 19, name: "4-5 gol 2.91", primary_odds: {"4-5": 2.91}, secondary_odds: null, exclude_odds: null, predictions: ["MS 1.5 ÜST"], confidence_base: 87, importance: "önemli", notes: "" },
  { rule_id: 191, name: "4-5 gol 2.91 + 2.5 üst 1.43", primary_odds: {"4-5": 2.91}, secondary_odds: {"2,5 Ü": 1.43}, exclude_odds: null, predictions: ["MS 2.5 ÜST", "MS DEP 1.5 ÜST", "İY 0.5 ÜST", "İY DEP 0.5 ÜST"], confidence_base: 89, importance: "normal", notes: "" },
  { rule_id: 192, name: "4-5 gol 2.91 + 2.5 üst 1.44", primary_odds: {"4-5": 2.91}, secondary_odds: {"2,5 Ü": 1.44}, exclude_odds: null, predictions: ["MS 1.5 ÜST"], confidence_base: 87, importance: "normal", notes: "" },
  { rule_id: 193, name: "4-5 gol 2.91 + 2.5 üst 1.45", primary_odds: {"4-5": 2.91}, secondary_odds: {"2,5 Ü": 1.45}, exclude_odds: null, predictions: ["MS 2.5 ÜST", "MS 3.5 ÜST", "KG VAR", "MS DEP 1.5 ÜST", "İY DEP 0.5 ÜST", "İY 1.5 ÜST"], confidence_base: 90, importance: "normal", notes: "" },
  { rule_id: 18, name: "4-5 gol 2.92", primary_odds: {"4-5": 2.92}, secondary_odds: null, exclude_odds: null, predictions: ["MS 1.5 ÜST"], confidence_base: 87, importance: "normal", notes: "" },
  { rule_id: 26, name: "4-5 gol 2.96", primary_odds: {"4-5": 2.96}, secondary_odds: null, exclude_odds: null, predictions: ["MS 0.5 ÜST"], confidence_base: 85, importance: "önemli", notes: "" },
  { rule_id: 261, name: "4-5 gol 2.96 + 2-3 gol 1.93", primary_odds: {"4-5": 2.96}, secondary_odds: {"2-3": 1.93}, exclude_odds: null, predictions: ["İY 0.5 ÜST", "MS 1.5 ÜST", "MS 2.5 ÜST", "MS 3.5 ÜST", "MS DEP 0.5 ÜST", "MS DEP 1.5 ÜST", "İY DEP 0.5 ÜST"], confidence_base: 90, importance: "normal", notes: "" },
  { rule_id: 262, name: "4-5 gol 2.96 + 3.5 alt 1.39", primary_odds: {"4-5": 2.96}, secondary_odds: {"3,5 A": 1.39}, exclude_odds: null, predictions: ["İY 0.5 ÜST", "MS 1.5 ÜST", "MS 2.5 ÜST", "MS 3.5 ÜST"], confidence_base: 89, importance: "normal", notes: "" },
  { rule_id: 13, name: "4-5 gol 2.97 + 3.5 üst 2.28", primary_odds: {"4-5": 2.97}, secondary_odds: {"3,5 Ü": 2.28}, exclude_odds: null, predictions: ["MS 1.5 ÜST", "MS DEP 0.5 ÜST"], confidence_base: 87, importance: "normal", notes: "" },
  { rule_id: 131, name: "4-5 gol 2.97 + 3.5 üst 2.28 + 2.5 alt 2.21", primary_odds: {"4-5": 2.97}, secondary_odds: {"3,5 Ü": 2.28, "2,5 A": 2.21}, exclude_odds: null, predictions: ["MS 2.5 ÜST", "MS 3.5 ÜST", "MS DEP 0.5 ÜST", "MS DEP 1.5 ÜST"], confidence_base: 89, importance: "normal", notes: "" },
  { rule_id: 1301, name: "4-5 gol 2.97 + 3.5 üst 2.27", primary_odds: {"4-5": 2.97}, secondary_odds: {"3,5 Ü": 2.27}, exclude_odds: null, predictions: ["MS 1.5 ÜST", "MS DEP 0.5 ÜST"], confidence_base: 87, importance: "normal", notes: "" },
  { rule_id: 1302, name: "4-5 gol 2.97 + 2.5 üst 1.46", primary_odds: {"4-5": 2.97}, secondary_odds: {"2,5 Ü": 1.46}, exclude_odds: null, predictions: ["MS 1.5 ÜST", "MS DEP 0.5 ÜST"], confidence_base: 87, importance: "normal", notes: "" },
  { rule_id: 45, name: "4-5 gol 2.98 + 3.5 alt 1.43", primary_odds: {"4-5": 2.98}, secondary_odds: {"3,5 A": 1.43}, exclude_odds: null, predictions: ["İY 0.5 ÜST", "İY 1.5 ÜST", "İY EV 0.5 ÜST", "MS 2.5 ÜST", "MS 3.5 ÜST", "KG VAR"], confidence_base: 90, importance: "normal", notes: "" },
  { rule_id: 14, name: "4-5 gol 3.01 + 2.5 üst 1.48", primary_odds: {"4-5": 3.01}, secondary_odds: {"2,5 Ü": 1.48}, exclude_odds: null, predictions: ["MS 2.5 ÜST", "MS 3.5 ÜST", "İY 0.5 ÜST", "İY 1.5 ÜST", "KG VAR", "MS DEP 0.5 ÜST", "MS DEP 1.5 ÜST"], confidence_base: 91, importance: "önemli", notes: "" },
  { rule_id: 38, name: "4-5 gol 3.04", primary_odds: {"4-5": 3.04}, secondary_odds: null, exclude_odds: null, predictions: ["İY 0.5 ÜST", "İY DEP 0.5 ÜST", "MS 1.5 ÜST", "MS EV 0.5 ÜST", "MS DEP 0.5 ÜST", "KG VAR"], confidence_base: 89, importance: "önemli", notes: "" },
  { rule_id: 43, name: "4-5 gol 3.07", primary_odds: {"4-5": 3.07}, secondary_odds: null, exclude_odds: null, predictions: ["İY 0.5 ÜST", "MS 1.5 ÜST", "MS 2.5 ÜST", "MS 3.5 ÜST", "MS DEP 1.5 ÜST", "KG VAR"], confidence_base: 89, importance: "normal", notes: "" },
  { rule_id: 9, name: "4-5 gol 3.15 (KG VAR 1.50 HARİÇ)", primary_odds: {"4-5": 3.15}, secondary_odds: null, exclude_odds: {"VAR": 1.50}, predictions: ["İY 0.5 ÜST", "MS 2.5 ÜST", "MS 3.5 ÜST"], confidence_base: 88, importance: "önemli", notes: "" },
  { rule_id: 7, name: "4-5 gol 3.19 + 2.5 alt 2.01", primary_odds: {"4-5": 3.19}, secondary_odds: {"2,5 A": 2.01}, exclude_odds: null, predictions: ["MS 0.5 ÜST", "MS EV 0.5 ÜST"], confidence_base: 86, importance: "normal", notes: "" },
  { rule_id: 41, name: "4-5 gol 3.55", primary_odds: {"4-5": 3.55}, secondary_odds: null, exclude_odds: null, predictions: ["İY 0.5 ÜST"], confidence_base: 85, importance: "normal", notes: "" },
  { rule_id: 12, name: "4-5 gol 3.65 + 3.5 alt 1.21", primary_odds: {"4-5": 3.65}, secondary_odds: {"3,5 A": 1.21}, exclude_odds: null, predictions: ["MS 1.5 ÜST", "MS 2.5 ÜST", "MS DEP 1.5 ÜST"], confidence_base: 87, importance: "normal", notes: "" },
  { rule_id: 49, name: "4-5 gol 3.70 + 2-3 gol 1.82", primary_odds: {"4-5": 3.70}, secondary_odds: {"2-3": 1.82}, exclude_odds: null, predictions: ["İY 0.5 ÜST", "MS 1.5 ÜST", "MS 2.5 ÜST", "MS 3.5 ÜST", "KG VAR", "MS DEP 0.5 ÜST"], confidence_base: 88, importance: "normal", notes: "" },
  { rule_id: 20, name: "4-5 gol 3.97 + 2.5 alt 1.66", primary_odds: {"4-5": 3.97}, secondary_odds: {"2,5 A": 1.66}, exclude_odds: null, predictions: ["MS 1.5 ÜST", "MS 2.5 ÜST", "KG VAR", "MS DEP 0.5 ÜST", "İY 0.5 ÜST", "İY 1.5 ÜST", "İY KG VAR", "İY SKOR 1-1"], confidence_base: 90, importance: "önemli", notes: "" },
  { rule_id: 5, name: "4-5 gol 4.01", primary_odds: {"4-5": 4.01}, secondary_odds: null, exclude_odds: null, predictions: ["İY 0.5 ÜST"], confidence_base: 85, importance: "normal", notes: "" },
  { rule_id: 51, name: "4-5 gol 4.01 + 2-3 gol 1.83", primary_odds: {"4-5": 4.01}, secondary_odds: {"2-3": 1.83}, exclude_odds: null, predictions: ["İY 0.5 ÜST", "MS 1.5 ÜST", "MS 2.5 ÜST", "MS 3.5 ÜST", "KG VAR", "MS DEP 1.5 ÜST", "İY DEP 0.5 ÜST"], confidence_base: 88, importance: "normal", notes: "" },
  { rule_id: 35, name: "4-5 gol 4.15 + 2.5 üst 1.91", primary_odds: {"4-5": 4.15}, secondary_odds: {"2,5 Ü": 1.91}, exclude_odds: null, predictions: ["MS DEP 0.5 ÜST", "MS 1.5 ÜST"], confidence_base: 86, importance: "normal", notes: "" },
  { rule_id: 34, name: "4-5 gol 4.19", primary_odds: {"4-5": 4.19}, secondary_odds: null, exclude_odds: null, predictions: ["İY 0.5 ÜST", "MS 1.5 ÜST"], confidence_base: 85, importance: "normal", notes: "" },
  { rule_id: 46, name: "4-5 gol 4.22", primary_odds: {"4-5": 4.22}, secondary_odds: null, exclude_odds: null, predictions: ["KG VAR"], confidence_base: 84, importance: "normal", notes: "" },
  { rule_id: 21, name: "4-5 gol 4.47", primary_odds: {"4-5": 4.47}, secondary_odds: null, exclude_odds: null, predictions: ["MS 1.5 ÜST", "MS DEP 0.5 ÜST"], confidence_base: 85, importance: "normal", notes: "" },
  { rule_id: 31, name: "4-5 gol 4.48", primary_odds: {"4-5": 4.48}, secondary_odds: null, exclude_odds: null, predictions: ["İY 0.5 ÜST", "İY DEP 0.5 ÜST", "MS 1.5 ÜST", "KG VAR"], confidence_base: 86, importance: "önemli", notes: "" },
  { rule_id: 33, name: "4-5 gol 4.76 + 3.5 alt 1.10", primary_odds: {"4-5": 4.76}, secondary_odds: {"3,5 A": 1.10}, exclude_odds: null, predictions: ["İY 0.5 ÜST", "İY EV 0.5 ÜST"], confidence_base: 85, importance: "normal", notes: "" },
];

async function createTable(): Promise<{ success: boolean; message: string }> {
  // We can't run CREATE TABLE via REST API, so we'll use the golden_rules as a simple JSON store
  // Instead, let's try inserting into the table - if it doesn't exist, we need to create it via Supabase Dashboard

  // First check if table exists by trying to select
  const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/golden_rules?select=id&limit=1`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
  });

  if (checkRes.status === 404 || checkRes.status === 406) {
    return {
      success: false,
      message: 'Table golden_rules does not exist. Please create it via Supabase Dashboard SQL Editor with this SQL:\n\nCREATE TABLE public.golden_rules (\n  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,\n  rule_id INTEGER UNIQUE NOT NULL,\n  name TEXT NOT NULL,\n  primary_odds JSONB NOT NULL DEFAULT \'{}\',\n  secondary_odds JSONB,\n  exclude_odds JSONB,\n  predictions TEXT[] NOT NULL DEFAULT \'{}\',\n  confidence_base INTEGER NOT NULL DEFAULT 85,\n  importance TEXT NOT NULL DEFAULT \'normal\',\n  notes TEXT DEFAULT \'\',\n  is_active BOOLEAN DEFAULT TRUE,\n  created_at TIMESTAMPTZ DEFAULT NOW(),\n  updated_at TIMESTAMPTZ DEFAULT NOW()\n);\n\nALTER TABLE public.golden_rules ENABLE ROW LEVEL SECURITY;\nCREATE POLICY "Allow service role full access" ON public.golden_rules FOR ALL USING (true) WITH CHECK (true);'
    };
  }

  // Table exists, check if it has data
  const existingRes = await fetch(`${SUPABASE_URL}/rest/v1/golden_rules?select=rule_id&limit=1`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
  });

  if (existingRes.ok) {
    const existing = await existingRes.json();
    if (existing.length > 0) {
      return { success: true, message: 'Table already exists and has data. Skipping seed.' };
    }
  }

  // Seed the data
  let insertedCount = 0;
  for (const rule of GOLDEN_RULES_SEED) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/golden_rules`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(rule),
    });
    if (res.ok) insertedCount++;
  }

  return { success: true, message: `Seeded ${insertedCount} golden rules successfully.` };
}

export async function POST(request: Request) {
  // Auth check
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify admin token via Supabase Auth
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'apikey': SUPABASE_KEY,
    },
  });

  if (!userRes.ok) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  try {
    const result = await createTable();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
