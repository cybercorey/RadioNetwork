import { Providers } from '@/theme/Providers';
import Navigation from '@/components/Navigation';
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'RadioNetwork v2',
  description: 'Modern NZ radio station tracking system',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Navigation />
          {children}
        </Providers>
      </body>
    </html>
  );
}
