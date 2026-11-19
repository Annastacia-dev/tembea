'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import * as ZNZ from '@/lib/zanzibar';
import * as DIANI from '@/lib/diani';

const PLACES = {
  zanzibar: {
    data: ZNZ, title: 'Zanzibar in 3D', loading: 'Building the coast…',
    label: "3D model of Zanzibar's northern coast, its lagoon and reef",
    h2: 'Zanzibar, as you’ll live it',
    intro: 'Step into four moments of the trip on a model of the northern coast: walk the beach, snorkel the reef with a turtle, sail a dhow into the sunset, and sit by the fire under the stars. Change the time of day as you go.',
    fine: 'The coast is a modelled impression of Nungwi, not a survey, and the reef sits much closer to the beach than Mnemba really is.',
  },
  diani: {
    data: DIANI, title: 'Diani in 3D', loading: 'Building the coast…',
    label: '3D model of Diani Beach, the Kongo River mouth and the coral platform at Tiwi',
    h2: 'Diani, as you’ll live it',
    intro: 'Step into four moments of the trip on a model of the Kenyan south coast: sunrise on Diani Beach, dolphins and coral at Kisite-Mpunguti, the African Map Pool at low tide, and sunset at the Kongo River. Change the time of day as you go.',
    fine: 'The coast is a modelled impression, not a survey: Tiwi, Diani and Kisite-Mpunguti (off Wasini, far to the south) are drawn much closer together than they are.',
  },
};

export default function BeachExperience({ initialStop, place = 'zanzibar' }) {
  const root = useRef(null);
  const router = useRouter();
  const P = PLACES[place];
  const [status, setStatus] = useState(P.loading);

  useEffect(() => {
    let destroy;
    const timer = setTimeout(async () => {
      try {
        const { createBeach } = await import('@/lib/beachEngine');
        if (!root.current) return;
        destroy = createBeach(root.current, {
          place,
          stop: initialStop,
          onStop: (k) => {
            window.history.replaceState(null, '', `/${place}/${k}`);
            document.title = `${P.title}: ${P.data.STOPS[k].name} · Tembea`;
          },
          onExit: () => router.push(`/#${place}`),
        });
        setStatus('');
      } catch (err) {
        console.error(err);
        setStatus('Your browser could not start WebGL, which the 3D beach needs.');
      }
    }, 40);
    return () => { clearTimeout(timer); destroy?.(); };
  }, [initialStop, place, router, P]);

  return (
    <div className="climb beach" ref={root}>
      <canvas id="zv" aria-label={P.label} />
      <div className="z-mask" aria-hidden="true" />
      {status && <div className="c-load">{status}</div>}
      <div className="c-top">
        <Link className="cbtn" href={`/#${place}`}>← Back to trips</Link>
        <div className="c-title"><b id="zTitle">{P.title}</b><span id="zSub">Choose a moment to begin</span></div>
        <div className="seg">
          <button className="cbtn" id="zAuto" aria-pressed="true">Stroll</button>
          <button className="cbtn" id="zSound" aria-pressed="false">Sound</button>
        </div>
      </div>
      <aside className="glass c-pick" id="zPick">
        <h2>{P.h2}</h2>
        <p>{P.intro}</p>
        <div className="c-routes z-list" id="zStops" />
        <div className="c-detail" id="zDetail" />
        <button className="btn" id="zStart" style={{ width: '100%' }}>Step in</button>
        <p className="c-fine">Drag to look around. Walk or swim with W/A/S/D or the arrow keys (on-screen pad on touch screens), Shift to go faster, P to pause the guided walk, N for the next moment, Esc to leave. {P.fine}</p>
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
        <span /><button className="cbtn" data-k="f" aria-label="Forward">▲</button><button className="cbtn z-up" data-k="u" aria-label="Rise">⤒</button>
        <button className="cbtn" data-k="l" aria-label="Left">◀</button><button className="cbtn" data-k="b" aria-label="Back">▼</button><button className="cbtn" data-k="r" aria-label="Right">▶</button>
        <span /><span /><button className="cbtn z-up" data-k="d" aria-label="Sink">⤓</button>
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
