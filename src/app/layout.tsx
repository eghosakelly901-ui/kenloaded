import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'K-LOADED — discover your next sound', template: '%s | K-LOADED' },
  description: 'Discover new music, listen to rising artists, and download authorized releases on K-LOADED.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
