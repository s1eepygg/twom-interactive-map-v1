import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TWOM World Atlas',
  description: 'Explore The World of Magic maps, NPCs, monsters, portals, and item discoveries.',
};

const resizeObserverErrorFilter = `
  window.addEventListener('error', function (event) {
    if (typeof event.message === 'string' && event.message.includes('ResizeObserver loop')) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: resizeObserverErrorFilter }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
