import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { FiCalendar, FiClock, FiCheck, FiX, FiPlus, FiGrid, FiList, FiAlertCircle } from 'react-icons/fi';
import io from 'socket.io-client';

const DoctorDashboard = () => {
  const { token, API_URL, user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('requests'); // 'schedule' | 'generate' | 'requests' | 'slots'
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Slot generation form state
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [intervalMinutes, setIntervalMinutes] = useState('30');
  const [startTimeStr, setStartTimeStr] = useState('09:00');
  const [endTimeStr, setEndTimeStr] = useState('17:00');
  const [genSuccess, setGenSuccess] = useState('');
  const [genError, setGenError] = useState('');
  const [generating, setGenerating] = useState(false);

  // Selected date for Daily Agenda
  const [agendaDate, setAgendaDate] = useState(new Date().toISOString().split('T')[0]);

  // Slots Console State
  const [manageSlotsDate, setManageSlotsDate] = useState(new Date().toISOString().split('T')[0]);
  const [manageSlots, setManageSlots] = useState([]);
  const [loadingManageSlots, setLoadingManageSlots] = useState(false);

  // Reschedule Modal state
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleApp, setRescheduleApp] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState(new Date().toISOString().split('T')[0]);
  const [rescheduleSlots, setRescheduleSlots] = useState([]);
  const [selectedRescheduleSlotId, setSelectedRescheduleSlotId] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduleLoadingSlots, setRescheduleLoadingSlots] = useState(false);
  const [submittingReschedule, setSubmittingReschedule] = useState(false);
  const [rescheduleError, setRescheduleError] = useState('');

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/appointments/doctor`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.appointments || []);
      }
    } catch (error) {
      console.error('Failed to fetch doctor appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchManageSlots = async () => {
    if (!user?.doctorProfile?._id || !manageSlotsDate) return;
    setLoadingManageSlots(true);
    try {
      const res = await fetch(`${API_URL}/slots/available?doctorId=${user.doctorProfile._id}&date=${manageSlotsDate}`);
      if (res.ok) {
        const data = await res.json();
        setManageSlots(data.slots || []);
      }
    } catch (err) {
      console.error('Error fetching manage slots:', err);
    } finally {
      setLoadingManageSlots(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [token, API_URL]);

  useEffect(() => {
    if (activeTab === 'slots') {
      fetchManageSlots();
    }
  }, [manageSlotsDate, activeTab]);

  useEffect(() => {
    const socket = io('http://localhost:5000');

    socket.on('appointments-changed', () => {
      console.log('[Socket] Appointments changed event received. Re-fetching dashboard logs...');
      fetchAppointments();
    });

    socket.on('slots-changed', () => {
      console.log('[Socket] Slots changed event received. Syncing dashboard slots view...');
      fetchAppointments();
      fetchManageSlots();
    });

    return () => {
      socket.disconnect();
    };
  }, [token, API_URL, manageSlotsDate, activeTab]);

  // Fetch Slots for Reschedule
  const fetchRescheduleSlots = async () => {
    if (!user?.doctorProfile?._id || !rescheduleDate) return;
    setRescheduleLoadingSlots(true);
    try {
      const res = await fetch(`${API_URL}/slots/available?doctorId=${user.doctorProfile._id}&date=${rescheduleDate}`);
      if (res.ok) {
        const data = await res.json();
        const avail = (data.slots || []).filter(s => s.status === 'available');
        setRescheduleSlots(avail);
      }
    } catch (err) {
      console.error('Error fetching reschedule slots:', err);
    } finally {
      setRescheduleLoadingSlots(false);
    }
  };

  useEffect(() => {
    if (showRescheduleModal) {
      fetchRescheduleSlots();
    }
  }, [rescheduleDate, showRescheduleModal]);

  const handleOpenReschedule = (app) => {
    setRescheduleApp(app);
    setSelectedRescheduleSlotId('');
    setRescheduleReason('');
    setRescheduleError('');
    setShowRescheduleModal(true);
  };

  const handleConfirmReschedule = async () => {
    if (!rescheduleApp || !selectedRescheduleSlotId) return;
    setSubmittingReschedule(true);
    setRescheduleError('');

    try {
      const res = await fetch(`${API_URL}/appointments/${rescheduleApp._id}/reschedule`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          newSlotId: selectedRescheduleSlotId,
          reason: rescheduleReason
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to reschedule');
      }

      setShowRescheduleModal(false);
      fetchAppointments();
    } catch (err) {
      setRescheduleError(err.message);
    } finally {
      setSubmittingReschedule(false);
    }
  };

  const handleToggleSlotAvailability = async (slotId) => {
    try {
      const res = await fetch(`${API_URL}/slots/${slotId}/toggle`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        fetchManageSlots();
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to toggle slot status');
      }
    } catch (err) {
      console.error('Error toggling slot status:', err);
    }
  };

  const handleDeleteSlot = async (slotId) => {
    if (!window.confirm('Are you sure you want to delete this availability slot?')) return;
    try {
      const res = await fetch(`${API_URL}/slots/${slotId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        fetchManageSlots();
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to delete slot');
      }
    } catch (err) {
      console.error('Error deleting slot:', err);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    setActionLoadingId(id);
    try {
      const res = await fetch(`${API_URL}/appointments/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        await fetchAppointments();
      } else {
        const data = await res.json();
        alert(data.message || `Failed to update status to ${status}`);
      }
    } catch (error) {
      console.error('Error updating appointment:', error);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleGenerateSlots = async (e) => {
    e.preventDefault();
    setGenError('');
    setGenSuccess('');
    setGenerating(true);

    try {
      const res = await fetch(`${API_URL}/slots/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          startDate,
          endDate,
          intervalMinutes: parseInt(intervalMinutes, 10),
          startTimeStr,
          endTimeStr
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to generate slots');
      }

      setGenSuccess(`Successfully generated ${data.count} new available slots!`);
    } catch (error) {
      setGenError(error.message);
    } finally {
      setGenerating(false);
    }
  };

  // Helper date/time formatters
  const formatDate = (isoString) => {
    return new Date(isoString).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (isoString) => {
    return new Date(isoString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Computed metrics
  const pendingCount = appointments.filter(a => a.status === 'pending').length;
  const approvedTodayCount = appointments.filter(a => {
    if (a.status !== 'approved' || !a.slot) return false;
    const slotDate = new Date(a.slot.startTime).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    return slotDate === today;
  }).length;

  // Filter approved appointments for a specific agendaDate
  const agendaAppointments = appointments.filter(a => {
    if (a.status !== 'approved' || !a.slot) return false;
    const slotDate = new Date(a.slot.startTime).toISOString().split('T')[0];
    return slotDate === agendaDate;
  }).sort((a, b) => new Date(a.slot.startTime) - new Date(b.slot.startTime));

  const pendingAppointments = appointments.filter(a => a.status === 'pending');

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 bg-zinc-950 min-h-[calc(100vh-4rem)]">
      {/* Title */}
      <div className="border-b border-zinc-900 pb-6 mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold leading-7 text-zinc-100 tracking-tight">
            Clinician Console
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Welcome back, {user?.doctorProfile?.name || user?.email}. Manage your clinic workspace.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
        <div className="overflow-hidden rounded-lg border border-zinc-900 bg-zinc-900/10 p-5">
          <dt className="truncate text-xs font-mono uppercase tracking-wider text-zinc-500">
            Pending Approval Requests
          </dt>
          <dd className="mt-2 text-3xl font-semibold tracking-tight text-zinc-150">
            {pendingCount}
          </dd>
        </div>
        <div className="overflow-hidden rounded-lg border border-zinc-900 bg-zinc-900/10 p-5">
          <dt className="truncate text-xs font-mono uppercase tracking-wider text-zinc-500">
            Confirmed Visits Today
          </dt>
          <dd className="mt-2 text-3xl font-semibold tracking-tight text-zinc-150">
            {approvedTodayCount}
          </dd>
        </div>
        <div className="overflow-hidden rounded-lg border border-zinc-900 bg-zinc-900/10 p-5">
          <dt className="truncate text-xs font-mono uppercase tracking-wider text-zinc-500">
            Practice Specialty
          </dt>
          <dd className="mt-2 text-lg font-semibold tracking-tight text-zinc-300">
            {user?.doctorProfile?.specialization || 'Clinical Care'}
          </dd>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-zinc-900 mb-6">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex items-center space-x-2 border-b-2 py-4 px-1 text-sm font-semibold transition-all ${
              activeTab === 'requests'
                ? 'border-zinc-100 text-zinc-100'
                : 'border-transparent text-zinc-500 hover:border-zinc-800 hover:text-zinc-300'
            }`}
          >
            <FiList className="h-4 w-4" />
            <span>Booking Requests ({pendingAppointments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center space-x-2 border-b-2 py-4 px-1 text-sm font-semibold transition-all ${
              activeTab === 'schedule'
                ? 'border-zinc-100 text-zinc-100'
                : 'border-transparent text-zinc-500 hover:border-zinc-800 hover:text-zinc-300'
            }`}
          >
            <FiCalendar className="h-4 w-4" />
            <span>Daily Agenda</span>
          </button>

          <button
            onClick={() => setActiveTab('generate')}
            className={`flex items-center space-x-2 border-b-2 py-4 px-1 text-sm font-semibold transition-all ${
              activeTab === 'generate'
                ? 'border-zinc-100 text-zinc-100'
                : 'border-transparent text-zinc-500 hover:border-zinc-800 hover:text-zinc-300'
            }`}
          >
            <FiPlus className="h-4 w-4" />
            <span>Generate Time Slots</span>
          </button>

          <button
            onClick={() => setActiveTab('slots')}
            className={`flex items-center space-x-2 border-b-2 py-4 px-1 text-sm font-semibold transition-all ${
              activeTab === 'slots'
                ? 'border-zinc-100 text-zinc-100'
                : 'border-transparent text-zinc-500 hover:border-zinc-800 hover:text-zinc-300'
            }`}
          >
            <FiGrid className="h-4 w-4" />
            <span>Manage Slots</span>
          </button>
        </nav>
      </div>

      {/* Loading state */}
      {loading && activeTab !== 'generate' && activeTab !== 'slots' && !showRescheduleModal ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-16 border border-zinc-900 bg-zinc-900/10 rounded-lg"></div>
          <div className="h-16 border border-zinc-900 bg-zinc-900/10 rounded-lg"></div>
        </div>
      ) : (
        <div className="mt-4">
          {/* Tab 1: Requests */}
          {activeTab === 'requests' && (
            <div>
              {pendingAppointments.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-zinc-900 rounded-lg">
                  <FiCheck className="mx-auto h-12 w-12 text-zinc-700" />
                  <h3 className="mt-4 text-base font-bold text-zinc-300">All caught up!</h3>
                  <p className="mt-1 text-sm text-zinc-500">There are no pending booking approvals.</p>
                </div>
              ) : (
                <div className="overflow-hidden border border-zinc-900 rounded-lg bg-zinc-900/5">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-zinc-900 text-left text-sm">
                      <thead className="bg-zinc-900/40 text-xs font-mono uppercase tracking-wider text-zinc-500">
                        <tr>
                          <th scope="col" className="px-6 py-3.5">Patient Email</th>
                          <th scope="col" className="px-6 py-3.5">Requested Date</th>
                          <th scope="col" className="px-6 py-3.5">Time Interval</th>
                          <th scope="col" className="px-6 py-3.5">Reason / Symptoms</th>
                          <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900 bg-transparent text-zinc-300">
                        {pendingAppointments.map((app) => (
                          <tr key={app._id} className="hover:bg-zinc-900/20 transition-colors">
                            <td className="whitespace-nowrap px-6 py-4 font-mono text-zinc-100">
                              {app.patient?.email}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4">
                              {app.slot ? formatDate(app.slot.startTime) : 'N/A'}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 font-mono text-zinc-200">
                              {app.slot ? formatTime(app.slot.startTime) : 'N/A'}
                            </td>
                            <td className="px-6 py-4 text-zinc-400 max-w-xs truncate" title={app.reason}>
                              {app.reason || <span className="text-zinc-750 italic">No note provided</span>}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-right">
                              <div className="flex justify-end items-center space-x-2">
                                <button
                                  onClick={() => handleUpdateStatus(app._id, 'approved')}
                                  disabled={actionLoadingId === app._id}
                                  className="inline-flex items-center space-x-1 rounded bg-green-500/10 border border-green-500/25 px-2.5 py-1 text-xs font-semibold text-green-400 hover:bg-green-500 hover:text-zinc-950 transition-all duration-200 cursor-pointer"
                                >
                                  <FiCheck className="h-3 w-3" />
                                  <span>Approve</span>
                                </button>
                                <button
                                  onClick={() => handleUpdateStatus(app._id, 'rejected')}
                                  disabled={actionLoadingId === app._id}
                                  className="inline-flex items-center space-x-1 rounded bg-red-500/10 border border-red-500/25 px-2.5 py-1 text-xs font-semibold text-red-400 hover:bg-red-500 hover:text-zinc-950 transition-all duration-200 cursor-pointer"
                                >
                                  <FiX className="h-3 w-3" />
                                  <span>Reject</span>
                                </button>
                                <button
                                  onClick={() => handleOpenReschedule(app)}
                                  className="inline-flex items-center rounded border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-100 hover:text-zinc-950 px-2.5 py-1 text-xs font-semibold text-zinc-400 transition-all duration-250 cursor-pointer"
                                >
                                  <span>Reschedule</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Agenda */}
          {activeTab === 'schedule' && (
            <div className="space-y-6">
              <div className="border border-zinc-900 bg-zinc-900/10 p-5 rounded-lg max-w-sm">
                <label htmlFor="agenda-date" className="text-xs font-mono uppercase tracking-wider text-zinc-500 block mb-2">
                  Select Agenda Date
                </label>
                <input
                  type="date"
                  id="agenda-date"
                  value={agendaDate}
                  onChange={(e) => setAgendaDate(e.target.value)}
                  className="block w-full rounded-md border border-zinc-800 bg-zinc-900/40 py-2 px-3 text-sm text-zinc-150 focus:border-zinc-300 focus:outline-none transition-all font-mono"
                />
              </div>

              {agendaAppointments.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-zinc-900 rounded-lg">
                  <FiCalendar className="mx-auto h-12 w-12 text-zinc-700" />
                  <h3 className="mt-4 text-base font-bold text-zinc-350">No confirmed appointments</h3>
                  <p className="mt-1 text-sm text-zinc-500 font-mono">
                    No schedules locked for {new Date(agendaDate).toLocaleDateString([], { dateStyle: 'medium' })}.
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden border border-zinc-900 rounded-lg bg-zinc-900/5">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-zinc-900 text-left text-sm">
                      <thead className="bg-zinc-900/40 text-xs font-mono uppercase tracking-wider text-zinc-500">
                        <tr>
                          <th scope="col" className="px-6 py-3.5">Time Slot</th>
                          <th scope="col" className="px-6 py-3.5">Patient Email</th>
                          <th scope="col" className="px-6 py-3.5">Symptoms / Visit Reason</th>
                          <th scope="col" className="px-6 py-3.5">Status</th>
                          <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900 bg-transparent text-zinc-300">
                        {agendaAppointments.map((app) => (
                          <tr key={app._id} className="hover:bg-zinc-900/20 transition-colors">
                            <td className="whitespace-nowrap px-6 py-4 font-mono font-semibold text-zinc-100">
                              {formatTime(app.slot.startTime)}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 font-mono text-zinc-300">
                              {app.patient?.email}
                            </td>
                            <td className="px-6 py-4 text-zinc-400 max-w-xs truncate" title={app.reason}>
                              {app.reason || <span className="text-zinc-800 italic">No notes</span>}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4">
                              <span className="inline-flex items-center space-x-1 rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-semibold text-green-400 border border-green-500/20">
                                <FiCheck className="h-3 w-3" />
                                <span>Confirmed</span>
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-right">
                              <button
                                onClick={() => handleOpenReschedule(app)}
                                className="inline-flex items-center rounded border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-100 hover:text-zinc-950 px-2.5 py-1 text-xs font-semibold text-zinc-400 transition-all duration-250 cursor-pointer"
                              >
                                <span>Reschedule</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Slot Generation Form */}
          {activeTab === 'generate' && (
            <div className="max-w-2xl border border-zinc-900 bg-zinc-900/10 p-6 rounded-lg">
              <h3 className="text-lg font-bold text-zinc-200 mb-1">Bulk Availability Generator</h3>
              <p className="text-sm text-zinc-500 mb-6">Create empty booking slot windows for your clinic calendar.</p>

              {genSuccess && (
                <div className="flex items-center space-x-2 rounded-md border border-green-900/30 bg-green-950/20 p-3 text-sm text-green-400 mb-6">
                  <FiCheck className="h-5 w-5 shrink-0" />
                  <span>{genSuccess}</span>
                </div>
              )}

              {genError && (
                <div className="flex items-center space-x-2 rounded-md border border-red-900/30 bg-red-950/20 p-3 text-sm text-red-400 mb-6">
                  <FiAlertCircle className="h-5 w-5 shrink-0" />
                  <span>{genError}</span>
                </div>
              )}

              <form onSubmit={handleGenerateSlots} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="gen-start-date" className="text-xs font-mono uppercase tracking-wider text-zinc-400 block mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      id="gen-start-date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="block w-full rounded-md border border-zinc-800 bg-zinc-900/40 py-2 px-3 text-sm text-zinc-150 focus:border-zinc-300 focus:outline-none transition-all font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="gen-end-date" className="text-xs font-mono uppercase tracking-wider text-zinc-400 block mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      id="gen-end-date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="block w-full rounded-md border border-zinc-800 bg-zinc-900/40 py-2 px-3 text-sm text-zinc-150 focus:border-zinc-300 focus:outline-none transition-all font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="gen-start-time" className="text-xs font-mono uppercase tracking-wider text-zinc-400 block mb-1">
                      Daily Start Hour
                    </label>
                    <input
                      type="time"
                      id="gen-start-time"
                      value={startTimeStr}
                      onChange={(e) => setStartTimeStr(e.target.value)}
                      className="block w-full rounded-md border border-zinc-800 bg-zinc-900/40 py-2 px-3 text-sm text-zinc-150 focus:border-zinc-300 focus:outline-none transition-all font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="gen-end-time" className="text-xs font-mono uppercase tracking-wider text-zinc-400 block mb-1">
                      Daily End Hour
                    </label>
                    <input
                      type="time"
                      id="gen-end-time"
                      value={endTimeStr}
                      onChange={(e) => setEndTimeStr(e.target.value)}
                      className="block w-full rounded-md border border-zinc-800 bg-zinc-900/40 py-2 px-3 text-sm text-zinc-150 focus:border-zinc-300 focus:outline-none transition-all font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="gen-interval" className="text-xs font-mono uppercase tracking-wider text-zinc-400 block mb-1">
                      Slot Duration
                    </label>
                    <select
                      id="gen-interval"
                      value={intervalMinutes}
                      onChange={(e) => setIntervalMinutes(e.target.value)}
                      className="block w-full rounded-md border border-zinc-800 bg-zinc-900/40 py-2 px-3 text-sm text-zinc-150 focus:border-zinc-300 focus:outline-none transition-all"
                    >
                      <option value="15">15 minutes</option>
                      <option value="30">30 minutes</option>
                      <option value="45">45 minutes</option>
                      <option value="60">60 minutes</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-900">
                  <button
                    type="submit"
                    disabled={generating}
                    className="inline-flex justify-center items-center space-x-1.5 rounded-md bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600 transition-all cursor-pointer"
                  >
                    {generating ? (
                      <div className="w-5 h-5 border-2 border-zinc-850 border-t-zinc-400 rounded-full animate-spin" />
                    ) : (
                      <>
                        <FiPlus />
                        <span>Generate Active Slots</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tab 4: Slots Console */}
          {activeTab === 'slots' && (
            <div className="space-y-6">
              <div className="border border-zinc-900 bg-zinc-900/10 p-5 rounded-lg max-w-sm animate-fadeIn">
                <label htmlFor="manage-slots-date" className="text-xs font-mono uppercase tracking-wider text-zinc-500 block mb-2">
                  Select Calendar Date
                </label>
                <input
                  type="date"
                  id="manage-slots-date"
                  value={manageSlotsDate}
                  onChange={(e) => setManageSlotsDate(e.target.value)}
                  className="block w-full rounded-md border border-zinc-800 bg-zinc-900/40 py-2 px-3 text-sm text-zinc-150 focus:border-zinc-300 focus:outline-none transition-all font-mono"
                />
              </div>

              {loadingManageSlots ? (
                <div className="space-y-4 animate-pulse">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="h-14 border border-zinc-900 bg-zinc-900/10 rounded-lg animate-pulse"></div>
                  ))}
                </div>
              ) : manageSlots.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-zinc-900 rounded-lg">
                  <FiCalendar className="mx-auto h-12 w-12 text-zinc-700" />
                  <h3 className="mt-4 text-base font-bold text-zinc-350">No slots generated</h3>
                  <p className="mt-1 text-sm text-zinc-500 font-mono">
                    No slots exist for {new Date(manageSlotsDate).toLocaleDateString([], { dateStyle: 'medium' })}.
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden border border-zinc-900 rounded-lg bg-zinc-900/5">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-zinc-900 text-left text-sm">
                      <thead className="bg-zinc-900/40 text-xs font-mono uppercase tracking-wider text-zinc-500">
                        <tr>
                          <th scope="col" className="px-6 py-3.5">Time Interval</th>
                          <th scope="col" className="px-6 py-3.5">Current Status</th>
                          <th scope="col" className="px-6 py-3.5 text-right">Console Controls</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900 bg-transparent text-zinc-300">
                        {manageSlots.map((slot) => {
                          const isBooked = slot.status === 'booked';
                          const isUnavailable = slot.status === 'unavailable';
                          return (
                            <tr key={slot._id} className="hover:bg-zinc-900/20 transition-colors">
                              <td className="whitespace-nowrap px-6 py-4 font-mono font-semibold text-zinc-100">
                                {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                              </td>
                              <td className="whitespace-nowrap px-6 py-4">
                                {isBooked ? (
                                  <span className="inline-flex items-center space-x-1 rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-semibold text-green-400 border border-green-500/20">
                                    <span>Booked</span>
                                  </span>
                                ) : isUnavailable ? (
                                  <span className="inline-flex items-center space-x-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold text-red-400 border border-red-500/20">
                                    <span>Unavailable</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center space-x-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-400 border border-blue-500/20">
                                    <span>Available</span>
                                  </span>
                                )}
                              </td>
                              <td className="whitespace-nowrap px-6 py-4 text-right">
                                <div className="flex justify-end space-x-3">
                                  <button
                                    onClick={() => handleToggleSlotAvailability(slot._id)}
                                    disabled={isBooked}
                                    className={`inline-flex items-center rounded px-2.5 py-1 text-xs font-semibold transition-all duration-200 ${
                                      isBooked
                                        ? 'bg-zinc-900 text-zinc-700 cursor-not-allowed border border-zinc-900'
                                        : isUnavailable
                                          ? 'bg-blue-500/10 border border-blue-500/25 text-blue-450 hover:bg-blue-500 hover:text-zinc-950 cursor-pointer'
                                          : 'bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500 hover:text-zinc-950 cursor-pointer'
                                    }`}
                                  >
                                    {isUnavailable ? 'Mark Available' : 'Mark Unavailable'}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSlot(slot._id)}
                                    disabled={isBooked}
                                    className={`inline-flex items-center rounded px-2.5 py-1 text-xs font-semibold transition-all duration-200 ${
                                      isBooked
                                        ? 'bg-zinc-900 text-zinc-700 cursor-not-allowed border border-zinc-900'
                                        : 'bg-red-950/20 border border-red-900/20 hover:bg-red-900 hover:text-zinc-950 text-red-400 cursor-pointer'
                                    }`}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && rescheduleApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md border border-zinc-800 bg-zinc-900 p-6 rounded-lg shadow-xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-zinc-100">Reschedule Appointment</h3>
              <p className="text-sm text-zinc-400 mt-1">Select a new date and time slot for this patient.</p>
            </div>

            {rescheduleError && (
              <div className="flex items-start space-x-2 rounded-md border border-red-900/30 bg-red-950/20 p-3 text-sm text-red-400">
                <FiAlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <span>{rescheduleError}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 block mb-1">
                  Patient
                </label>
                <div className="text-sm text-zinc-200 font-semibold font-mono">{rescheduleApp.patient?.email}</div>
              </div>

              <div>
                <label htmlFor="resched-date" className="text-xs font-mono uppercase tracking-wider text-zinc-400 block mb-1">
                  Choose New Date
                </label>
                <input
                  type="date"
                  id="resched-date"
                  value={rescheduleDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="block w-full rounded-md border border-zinc-800 bg-zinc-900/40 py-2 px-3 text-sm text-zinc-150 focus:border-zinc-300 focus:outline-none transition-all font-mono"
                />
              </div>

              <div>
                <label htmlFor="resched-slot" className="text-xs font-mono uppercase tracking-wider text-zinc-400 block mb-1">
                  Choose New Time Slot
                </label>
                {rescheduleLoadingSlots ? (
                  <div className="h-10 bg-zinc-800 animate-pulse rounded"></div>
                ) : rescheduleSlots.length === 0 ? (
                  <p className="text-xs text-amber-500 italic">No available slots on this date.</p>
                ) : (
                  <select
                    id="resched-slot"
                    value={selectedRescheduleSlotId}
                    onChange={(e) => setSelectedRescheduleSlotId(e.target.value)}
                    className="block w-full rounded-md border border-zinc-800 bg-zinc-900/40 py-2 px-3 text-sm text-zinc-300 focus:border-zinc-300 focus:outline-none transition-all font-mono"
                  >
                    <option value="">-- Select Slot --</option>
                    {rescheduleSlots.map((s) => (
                      <option key={s._id} value={s._id}>
                        {formatTime(s.startTime)}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label htmlFor="resched-reason" className="text-xs font-mono uppercase tracking-wider text-zinc-400 block mb-1">
                  Reason for Rescheduling
                </label>
                <textarea
                  id="resched-reason"
                  rows="3"
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="e.g. Schedule conflict, emergency clinical delay..."
                  className="block w-full rounded-md border border-zinc-800 bg-zinc-900/40 py-2 px-3 text-sm text-zinc-100 placeholder-zinc-550 focus:border-zinc-300 focus:outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowRescheduleModal(false)}
                className="flex-1 rounded-md border border-zinc-800 bg-transparent py-2 text-sm font-semibold text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReschedule}
                disabled={submittingReschedule || !selectedRescheduleSlotId || !rescheduleReason}
                className="flex-1 flex justify-center items-center space-x-1 rounded-md bg-zinc-100 py-2 text-sm font-semibold text-zinc-950 hover:bg-zinc-200 disabled:bg-zinc-850 disabled:text-zinc-600 transition-all cursor-pointer"
              >
                {submittingReschedule ? (
                  <div className="w-5 h-5 border-2 border-zinc-850 border-t-zinc-400 rounded-full animate-spin" />
                ) : (
                  <span>Reschedule Visit</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDashboard;
