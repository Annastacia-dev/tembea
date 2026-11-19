'use client';
import { useEffect, useState } from 'react';
import { TRIPS, CATS, MONTHS, usd, quote } from '@/lib/trips';

export default function BookingForm() {
  const [trip, setTrip] = useState('safari');
  const [month, setMonth] = useState(7);
  const [pax, setPax] = useState(2);
  const [single, setSingle] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState({ state: 'idle' });
  const [loaded, setLoaded] = useState(false);

  // Restore the last choices and listen for "Plan this trip" buttons.
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem('tembea') || '{}');
      if (TRIPS[s.trip]) setTrip(s.trip);
      if (s.month) setMonth(+s.month);
      if (s.pax) setPax(s.pax);
      setSingle(!!s.single);
    } catch {}
    setLoaded(true);
    const onPlan = (e) => { if (TRIPS[e.detail]) setTrip(e.detail); };
    window.addEventListener('tembea:plan', onPlan);
    return () => window.removeEventListener('tembea:plan', onPlan);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem('tembea', JSON.stringify({ trip, month, pax, single })); } catch {}
  }, [trip, month, pax, single, loaded]);

  const t = TRIPS[trip];
  const q = quote({ trip, pax, single });
  const good = t.good.includes(month);
  const rains = month === 4 || month === 5;
  const season = good
    ? `${MONTHS[month - 1]} is a great month for this trip.`
    : rains
      ? `${MONTHS[month - 1]} is long-rains season: some camps close and trails get muddy.`
      : `${MONTHS[month - 1]} is shoulder season: fewer people, more chance of rain.`;

  async function submit(e) {
    e.preventDefault();
    setStatus({ state: 'sending' });
    try {
      const res = await fetch('/api/enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip, month, pax, single, name, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      setStatus({ state: 'done', ...data });
    } catch (err) {
      setStatus({ state: 'error', error: err.message });
    }
  }

  return (
    <form className="book" onSubmit={submit} noValidate>
      <div>
        <div className="f">
          <label htmlFor="trip">Trip</label>
          <select id="trip" value={trip} onChange={(e) => setTrip(e.target.value)}>
            {CATS.map((c) => (
              <optgroup key={c.k} label={c.label}>
                {c.trips.map((k) => <option key={k} value={k}>{TRIPS[k].short} · {TRIPS[k].days} days</option>)}
              </optgroup>
            ))}
            <optgroup label="Combined"><option value="arc">{TRIPS.arc.short} · {TRIPS.arc.days} days</option></optgroup>
          </select>
        </div>
        <div className="f">
          <label htmlFor="month">Travel month</label>
          <select id="month" value={month} onChange={(e) => setMonth(+e.target.value)}>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <div className={'hint' + (good ? ' good' : '')}>{season}</div>
        </div>
        <div className="f">
          <label id="tl">Travellers</label>
          <div className="step" role="group" aria-labelledby="tl">
            <button type="button" aria-label="One fewer traveller" onClick={() => setPax((p) => Math.max(1, p - 1))}>−</button>
            <output aria-live="polite">{pax}</output>
            <button type="button" aria-label="One more traveller" onClick={() => setPax((p) => Math.min(12, p + 1))}>+</button>
          </div>
          <div className="hint">Groups of 4 or more save 5%</div>
        </div>
        <div className="f check">
          <input type="checkbox" id="single" checked={single} onChange={(e) => setSingle(e.target.checked)} />
          <label htmlFor="single">Private rooms for everyone (single supplement)</label>
        </div>
        <div className="f"><label htmlFor="name">Your name</label><input type="text" id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="f"><label htmlFor="email">Email</label><input type="email" id="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      </div>
      <div className="est">
        <div className="hint" style={{ margin: '0 0 4px' }}>Estimated total</div>
        <div className="big">{usd(q.total)}</div>
        <div className="hint" style={{ margin: '4px 0 16px' }}>{usd(q.total / pax)} per person · {pax} traveller{pax > 1 ? 's' : ''} · {t.days} days</div>
        <div className="lines">
          <div><span>{usd(t.price)} × {pax}</span><span>{usd(q.base)}</span></div>
          {q.disc > 0 && <div><span>Group saving (5%)</span><span>−{usd(q.disc)}</span></div>}
          {q.sup > 0 && <div><span>Private rooms, {t.days - 1} nights</span><span>{usd(q.sup)}</span></div>}
        </div>
        <button className="btn" type="submit" style={{ width: '100%', marginTop: 18 }} disabled={status.state === 'sending'}>
          {status.state === 'sending' ? 'Sending…' : 'Request these dates'}
        </button>
        <div aria-live="polite">
          {status.state === 'error' && <div className="err">{status.error}</div>}
          {status.state === 'done' && (
            <div className="done">
              <b>Request {status.ref} received for {status.name}: {t.short.toLowerCase()} in {MONTHS[month - 1]}, {usd(status.total)}.</b>
              <br />This demo server only logs requests. Connect email or a CRM in <code>app/api/enquiry/route.js</code> to receive them.
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
