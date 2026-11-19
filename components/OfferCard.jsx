import Link from 'next/link';
import PlanButton from './PlanButton';
import { TRIPS, usd } from '@/lib/trips';

export default function OfferCard({ id }) {
  const t = TRIPS[id];
  return (
    <article className="card">
      <p className="kick">{t.kick}</p>
      <h2>{t.name}</h2>
      <p>{t.blurb}</p>
      <div className="facts">
        <div><b>{usd(t.price)}</b><span>per person, from</span></div>
        <div><b>{t.days} days</b><span>{t.days - 1} nights</span></div>
        <div><b>{t.best.split(',')[0]}</b><span>best season</span></div>
      </div>
      <ol className="plan">
        {t.plan.map(([d, x]) => <li key={d}><b>{d}</b><span>{x}</span></li>)}
      </ol>
      <ul className="inc">{t.inc.map((x) => <li key={x}>{x}</li>)}</ul>
      <div className="row">
        <PlanButton trip={id}>Plan this trip</PlanButton>
        {id === 'kili' && <Link className="btn ghost" href="/climb/lemosho">Climb it in 3D</Link>}
        <span className="hint" style={{ margin: 0 }}>Best months: {t.best}</span>
      </div>
    </article>
  );
}

export function ArcCard() {
  const legs = ['safari', 'kili', 'zanzibar'];
  const sep = legs.reduce((s, k) => s + TRIPS[k].price, 0);
  return (
    <article className="card">
      <p className="kick">All three · 18 days · ends in Stone Town</p>
      <h2>The full arc: plains, peak, then the coast</h2>
      <p>Done in this order, the safari days are an easy start, the climb comes while you&apos;re travel-fit, and Zanzibar is the reward. One guide team hands you to the next, and transfers between them are already booked.</p>
      <div className="arc">
        {legs.map((k) => (
          <div key={k}><span>{TRIPS[k].name} · {TRIPS[k].days} days</span><span className="num">{usd(TRIPS[k].price)}</span></div>
        ))}
        <div><span>Booked separately</span><span className="num">{usd(sep)}</span></div>
        <div className="tot">
          <span>Full arc, per person <span className="save">save {usd(sep - TRIPS.arc.price)}</span></span>
          <span className="num">{usd(TRIPS.arc.price)}</span>
        </div>
      </div>
      <div className="row"><PlanButton trip="arc">Plan the full arc</PlanButton></div>
    </article>
  );
}
