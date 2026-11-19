import Link from 'next/link';

export default function Nav() {
  return (
    <nav className="top" aria-label="Main">
      <Link className="logo" href="/#top">
        <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
          <circle cx="19" cy="11" r="6" fill="#ffb347" />
          <path d="M1 26 11 9l5 8 3-4 10 13Z" fill="#fff" />
          <path d="m11 9-2.6 4.4 2.6-1 2.3 1Z" fill="#cfe3ef" />
        </svg>
        Tembea
      </Link>
      <div className="links">
        <a href="#safari">Safari</a>
        <a href="#kili">Kilimanjaro</a>
        <a href="#zanzibar">Zanzibar</a>
        <Link href="/climb/lemosho">Climb in 3D</Link>
      </div>
      <a className="btn" href="#book">Plan a trip</a>
    </nav>
  );
}
