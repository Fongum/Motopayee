import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import WhatsAppFloatingSupport from './(components)/WhatsAppFloatingSupport';
import ComparisonBar from './(components)/ComparisonBar';
import InstallPrompt from './(components)/InstallPrompt';
import ServiceWorkerRegistration from './(components)/ServiceWorkerRegistration';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: {
    default: 'MotoPayee — Achetez, vendez et financez votre véhicule au Cameroun',
    template: '%s | MotoPayee',
  },
  description: 'La marketplace automobile #1 au Cameroun. Véhicules inspectés, prix transparents et financement facilité via nos IMF partenaires.',
  keywords: ['voiture Cameroun', 'achat véhicule Douala', 'financement auto Yaoundé', 'marketplace automobile', 'MotoPayee'],
  authors: [{ name: 'MotoPayee' }],
  creator: 'MotoPayee',
  metadataBase: new URL('https://motopayee.vercel.app'),
  openGraph: {
    type: 'website',
    locale: 'fr_CM',
    siteName: 'MotoPayee',
    title: 'MotoPayee — Marketplace automobile du Cameroun',
    description: 'Achetez, vendez et financez votre véhicule. Véhicules inspectés, prix transparents, financement sous 72h.',
    images: [{ url: '/logo2.png', width: 1024, height: 1024, alt: 'MotoPayee Logo' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MotoPayee — Marketplace automobile du Cameroun',
    description: 'Achetez, vendez et financez votre véhicule au Cameroun.',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1a3a6b" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="MotoPayee" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white text-gray-900`}>
        {children}
        <WhatsAppFloatingSupport />
        <ComparisonBar />
        <InstallPrompt />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
