import './globals.css';
import { geist, cairo, xbShafigh } from '@/lib/fonts';

export const metadata = { title: 'DUTHUR — دُثُر', description: 'Quiet Arab identity streetwear' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${cairo.variable} ${xbShafigh.variable}`} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
