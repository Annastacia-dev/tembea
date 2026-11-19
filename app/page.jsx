import Link from 'next/link';
import Nav from '@/components/Nav';
import IslandsScene from '@/components/IslandsScene';
import OfferCard, { ArcCard } from '@/components/OfferCard';
import BookingForm from '@/components/BookingForm';

export default function Home() {
  return (
    <>
      <IslandsScene />
      <Nav />
      <main id="top">
        <section className="hero" data-k="hero">
          <h1>Safari, summit and shore, planned as one East African journey</h1>
          <p>Follow the migration across the Serengeti, stand on the roof of Africa at Uhuru Peak, then wash the dust off in the Indian Ocean. Take one trip, or all three in a single 18-day arc.</p>
          <div className="row">
            <a className="btn" href="#safari">See the three trips</a>
            <Link className="btn ghost" href="/climb/lemosho">Climb Kilimanjaro in 3D</Link>
          </div>
        </section>

        {['safari', 'kili', 'zanzibar'].map((k) => (
          <section className="offer" id={k} data-k={k} key={k}><OfferCard id={k} /></section>
        ))}

        <section className="offer" id="arc" data-k="combo"><ArcCard /></section>

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
