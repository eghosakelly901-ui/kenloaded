import Platform from '@/components/Platform';
import type { Metadata } from 'next';

const pageMetadata: Record<string, { title: string; description: string }> = {
  '/': { title: 'Discover. Stream. Download.', description: 'Discover new music, listen to rising artists, and download authorized releases on K-LOADED.' },
  '/music': { title: 'Music Library', description: 'Browse, search, filter and listen to approved songs across the K-LOADED music library.' },
  '/trending': { title: 'Trending Music', description: 'Find the most-played music in the K-LOADED community.' },
  '/artists': { title: 'Artists', description: 'Discover independent African artists and explore their music, profiles and albums.' },
  '/albums': { title: 'Albums & EPs', description: 'Explore albums and EPs from artists featured on K-LOADED.' },
  '/genres': { title: 'Browse Genres', description: 'Find new music across Afrobeats, Hip-Hop, R&B, Gospel, Amapiano, Pop and more.' },
  '/upload': { title: 'Upload Music', description: 'Submit music you own or are authorized to distribute for review by the K-LOADED team.' },
  '/login': { title: 'Sign In', description: 'Sign in to your K-LOADED music account.' },
  '/register': { title: 'Create Account', description: 'Create a K-LOADED account to save favorites, follow artists and curate playlists.' },
  '/playlists': { title: 'Your Playlists', description: 'Create and manage your personal music playlists on K-LOADED.' },
  '/admin': { title: 'Admin Studio', description: 'Restricted K-LOADED administrator tools for moderation and music analytics.' },
  '/about': { title: 'About K-LOADED', description: 'Learn about the K-LOADED music discovery platform and its approach to artist-first music.' },
  '/contact': { title: 'Contact K-LOADED', description: 'Contact the K-LOADED team about artists, music, partnerships and platform support.' },
  '/privacy': { title: 'Privacy Policy', description: 'Learn how K-LOADED handles account information, listening activity and platform data.' },
  '/terms': { title: 'Terms & Conditions', description: 'Read the terms for using K-LOADED and sharing or downloading music on the platform.' },
};

export async function generateMetadata({ params }: { params: Promise<{ slug?: string[] }> }): Promise<Metadata> {
  const { slug = [] } = await params;
  const route = `/${slug.join('/')}`;
  const meta = pageMetadata[route] ?? { title: route.split('/').filter(Boolean).join(' · ') || 'Home', description: 'Discover and stream music on K-LOADED.' };
  return { title: meta.title, description: meta.description };
}

export default async function Page({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug = [] } = await params;
  return <Platform path={`/${slug.join('/')}`} />;
}
