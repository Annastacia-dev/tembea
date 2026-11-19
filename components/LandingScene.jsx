'use client';
import { useEffect, useRef, useState } from 'react';
import { SCENES } from '@/lib/landingScene';

// Full-screen 3D landscape behind the homepage, plus a small "where you are" journey indicator.
export default function LandingScene() {
  const canvas = useRef(null);
  const [active, setActive] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let destroy, cancelled = false;
    import('@/lib/landingScene')
      .then(({ createLanding }) => {
        if (cancelled) return;
        destroy = createLanding({ canvas: canvas.current, sections: document.querySelectorAll('[data-k]'), onScene: setActive });
        setReady(true);
      })
      .catch((err) => console.warn('3D scene unavailable', err));
    return () => { cancelled = true; destroy?.(); };
  }, []);

  const go = (k) => document.querySelector(`[data-k="${k}"]`)?.scrollIntoView();

  return (
    <>
      <div className="sky" />
      <canvas id="scene" ref={canvas} aria-hidden="true" className={ready ? 'on' : ''} />
      <nav className="journey" aria-label="Scenes on this page">
        <ol>
          {SCENES.map((s, i) => (
            <li key={s.k}>
              <button type="button" aria-current={i === active ? 'step' : undefined} onClick={() => go(s.k)}>
                <span>{s.label}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
