import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthLayout } from '../components/AuthLayout';
import { Modal } from '../components/Modal';
import { supabase } from '../lib/supabase';

export function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSendResetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);

    try {
      console.log('Sending password reset email to:', trimmedEmail);
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        trimmedEmail, 
        {
          redirectTo: `${window.location.origin}/reset-password`
        }
      );

      if (resetError) {
        console.error('Reset error:', resetError);
        throw resetError;
      }
      
      // Show success message instead of verification modal
      setIsSuccess(true);
    } catch (err) {
      console.error('Password reset error:', err);
      setError(err instanceof Error ? err.message : 'Failed to send reset instructions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Forgot Password">
      <div className="text-center mb-8">
        <p className="text-gray-600">
          Enter your email address and we'll send you instructions to reset your password.
        </p>
      </div>

      {isSuccess ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <h3 className="text-green-800 font-medium mb-2">Reset Link Sent</h3>
          <p className="text-green-700 text-sm">
            We've sent a password reset link to <strong>{email}</strong>. 
            Please check your email and follow the instructions to reset your password.
          </p>
          <div className="mt-4">
            <button
              onClick={() => navigate('/login')}
              className="text-pink-500 hover:text-pink-600 font-medium"
            >
              Return to Login
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSendResetLink} className="space-y-6">
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

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-pink-500 hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
          
          <div className="text-center">
            <Link to="/login" className="text-sm text-pink-500 hover:text-pink-600">
              Back to Login
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}