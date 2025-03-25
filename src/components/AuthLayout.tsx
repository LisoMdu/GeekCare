import React from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
}

export function AuthLayout({ children, title }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-white flex">
      {/* Left side - Image */}
      <div className="hidden lg:block lg:w-1/2">
        <img
          src="https://images.unsplash.com/photo-1638202993928-7d113b8e4519?auto=format&fit=crop&q=80"
          alt="Healthcare professional"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col">
        <header className="p-6">
          <nav className="flex justify-between items-center">
            <Link to="/" className="flex items-center gap-2">
              <Heart className="w-8 h-8 text-pink-500 fill-pink-500" />
              <span className="text-2xl font-bold">GeekCare</span>
            </Link>
            <div className="flex gap-4">
              {title === "Sign Up" ? (
                <>
                  <span className="text-gray-600">Already have an account?</span>
                  <Link to="/login" className="text-pink-500 font-semibold">
                    Log In
                  </Link>
                </>
              ) : (
                <>
                  <span className="text-gray-600">Don't have an account?</span>
                  <Link to="/signup" className="text-pink-500 font-semibold">
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </nav>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md space-y-8">
            <div className="text-center">
              <h2 className="text-4xl font-bold text-gray-900">{title}</h2>
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}