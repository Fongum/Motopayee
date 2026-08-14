import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/auth/server';
import { requireAuth } from '@/lib/auth/middleware';
import { parseBody } from '@/lib/validation';
import { randomBytes } from 'crypto';

// Codes are issued as `MP-XXXXXX` (see GET below). Normalised to upper case so
// the lookup is case-insensitive.
const applySchema = z.object({
  referral_code: z
    .string()
    .trim()
    .min(3)
    .max(32)
    .transform((v) => v.toUpperCase()),
});

// GET /api/referrals — get or create user's referral code + stats
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // Check for existing code
  let { data: code } = await supabaseAdmin
    .from('referral_codes')
    .select('*')
    .eq('user_id', auth.user.id)
    .maybeSingle();

  // Create if none
  if (!code) {
    const uniqueCode = `MP-${randomBytes(3).toString('hex').toUpperCase()}`;
    const { data: newCode, error } = await supabaseAdmin
      .from('referral_codes')
      .insert({ user_id: auth.user.id, code: uniqueCode })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    code = newCode;
  }

  // Get referral uses
  const { data: uses } = await supabaseAdmin
    .from('referral_uses')
    .select('id, referred_user_id, reward_xaf, rewarded, created_at, referred:profiles!referred_user_id(full_name)')
    .eq('code_id', (code as Record<string, unknown>).id as string)
    .order('created_at', { ascending: false });

  return NextResponse.json({ code, uses: uses ?? [] });
}

// POST /api/referrals — apply a referral code (called during registration)
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const parsed = await parseBody(applySchema, request, 'Code de parrainage invalide.');
  if (!parsed.success) return parsed.response;

  // Find code
  const { data: code } = await supabaseAdmin
    .from('referral_codes')
    .select('*')
    .eq('code', parsed.data.referral_code)
    .maybeSingle();

  if (!code) return NextResponse.json({ error: 'Code de parrainage invalide.' }, { status: 404 });

  const codeRecord = code as Record<string, unknown>;
  if (codeRecord.user_id === auth.user.id) {
    return NextResponse.json({ error: 'Vous ne pouvez pas utiliser votre propre code.' }, { status: 400 });
  }

  // Check if already used by this user
  const { data: existing } = await supabaseAdmin
    .from('referral_uses')
    .select('id')
    .eq('code_id', codeRecord.id as string)
    .eq('referred_user_id', auth.user.id)
    .maybeSingle();

  if (existing) return NextResponse.json({ error: 'Code déjà utilisé.' }, { status: 400 });

  const rewardXaf = 1000; // reward per referral

  // Record use
  const { error: useError } = await supabaseAdmin
    .from('referral_uses')
    .insert({
      code_id: codeRecord.id as string,
      referred_user_id: auth.user.id,
      reward_xaf: rewardXaf,
    });

  if (useError) return NextResponse.json({ error: useError.message }, { status: 500 });

  // Update code stats
  await supabaseAdmin
    .from('referral_codes')
    .update({
      total_uses: ((codeRecord.total_uses as number) ?? 0) + 1,
      reward_balance_xaf: ((codeRecord.reward_balance_xaf as number) ?? 0) + rewardXaf,
    })
    .eq('id', codeRecord.id as string);

  return NextResponse.json({ success: true, reward_xaf: rewardXaf });
}
