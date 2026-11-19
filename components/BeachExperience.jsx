'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { STOPS } from '@/lib/zanzibar';

export default function BeachExperience({ initialStop }) {
  const root = useRef(null);
  const router = useRouter();
  const [status, setStatus] = useState('Building the coast…');

  useEffect(() => {
    let destroy;
    const timer = setTimeout(async () => {
      try {
        const { createBeach } = await import('@/lib/beachEngine');
        if (!root.current) return;
        destroy = createBeach(root.current, {
          stop: initialStop,
          onStop: (k) => {
            window.history.replaceState(null, '', `/zanzibar/${k}`);
            document.title = `Zanzibar in 3D: ${STOPS[k].name} · Tembea`;
          },
          onExit: () => router.push('/#zanzibar'),
        });
        setStatus('');
      } catch (err) {
        console.error(err);
        setStatus('Your browser could not start WebGL, which the 3D beach needs.');
      }
    }, 40);
    return () => { clearTimeout(timer); destroy?.(); };
  }, [initialStop, router]);

  return (
    <div className="climb beach" ref={root}>
      <canvas id="zv" aria-label="3D model of Zanzibar's northern coast, its lagoon and reef" />
      <div className="z-mask" aria-hidden="true" />
      {status && <div className="c-load">{status}</div>}
      <div className="c-top">
        <Link className="cbtn" href="/#zanzibar">← Back to trips</Link>
        <div className="c-title"><b id="zTitle">Zanzibar in 3D</b><span id="zSub">Choose a moment to begin</span></div>
        <div className="seg">
          <button className="cbtn" id="zAuto" aria-pressed="true">Stroll</button>
          <button className="cbtn" id="zSound" aria-pressed="false">Sound</button>
        </div>
      </div>
      <aside className="glass c-pick" id="zPick">
        <h2>Zanzibar, as you&apos;ll live it</h2>
        <p>Step into four moments of the trip on a model of the northern coast: walk the beach, snorkel the reef with a turtle, sail a dhow into the sunset, and sit by the fire under the stars. Change the time of day as you go.</p>
        <div className="c-routes z-list" id="zStops" />
        <div className="c-detail" id="zDetail" />
        <button className="btn" id="zStart" style={{ width: '100%' }}>Step in</button>
        <p className="c-fine">Drag to look around. Walk or swim with W/A/S/D or the arrow keys (on-screen pad on touch screens), Shift to go faster, P to pause the guided walk, N for the next moment, Esc to leave. The coast is a modelled impression of Nungwi, not a survey, and the reef sits much closer to the beach than Mnemba really is.</p>
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
