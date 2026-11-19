import { Outfit } from 'next/font/google';
import './globals.css';

const outfit = Outfit({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-outfit', display: 'swap' });

export const metadata = {
  title: { default: 'Tembea · East Africa journeys', template: '%s · Tembea' },
  description: 'Serengeti safari, Kilimanjaro climbs and Zanzibar beaches, planned as one journey. Walk any Kilimanjaro route day by day in 3D.',
};

export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#0f1b33' };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={outfit.variable} data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
