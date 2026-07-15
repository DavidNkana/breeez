'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const showToast = useToast((s) => s.show);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      showToast('Password must be at least 8 characters', 'warning');
      return;
    }
    setLoading(true);
    const { error } = await getSupabase().auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/account`
      }
    });
    setLoading(false);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    setVerificationSent(true);
  }

  if (verificationSent) {
    return (
      <div className="rounded-md border border-brand-200 bg-brand-50 p-4 text-sm text-brand-800">
        We sent a verification email to <strong>{email}</strong>. Click the link in the email to confirm your account, then sign in.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input label="Full name" required value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
      <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      <Input label="Password (min 8 characters)" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
      <Button type="submit" loading={loading} fullWidth size="lg">Create account</Button>
      <p className="text-center text-sm text-brand-600">
        Already have an account? <Link href="/auth/login" className="text-accent-700 hover:underline">Sign in</Link>
      </p>
    </form>
  );
}