import { requireStaff } from '@/lib/auth/middleware';

const TEMPLATE = [
  'name,business_name,phone,email,city,interest,notes,campaign_name,lead_type,source,priority',
  'John Doe,,237600000000,john@example.com,Douala,Toyota Corolla,Lead Facebook,Rental season,seller,facebook,normal',
  'Buea Auto,Buea Auto,237699000000,contact@bueaauto.cm,Buea,Dealer pilot,Stock 25 vehicles,Dealer pilot,dealer,field,high',
].join('\n');

export async function GET(request: Request) {
  const auth = await requireStaff(request);
  if (!auth.authenticated) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  return new Response(TEMPLATE, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="motopayee-leads-template.csv"',
    },
  });
}
