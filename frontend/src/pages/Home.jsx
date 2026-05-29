import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { FiActivity, FiArrowRight, FiShield, FiSliders, FiCalendar } from 'react-icons/fi';

const Home = () => {
  const { user } = useContext(AuthContext);

  return (
    <div className="bg-zinc-950 text-zinc-100 min-h-[calc(100vh-4rem)] flex flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl text-center space-y-8">
        {/* Animated Clinic Icon */}
        <div className="inline-flex items-center justify-center p-3 bg-zinc-900 border border-zinc-800 rounded-full animate-pulse">
          <FiActivity className="h-10 w-10 text-zinc-200" />
        </div>

        {/* Hero Copy */}
        <div className="space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl uppercase font-mono">
            AURA CLINICAL WORKFLOWS
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-zinc-400">
            A digital healthcare scheduling node. Seamlessly connect patients with medical specialists, manage clinic capacity, and prevent reservation conflicts.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {user ? (
            user.role === 'patient' ? (
              <>
                <Link
                  to="/doctors"
                  className="inline-flex w-full sm:w-auto items-center justify-center space-x-2 rounded-md bg-zinc-100 px-6 py-3 text-sm font-semibold text-zinc-950 shadow hover:bg-zinc-200 transition-all duration-200"
                >
                  <span>Book Consultation</span>
                  <FiArrowRight />
                </Link>
                <Link
                  to="/appointments"
                  className="inline-flex w-full sm:w-auto items-center justify-center space-x-2 rounded-md border border-zinc-800 bg-transparent px-6 py-3 text-sm font-semibold text-zinc-400 hover:text-zinc-150 hover:border-zinc-700 transition-all duration-200"
                >
                  <span>View Bookings</span>
                </Link>
              </>
            ) : (
              <Link
                to="/dashboard"
                className="inline-flex w-full sm:w-auto items-center justify-center space-x-2 rounded-md bg-zinc-100 px-6 py-3 text-sm font-semibold text-zinc-950 shadow hover:bg-zinc-200 transition-all duration-200"
              >
                <span>Access Doctor Console</span>
                <FiArrowRight />
              </Link>
            )
          ) : (
            <>
              <Link
                to="/login"
                className="inline-flex w-full sm:w-auto items-center justify-center space-x-2 rounded-md bg-zinc-100 px-6 py-3 text-sm font-semibold text-zinc-950 shadow hover:bg-zinc-200 transition-all duration-200"
              >
                <span>Get Started</span>
                <FiArrowRight />
              </Link>
              <Link
                to="/register"
                className="inline-flex w-full sm:w-auto items-center justify-center space-x-2 rounded-md border border-zinc-800 bg-transparent px-6 py-3 text-sm font-semibold text-zinc-400 hover:text-zinc-150 hover:border-zinc-700 transition-all duration-200"
              >
                <span>Register Provider/Patient</span>
              </Link>
            </>
          )}
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 border-t border-zinc-900 mt-12 text-left font-mono">
          <div className="p-5 border border-zinc-900 rounded-lg space-y-2 bg-zinc-900/10">
            <FiShield className="h-6 w-6 text-zinc-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300">Conflict Immunity</h3>
            <p className="text-xs text-zinc-550 leading-relaxed">
              Atomic database locking locks requested slots during transaction execution to prevent double bookings.
            </p>
          </div>

          <div className="p-5 border border-zinc-900 rounded-lg space-y-2 bg-zinc-900/10">
            <FiSliders className="h-6 w-6 text-zinc-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300">RBAC Secure</h3>
            <p className="text-xs text-zinc-550 leading-relaxed">
              Role-Based Access Control filters UI navigation routes and API endpoints for patients, doctors, and admins.
            </p>
          </div>

          <div className="p-5 border border-zinc-900 rounded-lg space-y-2 bg-zinc-900/10">
            <FiCalendar className="h-6 w-6 text-zinc-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300">Modern Layout</h3>
            <p className="text-xs text-zinc-550 leading-relaxed">
              Minimalist monochromatic theme engineered for optimal clarity, contrast, and accessibility.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
