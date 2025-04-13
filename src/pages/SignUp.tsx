import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, UserCheck, Eye, EyeOff } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { supabase } from '../lib/supabase';

type Role = 'member' | 'physician';

export function SignUp() {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>('member');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      setError('Please agree to the Terms & Conditions');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const trimmedEmail = email.trim().toLowerCase();

      // Check if user exists in either table
      const { data: existingPhysicians } = await supabase
        .from('physicians')
        .select('id')
        .eq('email', trimmedEmail);

      const { data: existingMembers } = await supabase
        .from('members')
        .select('id')
        .eq('email', trimmedEmail);

      if ((existingPhysicians && existingPhysicians.length > 0) || 
          (existingMembers && existingMembers.length > 0)) {
        setError('An account with this email already exists. Please log in instead.');
        setLoading(false);
        return;
      }

      const { error: signUpError, data } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            full_name: fullName,
            role,
          },
        },
      });

      if (signUpError) {
        if (signUpError.message === 'User already registered') {
          throw new Error('An account with this email already exists. Please log in instead.');
        }
        throw signUpError;
      }

      if (data.user) {
        // Create profile in the appropriate table based on role
        const { error: profileError } = await supabase
          .from(role === 'physician' ? 'physicians' : 'members')
          .insert([
            {
              id: data.user.id,
              full_name: fullName,
              email: trimmedEmail,
            },
          ]);

        if (profileError) throw profileError;
        
        // Redirect to appropriate page based on role
        navigate(role === 'physician' ? '/physician/profile' : '/home');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during signup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Sign Up">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Role Selection */}
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setRole('member')}
            className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
              role === 'member'
                ? 'border-gray-400 bg-gray-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <User className={role === 'member' ? 'text-gray-700' : 'text-gray-400'} />
            <span className={role === 'member' ? 'text-gray-700' : 'text-gray-400'}>
              Member
            </span>
          </button>
          <button
            type="button"
            onClick={() => setRole('physician')}
            className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
              role === 'physician'
                ? 'border-pink-500 bg-pink-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <UserCheck className={role === 'physician' ? 'text-pink-500' : 'text-gray-400'} />
            <span className={role === 'physician' ? 'text-pink-500' : 'text-gray-400'}>
              Physician
            </span>
          </button>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email or Mobile No.
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Create Password
            </label>
            <div className="mt-1 relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
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

          <div className="flex items-center">
            <input
              id="terms"
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="h-4 w-4 text-pink-500 focus:ring-pink-500 border-gray-300 rounded"
            />
            <label htmlFor="terms" className="ml-2 block text-sm text-gray-700">
              By signing up, I agree to the{' '}
              <a href="/terms" className="text-pink-500 hover:text-pink-600">
                Terms & Conditions
              </a>
            </label>
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-pink-500 hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Continue'}
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}