import { notFound } from 'next/navigation';
import { MOMENTS } from '@/lib/safari';
import SafariExperience from '@/components/SafariExperience';

export function generateStaticParams() {
  return Object.keys(MOMENTS).map((moment) => ({ moment }));
}

export async function generateMetadata({ params }) {
  const { moment } = await params;
  const m = MOMENTS[moment];
  if (!m) return {};
  return { title: `Safari in 3D: ${m.name}`, description: m.blurb };
}

export default async function SafariPage({ params }) {
  const { moment } = await params;
  if (!MOMENTS[moment]) notFound();
  return <SafariExperience initialMoment={moment} />;
}
