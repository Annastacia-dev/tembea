import { notFound } from 'next/navigation';
import { ROUTES } from '@/lib/kili';
import ClimbExperience from '@/components/ClimbExperience';

export function generateStaticParams() {
  return Object.keys(ROUTES).map((route) => ({ route }));
}

export async function generateMetadata({ params }) {
  const { route } = await params;
  const r = ROUTES[route];
  if (!r) return {};
  return { title: `Climb Kilimanjaro: ${r.name} Route in 3D`, description: r.blurb };
}

export default async function ClimbPage({ params }) {
  const { route } = await params;
  if (!ROUTES[route]) notFound();
  return <ClimbExperience initialRoute={route} />;
}
