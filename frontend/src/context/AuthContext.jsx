import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // const BASE_URL = 'http://localhost:5000';
  const BASE_URL = 'https://clinic-backend-srqv.onrender.com';

  const API_URL = `${BASE_URL}/api`;
  const SOCKET_URL = BASE_URL;

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));

        // Validate token with backend
        try {
          const res = await fetch(`${API_URL}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${storedToken}`
            }
          });
          if (res.ok) {
            const data = await res.json();
            setUser(data.user);
            localStorage.setItem('user', JSON.stringify(data.user));
          } else {
            // Token expired or invalid
            logout();
          }
        } catch (error) {
          console.error('Error verifying session:', error);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, API_URL, SOCKET_URL }}>
      {children}
    </AuthContext.Provider>
  );
};
