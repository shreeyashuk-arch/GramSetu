import type { Metadata, Viewport } from 'next';
import './globals.css';
import { LanguageProvider } from '@/lib/i18n';
import TopTicker from '@/components/layout/TopTicker';
import DemoBar from '@/components/layout/DemoBar';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import SOSButton from '@/components/sos/SOSButton';
import FloatingChatbot from '@/components/chatbot/FloatingChatbot';
import LanguageModal from '@/components/layout/LanguageModal';

export const metadata: Metadata = {
  title: 'GramSetu | Village Needs & Resources Platform',
  description: 'Rural Indian village needs, grievance redressal, and resource coordination platform.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'GramSetu',
  },
};

export const viewport: Viewport = {
  themeColor: '#15803d',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="antialiased flex flex-col min-h-screen pb-20 lg:pb-0">
        <LanguageProvider>
          {/* Top Live Ticker Notification Bar */}
          <TopTicker />

          {/* 1-Click Role Switcher Demo Mode Bar */}
          <DemoBar />

          {/* Main Navigation Header */}
          <Header />

          {/* App Body Content */}
          <main className="flex-1">{children}</main>

          {/* Mobile Bottom Navigation */}
          <BottomNav />

          {/* Persistent Women's SOS Button */}
          <SOSButton />

          {/* Floating Gram Assistant Chatbot */}
          <FloatingChatbot />

          {/* Full Screen Language Selector Modal on First Visit */}
          <LanguageModal />
        </LanguageProvider>
      </body>
    </html>
  );
}
