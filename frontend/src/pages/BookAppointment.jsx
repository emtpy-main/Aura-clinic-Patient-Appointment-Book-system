import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { FiCalendar, FiClock, FiAlertCircle, FiArrowLeft, FiCheck } from 'react-icons/fi';
import io from 'socket.io-client';

const BookAppointment = () => {
  const { id } = useParams(); // Doctor ID
  const navigate = useNavigate();
  const { token, API_URL } = useContext(AuthContext);

  const [doctor, setDoctor] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [slots, setSlots] = useState([]);
  const [loadingDoctor, setLoadingDoctor] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  
  // Booking modal and state
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState('');
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [bookingError, setBookingError] = useState('');

  // Fetch Doctor Profile
  useEffect(() => {
    const fetchDoctor = async () => {
      try {
        const res = await fetch(`${API_URL}/doctors`);
        if (res.ok) {
          const data = await res.json();
          const found = data.doctors.find(d => d._id === id);
          setDoctor(found || null);
        }
      } catch (err) {
        console.error('Error fetching doctor details:', err);
      } finally {
        setLoadingDoctor(false);
      }
    };
    fetchDoctor();
  }, [id, API_URL]);

  // Fetch Available Slots for the chosen Date
  const fetchSlots = async () => {
    if (!id || !date) return;
    setLoadingSlots(true);
    try {
      const res = await fetch(`${API_URL}/slots/available?doctorId=${id}&date=${date}`);
      if (res.ok) {
        const data = await res.json();
        setSlots(data.slots || []);
      }
    } catch (err) {
      console.error('Error fetching slots:', err);
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, [id, date, API_URL]);

  // Live Sync with WebSockets
  useEffect(() => {
    const socket = io('http://localhost:5000');

    socket.on('slots-changed', () => {
      console.log('[Socket] Slots changed event received. Syncing view...');
      fetchSlots();
    });

    return () => {
      socket.disconnect();
    };
  }, [id, date, API_URL]);

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
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const handleOpenBooking = (slot) => {
    setSelectedSlot(slot);
    setBookingError('');
    setShowModal(true);
  };

  const handleConfirmBooking = async () => {
    if (!selectedSlot) return;
    setSubmittingBooking(true);
    setBookingError('');

    try {
      const res = await fetch(`${API_URL}/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ slotId: selectedSlot._id, reason })
      });

      const data = await res.json();

      if (res.status === 409) {
        throw new Error('This time slot has just been booked by another patient. Please choose another slot.');
      } else if (!res.ok) {
        throw new Error(data.message || 'Failed to request appointment');
      }

      // Success
      setShowModal(false);
      navigate('/appointments');
    } catch (err) {
      setBookingError(err.message);
      // Refresh slot list to clear invalid selections
      fetchSlots();
    } finally {
      setSubmittingBooking(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  if (loadingDoctor) {
    return (
      <div className="flex min-h-screen bg-zinc-950 items-center justify-center">
        <div className="w-8 h-8 border-4 border-zinc-700 border-t-zinc-150 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="mx-auto max-w-md text-center py-12 bg-zinc-950 min-h-screen flex flex-col justify-center">
        <p className="text-zinc-400 mb-4">Doctor details could not be found.</p>
        <Link to="/doctors" className="text-zinc-200 underline">Return to directory</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 bg-zinc-950 min-h-[calc(100vh-4rem)]">
      <Link to="/doctors" className="inline-flex items-center space-x-2 text-sm text-zinc-400 hover:text-zinc-100 mb-6 group transition-colors">
        <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" />
        <span>Back to Directory</span>
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Doctor Info Card */}
        <div className="border border-zinc-900 bg-zinc-900/10 p-6 rounded-lg h-fit space-y-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
              {doctor.specialization}
            </span>
            <h2 className="text-2xl font-bold text-zinc-100 mt-1">{doctor.name}</h2>
          </div>
          <p className="text-sm text-zinc-400 leading-relaxed">
            {doctor.biography || 'Professional clinical care coordinator.'}
          </p>
        </div>

        {/* Calendar and Slots Selection */}
        <div className="md:col-span-2 space-y-6">
          <div className="border border-zinc-900 bg-zinc-900/10 p-6 rounded-lg">
            <h3 className="text-lg font-bold text-zinc-200 mb-4 flex items-center space-x-2">
              <FiCalendar className="text-zinc-400" />
              <span>Select Date</span>
            </h3>
            <input
              type="date"
              min={todayStr}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="block w-full max-w-xs rounded-md border border-zinc-800 bg-zinc-900/40 py-2.5 px-3 text-zinc-155 focus:border-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-300 transition-all font-mono"
            />
          </div>

          <div className="border border-zinc-900 bg-zinc-900/10 p-6 rounded-lg">
            <h3 className="text-lg font-bold text-zinc-200 mb-4 flex items-center space-x-2">
              <FiClock className="text-zinc-400" />
              <span>Availability Grid</span>
            </h3>

            {loadingSlots ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-pulse">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-10 bg-zinc-800 rounded"></div>
                ))}
              </div>
            ) : slots.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-zinc-800 rounded">
                <p className="text-sm text-zinc-550">No booking slots available for {formatDate(date)}.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {slots.map((slot) => {
                  const isBooked = slot.status === 'booked';
                  const isUnavailable = slot.status === 'unavailable';
                  const isDisabled = isBooked || isUnavailable;
                  return (
                    <button
                      key={slot._id}
                      disabled={isDisabled}
                      onClick={() => handleOpenBooking(slot)}
                      className={`flex flex-col items-center justify-center p-3 rounded-md border text-center transition-all duration-200 ${
                        isDisabled 
                          ? 'border-zinc-900 bg-zinc-950/20 text-zinc-600 cursor-not-allowed opacity-40' 
                          : 'border-zinc-800 hover:border-zinc-500 bg-zinc-900/20 hover:bg-zinc-900/60 group cursor-pointer'
                      }`}
                    >
                      <span className={`text-sm font-semibold font-mono ${isDisabled ? 'text-zinc-650 line-through' : 'text-zinc-300 group-hover:text-zinc-150'}`}>
                        {formatTime(slot.startTime)}
                      </span>
                      <span className={`text-[10px] uppercase tracking-wider mt-0.5 ${isDisabled ? 'text-zinc-700 font-mono' : 'text-zinc-500'}`}>
                        {isBooked ? 'Booked' : isUnavailable ? 'Unavailable' : 'Available'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showModal && selectedSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md border border-zinc-800 bg-zinc-900 p-6 rounded-lg shadow-xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-zinc-100">Confirm Appointment</h3>
              <p className="text-sm text-zinc-400 mt-1">Review the booking details below.</p>
            </div>

            {bookingError && (
              <div className="flex items-start space-x-2 rounded-md border border-red-900/30 bg-red-950/20 p-3 text-sm text-red-400">
                <FiAlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <span>{bookingError}</span>
              </div>
            )}

            <div className="border-y border-zinc-800 py-4 space-y-3 font-mono text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Clinician:</span>
                <span className="text-zinc-200">{doctor.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Specialty:</span>
                <span className="text-zinc-300">{doctor.specialization}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-550">Date:</span>
                <span className="text-zinc-200">{formatDate(date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Time:</span>
                <span className="text-zinc-200">{formatTime(selectedSlot.startTime)}</span>
              </div>
            </div>

            <div>
              <label htmlFor="reason" className="text-xs font-mono uppercase tracking-wider text-zinc-400 block mb-1">
                Reason for visit (Optional)
              </label>
              <textarea
                id="reason"
                rows="3"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Briefly describe your symptoms or reason for consulting the doctor..."
                className="block w-full rounded-md border border-zinc-800 bg-zinc-900/40 py-2 px-3 text-sm text-zinc-100 placeholder-zinc-550 focus:border-zinc-300 focus:outline-none transition-all"
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 rounded-md border border-zinc-800 bg-transparent py-2 text-sm font-semibold text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBooking}
                disabled={submittingBooking}
                className="flex-1 flex justify-center items-center space-x-1 rounded-md bg-zinc-100 py-2 text-sm font-semibold text-zinc-950 hover:bg-zinc-250 disabled:bg-zinc-800 disabled:text-zinc-650 transition-all"
              >
                {submittingBooking ? (
                  <div className="w-5 h-5 border-2 border-zinc-850 border-t-zinc-400 rounded-full animate-spin" />
                ) : (
                  <>
                    <FiCheck />
                    <span>Confirm Booking</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookAppointment;
