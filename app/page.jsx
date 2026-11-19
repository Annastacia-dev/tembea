import Link from 'next/link';
import Nav from '@/components/Nav';
import LandingScene from '@/components/LandingScene';
import OfferCard, { ArcCard } from '@/components/OfferCard';
import DestinationGroup from '@/components/DestinationGroup';
import BookingForm from '@/components/BookingForm';
import { CATS } from '@/lib/trips';

// The landscape behind each category (stations in lib/landingScene.js).
const SCENE = { mountain: 'kili', safari: 'safari', beach: 'zanzibar', city: 'combo' };

export default function Home() {
  return (
    <>
      <LandingScene />
      <Nav />
      <main id="top">
        <section className="hero" data-k="hero">
          <h1>Summit, safari, shore and city, planned as one East African journey</h1>
          <p>Stand on the roof of Africa at Uhuru Peak, follow the migration across the Serengeti, wash the dust off in the Indian Ocean, then lose an evening in an old Swahili town. Take one trip, or put them together.</p>
          <div className="row">
            <a className="btn" href="#mountain">See the trips</a>
            <Link className="btn ghost" href="/climb/lemosho">Climb Kilimanjaro in 3D</Link>
          </div>
          <ul className="cats" aria-label="Destinations">
            {CATS.map((c) => <li key={c.k}><a href={`#${c.k}`}>{c.label}</a></li>)}
          </ul>
        </section>

        {CATS.map((c) => (
          <section className="offer" id={c.k} data-k={SCENE[c.k]} key={c.k}>
            {c.trips.length > 1 ? <DestinationGroup label={c.label} trips={c.trips} /> : (
              <div className="group">
                {c.trips[0] !== c.k && <span id={c.trips[0]} className="anchor" />}
                <OfferCard id={c.trips[0]} />
              </div>
            )}
          </section>
        ))}

        <section className="offer" id="arc" data-k="arc"><ArcCard /></section>

        <section className="offer" id="book" data-k="book">
          <article className="card wide">
            <p className="kick">Price and request</p>
            <h2>Build your trip</h2>
            <BookingForm />
          </article>
        </section>
      </main>
      <footer className="foot">
        <div><b>Tembea</b> · East Africa journeys from Arusha</div>
        <div>Prices, itineraries and the company are sample content.</div>
      </footer>
    </>
  );
}
