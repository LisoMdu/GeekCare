import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SignUp } from './pages/SignUp';
import { Login } from './pages/Login';
import { ForgotPassword } from './pages/ForgotPassword';
import { EmailVerification } from './pages/EmailVerification';
import { ResetPassword } from './pages/ResetPassword';
import { PhysicianProfile } from './components/PhysicianProfile';
import { Schedule } from './pages/Schedule';
import { Appointments } from './pages/Appointments';
import { Home } from './pages/Home';
import { SearchResults } from './pages/SearchResults';
import { BookAppointment } from './pages/BookAppointment';
import { MemberProfile } from './pages/MemberProfile';
import { MemberAppointments } from './pages/MemberAppointments';
import { Inbox } from './pages/Inbox';
import { Support } from './pages/Support';
import { FAQsPage } from './pages/FAQsPage';
import { MedicalRecords } from './pages/MedicalRecords';
import { DoctorProfile } from './pages/DoctorProfile';
import { initializeAuth } from './lib/auth';
import { DoctorDashboard } from './pages/DoctorDashboard';
import { DoctorQueriesPage } from './pages/DoctorQueriesPage';
import { SimplePage } from './pages/SimplePage';
import { AppLayout } from './components/AppLayout';

export function App() {
  // Initialize authentication with refresh token rotation
  useEffect(() => {
    // Initialize auth and handle the Promise properly
    initializeAuth().then(cleanup => {
      // Store cleanup function for when component unmounts
      return () => {
        if (cleanup) cleanup();
      };
    });
  }, []);

  return (
    <Router>
      <Routes>
        {/* Authentication Routes (No Sidebar) */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-email" element={<EmailVerification />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        {/* Member Routes (With Sidebar) */}
        <Route element={<AppLayout />}>
          <Route path="/home" element={<Home />} />
          <Route path="/profile" element={<MemberProfile />} />
          <Route path="/appointments" element={<MemberAppointments />} />
          <Route path="/search-results" element={<SearchResults />} />
          <Route path="/doctor/:id" element={<DoctorProfile />} />
          <Route path="/book/:physicianId" element={<BookAppointment />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/support" element={<Support />} />
          <Route path="/faqs" element={<FAQsPage />} />
          <Route path="/medical-records" element={<MedicalRecords />} />
          <Route path="/example" element={<SimplePage />} />
        </Route>
        
        {/* Physician Routes (With Sidebar) */}
        <Route path="/physician" element={<AppLayout />}>
          <Route path="dashboard" element={<DoctorDashboard />} />
          <Route path="profile" element={<PhysicianProfile />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="appointments" element={<Appointments />} />
          <Route path="inbox" element={<Inbox />} />
          <Route path="faqs" element={<FAQsPage />} />
          <Route path="queries" element={<DoctorQueriesPage />} />
          <Route path="support" element={<Support />} />
          <Route path="example" element={<SimplePage />} />
        </Route>

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;