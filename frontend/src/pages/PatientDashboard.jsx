import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { FiCalendar, FiClock, FiCheckCircle, FiXCircle, FiLoader, FiAlertCircle } from 'react-icons/fi';
import io from 'socket.io-client';

const PatientDashboard = () => {
  const { token, API_URL, SOCKET_URL } = useContext(AuthContext);
  const [appointments, setAppointments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [appointmentTab, setAppointmentTab] = useState('future');

  const fetchAppointments = async () => {
    try {
      const res = await fetch(`${API_URL}/appointments/patient`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.appointments || []);
      }
    } catch (error) {
      console.error('Failed to fetch patient appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_URL}/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchAppointments();
    fetchNotifications();
  }, [token, API_URL]);

  // WebSocket Live Updates
  useEffect(() => {
    const socket = io(SOCKET_URL);

    socket.on('notifications-changed', () => {
      console.log('[Socket] Notification change event received. Refreshing list...');
      fetchNotifications();
    });

    socket.on('appointments-changed', () => {
      console.log('[Socket] Appointments updated. Re-fetching bookings...');
      fetchAppointments();
    });

    return () => {
      socket.disconnect();
    };
  }, [token, API_URL]);

  const handleMarkAsRead = async (notifId) => {
    try {
      await fetch(`${API_URL}/notifications/${notifId}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      fetchNotifications();
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleDeleteNotification = async (notifId) => {
    try {
      const res = await fetch(`${API_URL}/notifications/${notifId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.message || 'Failed to delete notification');
      } else {
        fetchNotifications();
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const getOrdinalSuffix = (day) => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1:  return "st";
      case 2:  return "nd";
      case 3:  return "rd";
      default: return "th";
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const day = d.getDate();
    const year = d.getFullYear();
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const month = monthNames[d.getMonth()];
    
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const originalFormat = `${yyyy}-${mm}-${dd}`;
    
    return `${day}${getOrdinalSuffix(day)} ${month} ${year} (${originalFormat})`;
  };

  const formatTime = (isoString) => {
    return new Date(isoString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center space-x-1 rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-semibold text-green-400 border border-green-500/20">
            <FiCheckCircle className="h-3 w-3" />
            <span>Approved</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center space-x-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold text-red-400 border border-red-500/20">
            <FiXCircle className="h-3 w-3" />
            <span>Rejected</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/20">
            <FiLoader className="h-3 w-3 animate-spin" />
            <span>Pending</span>
          </span>
        );
    }
  };

  const now = new Date();
  const futureAppointments = appointments.filter(app => {
    if (!app.slot) return true;
    return new Date(app.slot.startTime) >= now;
  });
  const pastAppointments = appointments.filter(app => {
    if (!app.slot) return false;
    return new Date(app.slot.startTime) < now;
  });

  const sortedFuture = [...futureAppointments].sort((a, b) => {
    if (!a.slot || !b.slot) return 0;
    return new Date(a.slot.startTime) - new Date(b.slot.startTime);
  });

  const sortedPast = [...pastAppointments].sort((a, b) => {
    if (!a.slot || !b.slot) return 0;
    return new Date(b.slot.startTime) - new Date(a.slot.startTime);
  });

  const activeAppointments = appointmentTab === 'future' ? sortedFuture : sortedPast;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 bg-zinc-950 min-h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between border-b border-zinc-900 pb-6 mb-8">
        <div className="min-w-0 flex-1">
          <h2 className="text-3xl font-bold leading-7 text-zinc-100 sm:truncate sm:text-4xl tracking-tight">
            My Appointments
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Keep track of your upcoming consultations and clinical logs.
          </p>
        </div>
        <div className="mt-4 md:mt-0 md:ml-4">
          <Link
            to="/doctors"
            className="inline-flex items-center rounded-md bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-950 shadow-sm hover:bg-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500 transition-all cursor-pointer"
          >
            Book New Appointment
          </Link>
        </div>
      </div>

      {/* Notifications Section */}
      {notifications.length > 0 && (
        <div className="mb-8 border border-zinc-900 bg-zinc-900/10 p-6 rounded-lg space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
            <h3 className="text-lg font-bold text-zinc-200 flex items-center space-x-2">
              <span className="relative flex h-2 w-2 mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span>Alert Notifications</span>
            </h3>
            <span className="text-xs font-mono text-zinc-500">
              {notifications.filter(n => !n.read).length} Unread
            </span>
          </div>

          <div className="space-y-3">
            {notifications.map((notif) => (
              <div
                key={notif._id}
                className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-md border transition-all ${
                  notif.read
                    ? 'border-zinc-900/40 bg-zinc-950/10 opacity-60'
                    : 'border-zinc-800 bg-zinc-900/20'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    {!notif.read && (
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                    )}
                    <p className="text-sm font-medium text-zinc-200 leading-normal">
                      {notif.message}
                    </p>
                  </div>
                  {notif.reason && (
                    <p className="text-xs text-zinc-500 leading-normal font-mono pl-3.5">
                      Reason: <span className="text-zinc-400 italic">"{notif.reason}"</span>
                    </p>
                  )}
                </div>

                <div className="mt-3 sm:mt-0 flex items-center space-x-3 self-end sm:self-auto shrink-0 pl-4">
                  {!notif.read ? (
                    <button
                      onClick={() => handleMarkAsRead(notif._id)}
                      className="px-2.5 py-1.5 text-xs font-semibold rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-all cursor-pointer"
                    >
                      Mark as Read
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDeleteNotification(notif._id)}
                      className="px-2.5 py-1.5 text-xs font-semibold rounded bg-red-950/20 border border-red-900/20 hover:bg-red-900 hover:text-zinc-950 text-red-400 transition-all cursor-pointer"
                      title="Delete Notification"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bookings table/list */}
      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-16 border border-zinc-900 bg-zinc-900/10 rounded-lg"></div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Tabs Selector */}
          <div className="flex border-b border-zinc-900 space-x-6">
            <button
              onClick={() => setAppointmentTab('future')}
              className={`pb-3 text-sm font-semibold tracking-wide border-b-2 transition-all cursor-pointer ${
                appointmentTab === 'future'
                  ? 'border-zinc-100 text-zinc-100 font-bold'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Upcoming Appointments ({sortedFuture.length})
            </button>
            <button
              onClick={() => setAppointmentTab('past')}
              className={`pb-3 text-sm font-semibold tracking-wide border-b-2 transition-all cursor-pointer ${
                appointmentTab === 'past'
                  ? 'border-zinc-100 text-zinc-100 font-bold'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Past Consultations ({sortedPast.length})
            </button>
          </div>

          {activeAppointments.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-zinc-800 rounded-lg max-w-xl mx-auto">
              <FiCalendar className="mx-auto h-12 w-12 text-zinc-600" />
              <h3 className="mt-4 text-lg font-bold text-zinc-350">
                {appointmentTab === 'future' ? 'No upcoming appointments' : 'No past consultations'}
              </h3>
              <p className="mt-1 text-sm text-zinc-500">
                {appointmentTab === 'future' 
                  ? 'Get started by choosing a physician and locking a slot.'
                  : 'Your historical visit logs will appear here.'}
              </p>
              {appointmentTab === 'future' && (
                <div className="mt-6">
                  <Link
                    to="/doctors"
                    className="inline-flex items-center rounded-md bg-zinc-900 border border-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-300 hover:text-zinc-100 hover:border-zinc-700 transition-all"
                  >
                    Find a Doctor
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-hidden border border-zinc-900 rounded-lg bg-zinc-900/5 animate-fadeIn">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-zinc-900 text-left text-sm">
                  <thead className="bg-zinc-900/40 text-xs font-mono uppercase tracking-wider text-zinc-500">
                    <tr>
                      <th scope="col" className="px-6 py-3.5">Doctor</th>
                      <th scope="col" className="px-6 py-3.5">Specialization</th>
                      <th scope="col" className="px-6 py-3.5">Date</th>
                      <th scope="col" className="px-6 py-3.5">Time</th>
                      <th scope="col" className="px-6 py-3.5">Status</th>
                      <th scope="col" className="px-6 py-3.5">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900 bg-transparent text-zinc-300">
                    {activeAppointments.map((appointment) => (
                      <tr key={appointment._id} className="hover:bg-zinc-900/20 transition-colors">
                        <td className="whitespace-nowrap px-6 py-4 font-semibold text-zinc-100">
                          {appointment.doctor ? appointment.doctor.name : 'Unknown Doctor'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-zinc-400">
                          {appointment.doctor ? appointment.doctor.specialization : 'N/A'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 font-mono">
                          {appointment.slot ? formatDate(appointment.slot.startTime) : 'N/A'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 font-mono text-zinc-200">
                          {appointment.slot ? (
                            <div className="flex items-center space-x-1.5">
                              <FiClock className="text-zinc-500 h-3.5 w-3.5" />
                              <span>{formatTime(appointment.slot.startTime)}</span>
                            </div>
                          ) : 'N/A'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          {getStatusBadge(appointment.status)}
                        </td>
                        <td className="px-6 py-4 text-zinc-400 max-w-xs truncate" title={appointment.reason}>
                          {appointment.reason || <span className="text-zinc-700 italic">No notes</span>}
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
    </div>
  );
};

export default PatientDashboard;
