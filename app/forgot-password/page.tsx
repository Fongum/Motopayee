import Navbar from '../(components)/Navbar';
import Footer from '../(components)/Footer';
import ForgotPasswordForm from './ForgotPasswordForm';

export default function ForgotPasswordPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-[80vh] flex items-center justify-center px-4 py-16 bg-gray-50">
        <ForgotPasswordForm />
      </main>
      <Footer />
    </>
  );
}
