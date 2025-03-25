import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { supabase } from '../lib/supabase';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Clear error when location changes
  useEffect(() => {
    setError('');
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error: signInError, data } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) throw signInError;

      // Check if user exists in physicians table
      const { data: physicianData, error: physicianError } = await supabase
        .from('physicians')
        .select('id')
        .eq('id', data.user?.id)
        .maybeSingle();

      if (physicianError) throw physicianError;

      // Check if user exists in members table
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('id')
        .eq('id', data.user?.id)
        .maybeSingle();

      if (memberError) throw memberError;

      // Redirect based on user type
      if (physicianData) {
        navigate('/physician/dashboard');
      } else if (memberData) {
        navigate('/home');
      } else {
        throw new Error('User profile not found');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Log In">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
              placeholder="your.email@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="mt-1 relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember"
                type="checkbox"
                className="h-4 w-4 text-pink-500 focus:ring-pink-500 border-gray-300 rounded"
              />
              <label htmlFor="remember" className="ml-2 block text-sm text-gray-700">
                Remember me
              </label>
            </div>
            <Link to="/forgot-password" className="text-sm text-pink-500 hover:text-pink-600">
              Forgot password?
            </Link>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-pink-500 hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}