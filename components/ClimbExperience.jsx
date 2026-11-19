'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ROUTES } from '@/lib/kili';

export default function ClimbExperience({ initialRoute }) {
  const root = useRef(null);
  const router = useRouter();
  const [status, setStatus] = useState('Building the mountain…');

  useEffect(() => {
    let destroy;
    // Let the loading text paint before the terrain build blocks the main thread.
    const timer = setTimeout(async () => {
      try {
        const { createClimb } = await import('@/lib/climbEngine');
        if (!root.current) return;
        destroy = createClimb(root.current, {
          route: initialRoute,
          onRoute: (k) => {
            window.history.replaceState(null, '', `/climb/${k}`);
            document.title = `Climb Kilimanjaro: ${ROUTES[k].name} Route in 3D · Tembea`;
          },
          onExit: () => router.push('/#kili'),
        });
        setStatus('');
      } catch (err) {
        console.error(err);
        setStatus('Your browser could not start WebGL, which the 3D climb needs.');
      }
    }, 40);
    return () => { clearTimeout(timer); destroy?.(); };
  }, [initialRoute, router]);

  return (
    <div className="climb" ref={root}>
      <canvas id="cv" aria-label="3D model of Kilimanjaro with the selected route" />
      <div id="cLabels" />
      {status && <div className="c-load">{status}</div>}
      <div className="c-summit" id="cSummit"><b>Uhuru Peak</b>5,895 m, the highest point in Africa</div>
      <div className="c-top">
        <Link className="cbtn" href="/#kili">← Back to trips</Link>
        <div className="c-title"><b id="cTitle">Climb Kilimanjaro</b><span id="cSub">Choose a route to begin</span></div>
        <div className="seg" role="group" aria-label="Camera">
          <button className="cbtn" data-m="map" aria-pressed="true">Map</button>
          <button className="cbtn" data-m="follow" aria-pressed="false">Follow</button>
          <button className="cbtn" data-m="eye" aria-pressed="false">Eye level</button>
        </div>
      </div>
      <aside className="glass c-pick" id="cPick">
        <h2>Climb Kilimanjaro, day by day</h2>
        <p>Pick a route, then walk it on a model of the mountain: every camp at its real altitude, through rainforest, moorland and alpine desert, with the light changing from dawn to the midnight summit push.</p>
        <div className="c-routes" id="cRoutes" />
        <div className="c-detail" id="cDetail" />
        <button className="btn" id="cStart" style={{ width: '100%' }}>Start the climb</button>
        <p className="c-fine">Drag to look around, scroll to zoom, space to pause, arrow keys to skip camps, Esc to leave. Camp altitudes, distances and hiking times are typical published figures. The terrain is a scaled model with 1.5× vertical exaggeration.</p>
      </aside>
      <aside className="glass c-stats" id="cStats" hidden>
        <div className="alt"><span>Altitude</span><b id="sAlt">–</b></div>
        <div><span>Zone</span><b id="sZone">–</b></div>
        <div><span>Local time</span><b id="sTime">–</b></div>
        <div><span>Air temperature</span><b id="sTemp">–</b></div>
        <div><span>Oxygen per breath</span><b id="sO2">–</b></div>
        <div><span>Walked</span><b id="sKm">–</b></div>
      </aside>
      <aside className="glass c-note" id="cNote" hidden><b id="nT" /><p id="nX" /><p className="c-fine" id="nTip" /></aside>
      <div className="glass c-bar" id="cBar" hidden>
        <div className="c-ctl">
          <button className="cbtn" id="cPrev">‹ Camp</button>
          <button className="cbtn" id="cPlay" style={{ minWidth: 84 }}>Pause</button>
          <button className="cbtn" id="cNext">Camp ›</button>
          <select id="cSpeed" aria-label="Playback speed" defaultValue="1">
            <option value=".5">0.5×</option><option value="1">1×</option><option value="2">2×</option><option value="4">4×</option><option value="8">8×</option>
          </select>
          <button className="cbtn" id="cChange">Routes</button>
        </div>
        <svg id="cProf" role="img" aria-label="Altitude profile of the route; click to jump" />
      </div>
    </div>
  );
}
