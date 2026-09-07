'use client';

import dynamic from 'next/dynamic';

const MapExplorer = dynamic(() => import('./map-explorer'), {
  ssr: false,
  loading: () => (
    <main className="map-loading" aria-live="polite">
      <div className="loading-orbit" />
      <p>Charting Skyreach…</p>
    </main>
  ),
});

export default function Home() {
  return <MapExplorer />;
}
