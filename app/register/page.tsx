import { Suspense } from 'react';
import Navbar from '../(components)/Navbar';
import Footer from '../(components)/Footer';
import RegisterForm from './RegisterForm';

export default function RegisterPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-[80vh] flex items-center justify-center px-4 py-16">
        <Suspense fallback={<div className="animate-pulse text-gray-400">Chargement...</div>}>
          <RegisterForm />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
