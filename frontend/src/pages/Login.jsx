import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { FiMail, FiLock, FiAlertCircle } from 'react-icons/fi';

const Login = () => {
  const { login, API_URL } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Login failed');
      }

      login(data.token, data.user);
      
      // Redirect based on role
      if (data.user.role === 'doctor' || data.user.role === 'admin') {
        navigate('/dashboard');
      } else {
        navigate('/doctors');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-zinc-950 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 border border-zinc-900 bg-zinc-900/20 p-8 rounded-xl backdrop-blur-sm">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-zinc-100">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-zinc-400">
            Or{' '}
            <Link to="/register" className="font-medium text-zinc-200 hover:text-zinc-100 underline decoration-zinc-700 underline-offset-4">
              register a new patient / provider account
            </Link>
          </p>
        </div>

        {error && (
          <div className="flex items-center space-x-2 rounded-md border border-red-900/30 bg-red-950/20 p-3 text-sm text-red-400">
            <FiAlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email-address" className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                Email Address
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                  <FiMail className="h-4 w-4" />
                </div>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-md border border-zinc-800 bg-zinc-900/40 py-2.5 pl-10 pr-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-zinc-300 focus:bg-zinc-900/80 focus:outline-none focus:ring-1 focus:ring-zinc-300 transition-all duration-200"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                Password
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                  <FiLock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-md border border-zinc-800 bg-zinc-900/40 py-2.5 pl-10 pr-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-zinc-300 focus:bg-zinc-900/80 focus:outline-none focus:ring-1 focus:ring-zinc-300 transition-all duration-200"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-md bg-zinc-100 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 disabled:bg-zinc-800 disabled:text-zinc-600 transition-all"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-zinc-850 border-t-zinc-400 rounded-full animate-spin" />
              ) : (
                'Sign In'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
