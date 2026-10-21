/**
 * Register Page
 * Create new account with email, password, display name, and gender
 */

import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useT } from '@/i18n';
import { Button, Input, Select, AnimatedBackground } from '@/components/common';
import { validateSignUpForm } from '@/utils/validation';
import { getErrorMessage } from '@/utils/errorHandling';
import { ROUTES } from '@/utils/constants';
import type { Gender } from '@/types';

export function Register() {
  const t = useT();
  const { signUp } = useAuth();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    gender: '' as Gender | '',
    age: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validation = validateSignUpForm(formData as any);
    if (!validation.valid) { setErrors(validation.errors); return; }
    setLoading(true);
    setErrors({});
    const { error } = await signUp({
      email: formData.email,
      password: formData.password,
      displayName: formData.displayName,
      gender: formData.gender as Gender,
      age: parseInt(formData.age) || 0,
    });
    if (error) {
      showToast(getErrorMessage(error), 'error');
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-neutral-900 mt-1">{t('auth.signUpTitle')}</h2>
            <p className="text-sm text-neutral-500 mt-1">{t('auth.signUpSubtitle')}</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={t('auth.displayName')}
              type="text"
              name="displayName"
              value={formData.displayName}
              onChange={handleChange}
              error={errors.displayName}
              required
              autoComplete="name"
              placeholder="Your Name"
            />

            <Select
              label={t('auth.gender')}
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              error={errors.gender}
              required
            >
              <option value="">{t('auth.gender')}</option>
              <option value="female">{t('auth.female')}</option>
              <option value="male">{t('auth.male')}</option>
            </Select>

            <Input
              label={t('auth.age')}
              type="number"
              name="age"
              value={formData.age}
              onChange={handleChange}
              error={errors.age}
              required
              min="1"
              max="120"
              placeholder="25"
            />

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
              autoComplete="new-password"
              placeholder="••••••••"
              helperText={t('validation.passwordTooShort')}
            />

            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-800 flex gap-2">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span>Gender determines your clothing categories and <strong>cannot be changed</strong> after registration.</span>
            </div>

            <Button type="submit" variant="primary" size="lg" fullWidth loading={loading} className="mt-2">
              {loading ? t('auth.signingUp') : t('auth.register')}
            </Button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-neutral-600">
            {t('auth.alreadyHaveAccount')}{' '}
            <Link to={ROUTES.LOGIN} className="font-semibold text-primary-600 hover:text-primary-700">
              {t('auth.signInHere')}
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
