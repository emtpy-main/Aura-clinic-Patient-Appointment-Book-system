import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { FiSearch, FiBriefcase, FiArrowRight } from 'react-icons/fi';

const Doctors = () => {
  const { API_URL } = useContext(AuthContext);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [specFilter, setSpecFilter] = useState('');

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await fetch(`${API_URL}/doctors`);
        if (res.ok) {
          const data = await res.json();
          setDoctors(data.doctors || []);
        }
      } catch (error) {
        console.error('Failed to fetch doctors:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDoctors();
  }, [API_URL]);

  const filteredDoctors = doctors.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSpec = specFilter === '' || doc.specialization.toLowerCase() === specFilter.toLowerCase();
    return matchesSearch && matchesSpec;
  });

  // Extract unique specializations
  const specializations = [...new Set(doctors.map(d => d.specialization))];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 bg-zinc-950 min-h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between border-b border-zinc-900 pb-6 mb-8">
        <div className="min-w-0 flex-1">
          <h2 className="text-3xl font-bold leading-7 text-zinc-100 sm:truncate sm:text-4xl tracking-tight">
            Medical Professionals
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Browse qualified clinicians and secure your medical consultation slot.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
            <FiSearch className="h-4 w-4" />
          </div>
          <input
            type="text"
            placeholder="Search doctors by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full rounded-md border border-zinc-800 bg-zinc-900/20 py-2 pl-10 pr-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-zinc-300 focus:bg-zinc-900/60 focus:outline-none focus:ring-1 focus:ring-zinc-300 transition-all"
          />
        </div>

        <div className="sm:w-64">
          <select
            value={specFilter}
            onChange={(e) => setSpecFilter(e.target.value)}
            className="block w-full rounded-md border border-zinc-800 bg-zinc-900/20 py-2 px-3 text-sm text-zinc-300 focus:border-zinc-300 focus:bg-zinc-900/60 focus:outline-none focus:ring-1 focus:ring-zinc-300 transition-all"
          >
            <option value="">All Specializations</option>
            {specializations.map((spec) => (
              <option key={spec} value={spec}>{spec}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Doctor Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="border border-zinc-900 bg-zinc-900/10 p-6 rounded-lg space-y-4 animate-pulse">
              <div className="h-6 w-1/2 bg-zinc-800 rounded"></div>
              <div className="h-4 w-1/3 bg-zinc-800 rounded"></div>
              <div className="h-16 w-full bg-zinc-800 rounded"></div>
              <div className="h-10 w-full bg-zinc-800 rounded"></div>
            </div>
          ))}
        </div>
      ) : filteredDoctors.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-zinc-800 rounded-lg">
          <p className="text-zinc-500">No doctors match your active search terms.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDoctors.map((doctor) => (
            <div
              key={doctor._id}
              className="group relative flex flex-col justify-between border border-zinc-900 bg-zinc-900/10 p-6 rounded-lg hover:border-zinc-700 transition-all duration-300"
            >
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <FiBriefcase className="h-4 w-4 text-zinc-500" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono">
                    {doctor.specialization}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-zinc-100 group-hover:text-white transition-colors">
                  {doctor.name}
                </h3>
                <p className="text-sm text-zinc-400 line-clamp-3">
                  {doctor.biography || 'No clinic background provided.'}
                </p>
              </div>

              <div className="mt-6 pt-6 border-t border-zinc-900">
                <Link
                  to={`/doctors/${doctor._id}/book`}
                  className="flex w-full items-center justify-center space-x-2 rounded-md bg-zinc-900 border border-zinc-800 py-2.5 text-sm font-medium text-zinc-300 hover:text-zinc-950 hover:bg-zinc-100 transition-all duration-200"
                >
                  <span>Book Consultation</span>
                  <FiArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Doctors;
