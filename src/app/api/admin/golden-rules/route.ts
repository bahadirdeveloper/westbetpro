/**
 * API Route: Golden Rules CRUD
 *
 * GET    /api/admin/golden-rules - List all golden rules
 * POST   /api/admin/golden-rules - Create a new golden rule
 * PUT    /api/admin/golden-rules - Update an existing golden rule
 * DELETE /api/admin/golden-rules?id=xxx - Delete a golden rule
 *
 * All operations use Supabase REST API directly (no JS client).
 */

import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Verify admin auth
async function verifyAuth(request: Request): Promise<boolean> {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return false;

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': SUPABASE_KEY,
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}

// GET: List all golden rules
export async function GET(request: Request) {
  const isAuth = await verifyAuth(request);
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/golden_rules?select=*&order=rule_id.asc`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
        cache: 'no-store',
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({
        success: false,
        rules: [],
        error: `Supabase error: ${errText}`,
        table_missing: true
      });
    }

    const rules = await res.json();
    return NextResponse.json({
      success: true,
      rules: rules || [],
      count: (rules || []).length,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      rules: [],
      error: error.message,
    }, { status: 500 });
  }
}

// POST: Create a new golden rule
export async function POST(request: Request) {
  const isAuth = await verifyAuth(request);
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.rule_id) {
      return NextResponse.json({ success: false, error: 'name and rule_id are required' }, { status: 400 });
    }

    const ruleData = {
      rule_id: body.rule_id,
      name: body.name,
      primary_odds: body.primary_odds || {},
      secondary_odds: body.secondary_odds || null,
      exclude_odds: body.exclude_odds || null,
      predictions: body.predictions || [],
      confidence_base: body.confidence_base || 85,
      importance: body.importance || 'normal',
      notes: body.notes || '',
      is_active: body.is_active !== undefined ? body.is_active : true,
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/golden_rules`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(ruleData),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ success: false, error: errText }, { status: res.status });
    }

    const created = await res.json();
    return NextResponse.json({ success: true, rule: created[0] || created });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update an existing golden rule
export async function PUT(request: Request) {
  const isAuth = await verifyAuth(request);
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }

    // Add updated_at
    updateData.updated_at = new Date().toISOString();

    const res = await fetch(`${SUPABASE_URL}/rest/v1/golden_rules?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(updateData),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ success: false, error: errText }, { status: res.status });
    }

    const updated = await res.json();
    if (Array.isArray(updated) && updated.length === 0) {
      return NextResponse.json({ success: false, error: 'Rule not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, rule: updated[0] || updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Delete a golden rule
export async function DELETE(request: Request) {
  const isAuth = await verifyAuth(request);
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'id parameter is required' }, { status: 400 });
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/golden_rules?id=eq.${id}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=representation',
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ success: false, error: errText }, { status: res.status });
    }

    const deleted = await res.json();
    return NextResponse.json({
      success: true,
      deleted: Array.isArray(deleted) ? deleted.length : 1,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
