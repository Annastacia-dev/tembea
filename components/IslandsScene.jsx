'use client';
import { useEffect, useRef } from 'react';
import { createIslands } from '@/lib/islandsScene';

export default function IslandsScene() {
  const canvas = useRef(null), sky = useRef(null), pins = useRef(null);
  useEffect(() => {
    let destroy;
    try {
      destroy = createIslands({ canvas: canvas.current, sky: sky.current, pins: pins.current, sections: document.querySelectorAll('[data-k]') });
    } catch (err) {
      console.warn('3D scene unavailable', err);
      pins.current.style.display = 'none';
    }
    return () => destroy?.();
  }, []);
  return (
    <>
      <div className="sky" ref={sky} />
      <canvas id="scene" ref={canvas} aria-hidden="true" />
      <div className="pins" ref={pins}>
        <a className="pin" href="#safari" data-i="safari">Serengeti<small>Safari · 7 days</small></a>
        <a className="pin" href="#kili" data-i="kili">Kilimanjaro<small>Climb · 8 days</small></a>
        <a className="pin" href="#zanzibar" data-i="zanzibar">Zanzibar<small>Beach · 5 days</small></a>
      </div>
    </>
  );
}
