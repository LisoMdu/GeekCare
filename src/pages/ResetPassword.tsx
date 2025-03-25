import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [hasAccessToken, setHasAccessToken] = useState(false);

  // Check for hash token in URL on initial load
  useEffect(() => {
    console.log('Checking for reset token...');
    // When Supabase redirects to this page, it includes the token in the hash fragment
    const hashFragment = location.hash;
    if (hashFragment && hashFragment.includes('access_token')) {
      console.log('Reset token found in URL');
      setHasAccessToken(true);
    } else {
      console.log('No reset token found in URL. Hash:', hashFragment);
      setError('Invalid or missing reset token. Please request a new password reset link.');
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('Attempting to update password...');
      
      // If we have access token in URL, Supabase will handle it automatically
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        console.error('Password update error:', updateError);
        throw updateError;
      }
      
      console.log('Password updated successfully');
      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      console.error('Reset password error:', err);
      setError(err instanceof Error 
        ? err.message 
        : 'Failed to reset password. Please try again or request a new reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-white flex">
      <div className="hidden lg:block lg:w-1/2">
        <img
          src="https://images.unsplash.com/photo-1638202993928-7d113b8e4519?auto=format&fit=crop&q=80"
          alt="Healthcare professional"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="w-full lg:w-1/2 flex flex-col">
        <header className="p-6">
          <nav className="flex justify-between items-center">
            <Link to="/" className="flex items-center gap-2">
              <Heart className="w-8 h-8 text-pink-500 fill-pink-500" />
              <span className="text-2xl font-bold">GeekCare</span>
            </Link>
            <div className="flex gap-4">
              <Link to="/login" className="text-pink-500 font-semibold">
                Back to Login
              </Link>
            </div>
          </nav>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md space-y-8">
            <div className="text-center">
              <h2 className="text-4xl font-bold text-gray-900">Reset Password</h2>
            </div>

            {success ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <h3 className="text-green-800 font-medium text-lg mb-2">Password Reset Successful!</h3>
                <p className="text-green-700">
                  Your password has been updated successfully.
                  <br />
                  You will be redirected to the login page...
                </p>
              </div>
            ) : !hasAccessToken ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h3 className="text-yellow-800 font-medium text-lg mb-2">Reset Link Error</h3>
                <p className="text-yellow-700 mb-4">
                  {error || 'Your password reset link appears to be invalid or has expired.'}
                </p>
                <Link 
                  to="/forgot-password" 
                  className="inline-block bg-pink-500 text-white px-4 py-2 rounded-lg hover:bg-pink-600"
                >
                  Request New Reset Link
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
                    placeholder="Enter new password"
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
                    placeholder="Confirm new password"
                  />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-pink-500 hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Password'}
                </button>
              </form>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}