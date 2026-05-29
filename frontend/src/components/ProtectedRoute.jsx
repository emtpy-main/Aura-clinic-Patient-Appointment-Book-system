import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-4 border-zinc-700 border-t-zinc-100 rounded-full animate-spin"></div>
          <span className="text-zinc-400 text-sm tracking-wider">Verifying session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If patient tries to access doctor dashboard
    if (user.role === 'patient') {
      return <Navigate to="/" replace />;
    }
    // If doctor tries to access patient pages
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
