import { notFound } from 'next/navigation';
import { STOPS } from '@/lib/diani';
import BeachExperience from '@/components/BeachExperience';

export function generateStaticParams() {
  return Object.keys(STOPS).map((stop) => ({ stop }));
}

export async function generateMetadata({ params }) {
  const { stop } = await params;
  const s = STOPS[stop];
  if (!s) return {};
  return { title: `Diani in 3D: ${s.name}`, description: s.blurb };
}

export default async function DianiPage({ params }) {
  const { stop } = await params;
  if (!STOPS[stop]) notFound();
  return <BeachExperience place="diani" initialStop={stop} />;
}
