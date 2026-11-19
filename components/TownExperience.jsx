'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PLACES as DATA } from '@/lib/towns';

const PLACES = {
  stonetown: {
    label: '3D model of Stone Town: its lanes, the Old Fort, Forodhani Gardens and the harbour',
    h2: 'Stone Town, as you’ll live it',
    intro: 'Step into three moments of the trip: a sundowner on a rooftop above the harbour, dinner at the Forodhani night market, and a morning walk through the old town lanes. Change the time of day as you go.',
    fine: 'The town is a modelled impression of Stone Town, not a map: the lanes, houses and landmarks are placed to give the feel of the place, not its exact plan.',
  },
  mombasa: {
    label: '3D model of Mombasa Old Town, Fort Jesus and the Old Port',
    h2: 'Mombasa, as you’ll live it',
    intro: 'Step into three moments of the trip: an afternoon in the Old Town lanes, the view from the walls of Fort Jesus, and a dhow dinner on the harbour after dark. Change the time of day as you go.',
    fine: 'The town is a modelled impression of Mombasa’s Old Town, not a map: the lanes, houses and fort are placed to give the feel of the place, not its exact plan.',
  },
};

export default function TownExperience({ initialMoment, place }) {
  const root = useRef(null);
  const router = useRouter();
  const P = PLACES[place], D = DATA[place];
  const [status, setStatus] = useState('Building the town…');

  useEffect(() => {
    let destroy;
    const timer = setTimeout(async () => {
      try {
        const { createTown } = await import('@/lib/townEngine');
        if (!root.current) return;
        destroy = createTown(root.current, {
          place,
          moment: initialMoment,
          onMoment: (k) => {
            window.history.replaceState(null, '', `/${place}/${k}`);
            document.title = `${D.title}: ${D.moments[k].name} · Tembea`;
          },
          onExit: () => router.push(`/#${place}`),
        });
        setStatus('');
      } catch (err) {
        console.error(err);
        setStatus('Your browser could not start WebGL, which the 3D town needs.');
      }
    }, 40);
    return () => { clearTimeout(timer); destroy?.(); };
  }, [initialMoment, place, router, D]);

  return (
    <div className="climb beach" ref={root}>
      <canvas id="zv" aria-label={P.label} />
      <div className="z-mask" aria-hidden="true" />
      {status && <div className="c-load">{status}</div>}
      <div className="c-top">
        <Link className="cbtn" href={`/#${place}`}>← Back to trips</Link>
        <div className="c-title"><b id="zTitle">{D.title}</b><span id="zSub">Choose a moment to begin</span></div>
        <div className="seg">
          <button className="cbtn" id="zAuto" aria-pressed="true">Guided walk</button>
          <button className="cbtn" id="zSound" aria-pressed="false">Sound</button>
        </div>
      </div>
      <aside className="glass c-pick" id="zPick">
        <h2>{P.h2}</h2>
        <p>{P.intro}</p>
        <div className="c-routes z-list" id="zStops" />
        <div className="c-detail" id="zDetail" />
        <button className="btn" id="zStart" style={{ width: '100%' }}>Step in</button>
        <p className="c-fine">Drag to look around. Walk with W/A/S/D or the arrow keys (on-screen pad on touch screens), Shift to go faster, P to pause the guided walk, N for the next moment, Esc to leave. {P.fine}</p>
      </aside>
      <aside className="glass c-stats" id="zStats" hidden>
        <div className="alt"><span>Local time</span><b id="zTime">–</b></div>
        <div><span>You are</span><b id="zWhere">–</b></div>
        <div><span>Air</span><b id="zAir">–</b></div>
        <div><span>Sea</span><b id="zSea">–</b></div>
        <div><span>Sun</span><b id="zUv">–</b></div>
        <div><span>Today</span><b id="zSun">–</b></div>
      </aside>
      <aside className="glass c-note" id="zNote" hidden><b id="zNT" /><p id="zNX" /><p className="c-fine" id="zNTip" /></aside>
      <div className="z-pad" id="zPad" hidden>
        <span /><button className="cbtn" data-k="f" aria-label="Forward">▲</button><span />
        <button className="cbtn" data-k="l" aria-label="Left">◀</button><button className="cbtn" data-k="b" aria-label="Back">▼</button><button className="cbtn" data-k="r" aria-label="Right">▶</button>
      </div>
      <div className="glass z-bar" id="zBar" hidden>
        <button className="cbtn" id="zPrev" aria-label="Previous moment">‹</button>
        <div className="z-stops" id="zBarStops" />
        <button className="cbtn" id="zNext" aria-label="Next moment">›</button>
        <label className="z-clock"><span>Time</span><input type="range" id="zClock" min="6" max="23.9" step="0.05" defaultValue="9" aria-label="Time of day" /><b id="zClockL">09:00</b></label>
        <button className="cbtn" id="zChange">Moments</button>
      </div>
    </div>
  );
}
