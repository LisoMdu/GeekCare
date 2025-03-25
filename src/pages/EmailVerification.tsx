import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function EmailVerification() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(15);

  useEffect(() => {
    const email = searchParams.get('email');
    if (email) {
      setEmail(email);
    }
  }, [searchParams]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 4) {
      setError('Please enter a valid 4-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Here you would typically verify the code with Supabase
      // For now, we'll simulate success and redirect
      await new Promise(resolve => setTimeout(resolve, 1000));
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    setError('');
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (resendError) throw resendError;
      setCountdown(15);
    } catch (err) {
      setError('Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
        <button
          onClick={() => navigate('/login')}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-2xl font-bold mb-6">Email Verification</h2>
        
        <p className="text-gray-600 mb-6">
          A code has been sent to:
          <br />
          <span className="text-pink-500 font-medium">{email}</span>
        </p>

        <form onSubmit={handleVerify} className="space-y-6">
          <div>
            <input
              type="text"
              maxLength={4}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="Please enter 4 digit code"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Didn't receive the code?
            </span>
            <button
              type="button"
              onClick={handleResendCode}
              disabled={countdown > 0 || loading}
              className="text-pink-500 hover:text-pink-600 disabled:text-gray-400"
            >
              {countdown > 0 ? `Resend Code (${countdown}s)` : 'Resend Code'}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || code.length !== 4}
            className="w-full bg-pink-500 text-white py-3 rounded-lg hover:bg-pink-600 disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        </form>
      </div>
    </div>
  );
}