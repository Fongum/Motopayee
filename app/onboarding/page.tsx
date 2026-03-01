import Navbar from '../(components)/Navbar';
import Footer from '../(components)/Footer';
import OnboardingForm from './OnboardingForm';

export default function OnboardingPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-[80vh] flex items-center justify-center px-4 py-16">
        <OnboardingForm />
      </main>
      <Footer />
    </>
  );
}
