'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MOMENTS } from '@/lib/safari';

export default function SafariExperience({ initialMoment }) {
  const root = useRef(null);
  const router = useRouter();
  const [status, setStatus] = useState('Building the savanna…');

  useEffect(() => {
    let destroy;
    const timer = setTimeout(async () => {
      try {
        const { createSafari } = await import('@/lib/safariEngine');
        if (!root.current) return;
        destroy = createSafari(root.current, {
          moment: initialMoment,
          onMoment: (k) => {
            window.history.replaceState(null, '', `/safari/${k}`);
            document.title = `Safari in 3D: ${MOMENTS[k].name} · Tembea`;
          },
          onExit: () => router.push('/#safari'),
        });
        setStatus('');
      } catch (err) {
        console.error(err);
        setStatus('Your browser could not start WebGL, which the 3D safari needs.');
      }
    }, 40);
    return () => { clearTimeout(timer); destroy?.(); };
  }, [initialMoment, router]);

  return (
    <div className="climb beach safari" ref={root}>
      <canvas id="zv" aria-label="3D model of the Tanzanian savanna, its river, kopjes and wildlife" />
      {status && <div className="c-load">{status}</div>}
      <div className="c-top">
        <Link className="cbtn" href="/#safari">← Back to trips</Link>
        <div className="c-title"><b id="zTitle">Safari in 3D</b><span id="zSub">Choose a moment to begin</span></div>
        <div className="seg">
          <button className="cbtn" id="zAuto" aria-pressed="true">Guide drives</button>
          <button className="cbtn" id="zSound" aria-pressed="false">Sound</button>
        </div>
      </div>
      <aside className="glass c-pick" id="zPick">
        <h2>The safari, as you&apos;ll live it</h2>
        <p>Step into four moments of the trip on a model of the northern Tanzanian savanna: a morning drive among elephants and baobabs, the migration at the river, a balloon over the herds at sunrise, and a night by the fire in a tented camp. Change the time of day as you go.</p>
        <div className="c-routes z-list" id="zStops" />
        <div className="c-detail" id="zDetail" />
        <button className="btn" id="zStart" style={{ width: '100%' }}>Step in</button>
        <p className="c-fine">Drag to look around. Your guide drives and stops at sightings; W/A/S/D or the arrow keys take the wheel (on-screen pad on touch screens), Shift to go faster, Space and C to climb or sink in the balloon, P to pause the guide, N for the next moment, Esc to leave. Tarangire and the Serengeti are hundreds of kilometres apart; here they share one modelled landscape, not a survey.</p>
      </aside>
      <aside className="glass c-stats" id="zStats" hidden>
        <div className="alt"><span>Local time</span><b id="zTime">–</b></div>
        <div><span>You are</span><b id="zWhere">–</b></div>
        <div><span>Air</span><b id="zAir">–</b></div>
        <div><span>Animals</span><b id="zAnimals">–</b></div>
        <div><span>Sun</span><b id="zUv">–</b></div>
        <div><span>Today</span><b id="zSun">–</b></div>
      </aside>
      <aside className="glass c-note" id="zNote" hidden><b id="zNT" /><p id="zNX" /><p className="c-fine" id="zNTip" /></aside>
      <div className="z-pad" id="zPad" hidden>
        <span /><button className="cbtn" data-k="f" aria-label="Forward">▲</button><button className="cbtn z-up" data-k="u" aria-label="Climb">⤒</button>
        <button className="cbtn" data-k="l" aria-label="Left">◀</button><button className="cbtn" data-k="b" aria-label="Back">▼</button><button className="cbtn" data-k="r" aria-label="Right">▶</button>
        <span /><span /><button className="cbtn z-up" data-k="d" aria-label="Sink">⤓</button>
      </div>
      <div className="glass z-bar" id="zBar" hidden>
        <button className="cbtn" id="zPrev" aria-label="Previous moment">‹</button>
        <div className="z-stops" id="zBarStops" />
        <button className="cbtn" id="zNext" aria-label="Next moment">›</button>
        <label className="z-clock"><span>Time</span><input type="range" id="zClock" min="5.5" max="23.9" step="0.05" defaultValue="8" aria-label="Time of day" /><b id="zClockL">08:00</b></label>
        <button className="cbtn" id="zChange">Moments</button>
      </div>
    </div>
  );
}
