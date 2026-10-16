/**
 * Admin Login Page
 * Hardcoded credentials: remyadmin / remyadmin
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { AnimatedBackground, Button, Input, Card } from '@/components/common';

export function AdminLogin() {
  const navigate = useNavigate();
  const { login } = useAdminAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const ok = login(username, password);
    setLoading(false);

    if (ok) {
      navigate('/admin/dashboard', { replace: true });
    } else {
      setError('Invalid email or password');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-900">
      <AnimatedBackground variant="stylist" />

      <div className="relative z-10 w-full max-w-md px-6">
        <Card className="p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <img
              src="/rwm.jpeg"
              alt="Remy mark"
              className="mx-auto mb-4 h-20 w-20 rounded-2xl object-cover shadow-lg"
            />
            <img
              src="/remy-transparent.png"
              alt="Remy"
              className="mx-auto mb-4 w-64 max-w-full scale-110 object-contain"
            />
            <h1 className="text-2xl font-bold text-neutral-900">Admin Panel</h1>
            <p className="text-neutral-500 text-sm mt-1">Management</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Email</label>
              <Input
                type="email"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="remyadmin@remy.app"
                disabled={loading}
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Password</label>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" fullWidth size="lg" disabled={loading || !username || !password}>
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
