import type { Metadata } from 'next';
import RetryButton from './RetryButton';

export const metadata: Metadata = {
  title: 'Hors ligne - MotoPayee',
};

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M18.364 5.636a9 9 0 010 12.728m-2.829-2.829a5 5 0 000-7.07m-4.243 9.9a9 9 0 01-6.364-2.637m2.828-2.828a5 5 0 01-1.414-3.536"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Pas de connexion</h1>
        <p className="text-gray-500 mb-6">Verifiez votre connexion internet et reessayez.</p>
        <RetryButton />
      </div>
    </div>
  );
}
