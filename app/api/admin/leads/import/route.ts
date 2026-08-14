import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';
import { recordLeadActivity } from '@/lib/launch-lead-activities';
import { findMatchingLaunchLead, leadEmailKey, leadPhoneKey } from '@/lib/launch-leads';
import { z } from 'zod';

const LEAD_TYPES = ['seller', 'dealer', 'rental_owner', 'buyer', 'renter', 'mfi', 'inspection', 'other'] as const;
const SOURCES = ['website', 'whatsapp', 'referral', 'facebook', 'field', 'dealer_visit', 'staff', 'other'] as const;
const PRIORITIES = ['low', 'normal', 'high'] as const;

const schema = z.object({
  csv_data: z.string().trim().min(3),
  default_lead_type: z.enum(LEAD_TYPES).default('seller'),
  default_source: z.enum(SOURCES).default('staff'),
  default_priority: z.enum(PRIORITIES).default('normal'),
  default_campaign_name: z.string().trim().max(120).optional(),
  assigned_to: z.string().uuid().optional().or(z.literal('')),
  next_follow_up_at: z.string().optional(),
});

const rowSchema = z.object({
  lead_type: z.enum(LEAD_TYPES),
  source: z.enum(SOURCES),
  priority: z.enum(PRIORITIES),
  name: z.string().trim().min(2).max(120),
  business_name: z.string().trim().max(160).optional(),
  phone: z.string().trim().max(40).optional(),
  email: z.string().trim().email().optional().or(z.literal('')),
  city: z.string().trim().max(80).optional(),
  interest: z.string().trim().max(240).optional(),
  campaign_name: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(1500).optional(),
});

function detectDelimiter(headerLine: string) {
  const delimiters = [',', ';', '\t'];
  return delimiters
    .map((delimiter) => ({ delimiter, count: headerLine.split(delimiter).length }))
    .sort((a, b) => b.count - a.count)[0]?.delimiter ?? ',';
}

function parseCsvLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function parseCsv(text: string) {
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delimiter).map((header) => header.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line, delimiter);
    return headers.reduce<Record<string, string>>((row, header, index) => {
      row[header] = cells[index] ?? '';
      return row;
    }, {});
  });
}

function value(row: Record<string, string>, ...keys: string[]) {
  for (const key of keys) {
    const found = row[key]?.trim();
    if (found) return found;
  }
  return '';
}

function parseBody(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return request.json().catch(() => ({}));
  }
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return request.text().then((text) => {
      const body: Record<string, unknown> = {};
      const params = new URLSearchParams(text);
      params.forEach((fieldValue, key) => { body[key] = fieldValue; });
      return body;
    });
  }
  return Promise.resolve({});
}

export async function POST(request: Request) {
  const auth = await requireStaff(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const parsed = schema.safeParse(await parseBody(request));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid import details.' }, { status: 400 });
  }

  const rows = parseCsv(parsed.data.csv_data).slice(0, 200);
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const rawLeadType = value(row, 'lead_type', 'type') || parsed.data.default_lead_type;
    const rawSource = value(row, 'source') || parsed.data.default_source;
    const rawPriority = value(row, 'priority') || parsed.data.default_priority;
    const businessName = value(row, 'business_name', 'business', 'company', 'entreprise');
    const raw = {
      lead_type: LEAD_TYPES.includes(rawLeadType as typeof LEAD_TYPES[number]) ? rawLeadType : parsed.data.default_lead_type,
      source: SOURCES.includes(rawSource as typeof SOURCES[number]) ? rawSource : parsed.data.default_source,
      priority: PRIORITIES.includes(rawPriority as typeof PRIORITIES[number]) ? rawPriority : parsed.data.default_priority,
      name: value(row, 'name', 'contact', 'contact_name') || businessName,
      business_name: businessName,
      phone: value(row, 'phone', 'telephone', 'tel', 'mobile'),
      email: value(row, 'email', 'mail'),
      city: value(row, 'city', 'ville', 'location'),
      interest: value(row, 'interest', 'need', 'besoin'),
      campaign_name: value(row, 'campaign_name', 'campaign', 'campagne') || parsed.data.default_campaign_name || '',
      notes: value(row, 'notes', 'note', 'comment'),
    };

    const rowParsed = rowSchema.safeParse(raw);
    if (!rowParsed.success) {
      skipped += 1;
      continue;
    }

    const phoneKey = leadPhoneKey(rowParsed.data.phone);
    const emailKey = leadEmailKey(rowParsed.data.email);
    const payload = {
      ...rowParsed.data,
      business_name: rowParsed.data.business_name || null,
      phone: rowParsed.data.phone || null,
      phone_key: phoneKey,
      email: rowParsed.data.email || null,
      email_key: emailKey,
      city: rowParsed.data.city || null,
      interest: rowParsed.data.interest || null,
      campaign_name: rowParsed.data.campaign_name || null,
      notes: rowParsed.data.notes || null,
      assigned_to: parsed.data.assigned_to || auth.user.id,
      next_follow_up_at: parsed.data.next_follow_up_at ? new Date(parsed.data.next_follow_up_at).toISOString() : null,
    };

    const existingLead = await findMatchingLaunchLead({ phoneKey, emailKey });
    if (existingLead) {
      const { error } = await supabaseAdmin.from('launch_leads').update(payload).eq('id', existingLead.id);
      if (error) {
        skipped += 1;
        continue;
      }
      updated += 1;
      await recordLeadActivity({
        leadId: existingLead.id,
        actorId: auth.user.id,
        action: 'duplicate_updated',
        summary: `Lead updated from CSV import (${rowParsed.data.source})`,
        meta: { import: true, source: rowParsed.data.source, lead_type: rowParsed.data.lead_type, campaign_name: rowParsed.data.campaign_name || null },
      });
    } else {
      const { data, error } = await supabaseAdmin.from('launch_leads').insert(payload).select('id').single();
      if (error || !data) {
        skipped += 1;
        continue;
      }
      created += 1;
      await recordLeadActivity({
        leadId: data.id,
        actorId: auth.user.id,
        action: 'created',
        summary: `Lead created from CSV import (${rowParsed.data.source})`,
        meta: { import: true, source: rowParsed.data.source, lead_type: rowParsed.data.lead_type, campaign_name: rowParsed.data.campaign_name || null },
      });
    }
  }

  await supabaseAdmin.from('audit_logs').insert({
    actor_id: auth.user.id,
    actor_email: auth.user.email,
    actor_role: auth.user.role,
    action: 'launch_leads_imported',
    entity_type: 'launch_leads',
    entity_id: null,
    meta: { rows: rows.length, created, updated, skipped },
  });

  if (request.headers.get('accept')?.includes('text/html')) {
    const params = new URLSearchParams({
      created: String(created),
      updated: String(updated),
      skipped: String(skipped),
    });
    return NextResponse.redirect(new URL(`/admin/leads/import?${params.toString()}`, request.url));
  }

  return NextResponse.json({ rows: rows.length, created, updated, skipped });
}
