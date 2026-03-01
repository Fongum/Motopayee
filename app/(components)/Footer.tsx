import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <p className="text-white text-xl font-bold mb-2">MotoPayee</p>
            <p className="text-sm leading-relaxed">
              Cameroon&apos;s trusted vehicle marketplace with integrated financing facilitation.
              Buy, sell, and get funded — all in one place.
            </p>
          </div>
          <div>
            <p className="text-white text-sm font-semibold mb-3">Marketplace</p>
            <ul className="space-y-2 text-sm">
              <li><Link href="/listings" className="hover:text-white">Browse Vehicles</Link></li>
              <li><Link href="/sell" className="hover:text-white">Sell a Vehicle</Link></li>
              <li><Link href="/dealers" className="hover:text-white">Dealer Info</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-white text-sm font-semibold mb-3">Financing</p>
            <ul className="space-y-2 text-sm">
              <li><Link href="/apply" className="hover:text-white">Apply for Financing</Link></li>
              <li><Link href="/register" className="hover:text-white">Create Account</Link></li>
              <li><Link href="/login" className="hover:text-white">Sign In</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-10 pt-6 text-xs text-center">
          © {new Date().getFullYear()} MotoPayee. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
