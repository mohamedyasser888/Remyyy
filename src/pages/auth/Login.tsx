/**
 * Login Page
 * Email and password authentication
 */

import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useT } from '@/i18n';
import { Button, Input } from '@/components/common';
import { AnimatedBackground } from '@/components/common';
import { validateSignInForm } from '@/utils/validation';
import { ROUTES } from '@/utils/constants';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

export function Login() {
  const t = useT();
  const { signIn } = useAuth();
  const { showToast } = useToast();
  const { login: adminLogin } = useAdminAuth();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    if (authError) setAuthError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validation = validateSignInForm(formData);
    if (!validation.valid) { setErrors(validation.errors); return; }
    setLoading(true);
    setErrors({});
    setAuthError('');

    // ── Admin shortcut ──
    if (formData.email.trim().toLowerCase() === 'remyadmin@remy.app' && formData.password === 'remyadmin') {
      adminLogin('remyadmin', 'remyadmin');
      window.location.href = '/admin/dashboard';
      return;
    }

    const { error } = await signIn(formData);
    if (error) {
      setAuthError('Invalid email or password. Please try again.');
      setLoading(false);
    } else {
      showToast(t('common.success'), 'success');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-neutral-50">
      <AnimatedBackground variant="login" />

      <div className="relative z-10 w-full max-w-md mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-2xl p-8 sm:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-5xl font-black tracking-tight text-primary-600">Remy</h1>
            <div className="hidden">
              <svg className="w-7 h-7 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-neutral-900 mt-1">{t('auth.signInTitle')}</h2>
            <p className="text-sm text-neutral-500 mt-1">{t('auth.signInSubtitle')}</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={t('auth.email')}
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              required
              autoComplete="email"
              placeholder="name@example.com"
            />
            <Input
              label={t('auth.password')}
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              required
              autoComplete="current-password"
              placeholder="••••••••"
            />

            {/* Auth error message */}
            {authError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {authError}
              </div>
            )}

            <Button type="submit" variant="primary" size="lg" fullWidth loading={loading} className="mt-2">
              {loading ? t('auth.signingIn') : t('auth.login')}
            </Button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-neutral-600">
            {t('auth.dontHaveAccount')}{' '}
            <Link to={ROUTES.REGISTER} className="font-semibold text-primary-600 hover:text-primary-700">
              {t('auth.signUpHere')}
            </Link>
          </p>
        </div>

        <p className="text-center mt-4 text-white/80 text-sm">
          ✨ Organize, Share & Style
        </p>
      </div>
    </div>
  );
}
