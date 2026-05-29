import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Doctors from './pages/Doctors';
import BookAppointment from './pages/BookAppointment';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-zinc-950 flex flex-col">
          <Navbar />
          <main className="flex-grow">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Patient Only Routes */}
              <Route
                path="/doctors"
                element={
                  <ProtectedRoute allowedRoles={['patient']}>
                    <Doctors />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/doctors/:id/book"
                element={
                  <ProtectedRoute allowedRoles={['patient']}>
                    <BookAppointment />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/appointments"
                element={
                  <ProtectedRoute allowedRoles={['patient']}>
                    <PatientDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Doctor / Admin Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['doctor', 'admin']}>
                    <DoctorDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all Redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          
          <footer className="border-t border-zinc-900 bg-zinc-950 py-6 text-center text-xs text-zinc-600 font-mono">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              &copy; {new Date().getFullYear()} AURA CLINIC OPERATIONS NODE. ALL RIGHTS RESERVED.
            </div>
          </footer>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
