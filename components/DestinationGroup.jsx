'use client';
import { useEffect, useState } from 'react';
import OfferCard from './OfferCard';
import { TRIPS } from '@/lib/trips';

// One category with several destinations: a switcher on top, the chosen trip's card below.
export default function DestinationGroup({ label, trips }) {
  const [id, setId] = useState(trips[0]);
  // Open the right destination when a link such as /#diani points at one of them.
  useEffect(() => {
    const sync = () => { const h = location.hash.slice(1); if (trips.includes(h)) setId(h); };
    sync();
    addEventListener('hashchange', sync);
    return () => removeEventListener('hashchange', sync);
  }, [trips]);
  return (
    <div className="group">
      {trips.map((k) => <span key={k} id={k} className="anchor" />)}
      <div className="opts" role="tablist" aria-label={`${label} destinations`}>
        {trips.map((k) => (
          <button key={k} type="button" role="tab" aria-selected={k === id} onClick={() => setId(k)}>
            <b>{TRIPS[k].place}</b><span>{TRIPS[k].days} days</span>
          </button>
        ))}
      </div>
      <div role="tabpanel"><OfferCard id={id} /></div>
    </div>
  );
}
