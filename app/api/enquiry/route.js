import { NextResponse } from 'next/server';
import { TRIPS, quote } from '@/lib/trips';

// Receives booking requests from the form. It validates and logs them; wire it to email or a CRM to use it for real.
export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
  const { trip, month, pax, single, name, email } = body || {};
  if (!TRIPS[trip]) return NextResponse.json({ error: 'Choose a trip.' }, { status: 400 });
  if (!(month >= 1 && month <= 12)) return NextResponse.json({ error: 'Choose a travel month.' }, { status: 400 });
  if (!(Number.isInteger(pax) && pax >= 1 && pax <= 12)) return NextResponse.json({ error: 'Travellers must be between 1 and 12.' }, { status: 400 });
  const cleanName = String(name || '').trim().slice(0, 80);
  if (!cleanName) return NextResponse.json({ error: 'Add your name so we know who to reply to.' }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''))) return NextResponse.json({ error: 'Add a valid email address.' }, { status: 400 });

  const { total } = quote({ trip, pax, single: !!single });
  const ref = 'TMB-' + Date.now().toString(36).toUpperCase().slice(-6);
  console.log('[enquiry]', { ref, trip, month, pax, single: !!single, total });
  return NextResponse.json({ ok: true, ref, name: cleanName, total });
}
