import Navbar from '../(components)/Navbar';
import Footer from '../(components)/Footer';
import LoginForm from './LoginForm';

export default function LoginPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-[80vh] flex items-center justify-center px-4 py-16">
        <LoginForm />
      </main>
      <Footer />
    </>
  );
}
