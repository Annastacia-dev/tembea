import { notFound } from 'next/navigation';
import { PLACES } from '@/lib/towns';
import TownExperience from '@/components/TownExperience';

const D = PLACES.stonetown;

export function generateStaticParams() {
  return D.order.map((moment) => ({ moment }));
}

export async function generateMetadata({ params }) {
  const { moment } = await params;
  const m = D.moments[moment];
  if (!m) return {};
  return { title: `${D.title}: ${m.name}`, description: m.blurb };
}

export default async function StonetownPage({ params }) {
  const { moment } = await params;
  if (!D.moments[moment]) notFound();
  return <TownExperience place="stonetown" initialMoment={moment} />;
}
