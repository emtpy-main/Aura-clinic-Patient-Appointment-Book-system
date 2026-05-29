import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { FiMail, FiLock, FiUser, FiActivity, FiAlignLeft, FiAlertCircle } from 'react-icons/fi';

const Register = () => {
  const { API_URL } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('patient');
  const [name, setName] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [biography, setBiography] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const payload = {
      email,
      password,
      role,
      ...(role === 'doctor' && { name, specialization, biography })
    };

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-zinc-950 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg space-y-8 border border-zinc-900 bg-zinc-900/20 p-8 rounded-xl backdrop-blur-sm">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-zinc-100">
            Create an account
          </h2>
          <p className="mt-2 text-center text-sm text-zinc-400">
            Or{' '}
            <Link to="/login" className="font-medium text-zinc-200 hover:text-zinc-100 underline decoration-zinc-700 underline-offset-4">
              log in with an existing account
            </Link>
          </p>
        </div>

        {error && (
          <div className="flex items-center space-x-2 rounded-md border border-red-900/30 bg-red-950/20 p-3 text-sm text-red-400">
            <FiAlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="rounded-md border border-green-900/30 bg-green-950/20 p-3 text-sm text-green-400 text-center">
            Registration successful! Redirecting to login...
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Role selector chips */}
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 block mb-2">
                I am registering as a
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('patient')}
                  className={`py-2 text-sm font-semibold rounded-md border transition-all ${
                    role === 'patient'
                      ? 'bg-zinc-100 border-zinc-100 text-zinc-950 shadow-sm'
                      : 'border-zinc-800 bg-zinc-900/20 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700'
                  }`}
                >
                  Patient
                </button>
                <button
                  type="button"
                  onClick={() => setRole('doctor')}
                  className={`py-2 text-sm font-semibold rounded-md border transition-all ${
                    role === 'doctor'
                      ? 'bg-zinc-100 border-zinc-100 text-zinc-950 shadow-sm'
                      : 'border-zinc-800 bg-zinc-900/20 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700'
                  }`}
                >
                  Medical Provider
                </button>
              </div>
            </div>

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
                  type="email"
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
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-md border border-zinc-800 bg-zinc-900/40 py-2.5 pl-10 pr-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-zinc-300 focus:bg-zinc-900/80 focus:outline-none focus:ring-1 focus:ring-zinc-300 transition-all duration-200"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Conditional fields for Doctor registration */}
            {role === 'doctor' && (
              <div className="pt-4 border-t border-zinc-900 space-y-4 animate-fadeIn">
                <h3 className="text-sm font-semibold tracking-wider uppercase font-mono text-zinc-300">
                  Professional Credentials
                </h3>

                <div>
                  <label htmlFor="fullName" className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                    Full Professional Name
                  </label>
                  <div className="relative mt-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                      <FiUser className="h-4 w-4" />
                    </div>
                    <input
                      id="fullName"
                      type="text"
                      required={role === 'doctor'}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="block w-full rounded-md border border-zinc-800 bg-zinc-900/40 py-2.5 pl-10 pr-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-zinc-300 focus:bg-zinc-900/80 focus:outline-none focus:ring-1 focus:ring-zinc-300 transition-all duration-200"
                      placeholder="Dr. Jordan Chase, MD"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="specialization" className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                    Medical Specialization
                  </label>
                  <div className="relative mt-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                      <FiActivity className="h-4 w-4" />
                    </div>
                    <input
                      id="specialization"
                      type="text"
                      required={role === 'doctor'}
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      className="block w-full rounded-md border border-zinc-800 bg-zinc-900/40 py-2.5 pl-10 pr-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-zinc-300 focus:bg-zinc-900/80 focus:outline-none focus:ring-1 focus:ring-zinc-300 transition-all duration-200"
                      placeholder="Cardiology, Pediatrics, Dermatology..."
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="biography" className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                    Biography / Background
                  </label>
                  <div className="relative mt-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 pt-3 text-zinc-500">
                      <FiAlignLeft className="h-4 w-4" />
                    </div>
                    <textarea
                      id="biography"
                      rows="3"
                      value={biography}
                      onChange={(e) => setBiography(e.target.value)}
                      className="block w-full rounded-md border border-zinc-800 bg-zinc-900/40 py-2.5 pl-10 pr-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-zinc-300 focus:bg-zinc-900/80 focus:outline-none focus:ring-1 focus:ring-zinc-300 transition-all duration-200"
                      placeholder="Brief bio describing your medical background and practice standards..."
                    />
                  </div>
                </div>
              </div>
            )}
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
                'Register Account'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
