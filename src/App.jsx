import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DemoSessionProvider, useDemoSession } from './session/DemoSessionContext';
import AppShell from './components/AppShell';
import Landing from './pages/public/Landing';
import CitizenDashboard from './pages/citizen/CitizenDashboard';
import CitizenFamily from './pages/citizen/CitizenFamily';
import CitizenBenefits from './pages/citizen/CitizenBenefits';
import CitizenApplications from './pages/citizen/CitizenApplications';
import OfficerDashboard from './pages/officer/OfficerDashboard';
import IdentityReview from './pages/officer/IdentityReview';
import FamiliesList from './pages/officer/FamiliesList';
import FamilyDetail from './pages/officer/FamilyDetail';
import BenefitGaps from './pages/officer/BenefitGaps';
import SchemeCoverage from './pages/officer/SchemeCoverage';
import Applications from './pages/officer/Applications';
import ApplyScheme from './pages/citizen/ApplyScheme';
import AdminDashboard from './pages/admin/AdminDashboard';
import DataIngestion from './pages/admin/DataIngestion';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { session } = useDemoSession();
  if (!session) return <Navigate to="/" replace />;
  if (allowedRoles && !allowedRoles.includes(session.role)) return <Navigate to="/" replace />;
  return children;
};

export default function App() {
  return (
    <DemoSessionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Landing />} />
          
          <Route element={<AppShell />}>
            <Route path="/citizen/*" element={
              <ProtectedRoute allowedRoles={['citizen']}>
                <Routes>
                  <Route path="dashboard" element={<CitizenDashboard />} />
                  <Route path="family" element={<CitizenFamily />} />
                  <Route path="benefits" element={<CitizenBenefits />} />
                  <Route path="applications" element={<CitizenApplications />} />
                  <Route path="apply/:schemeCode" element={<ApplyScheme />} />
                  <Route path="*" element={<Navigate to="dashboard" replace />} />
                </Routes>
              </ProtectedRoute>
            } />
            <Route path="/officer/*" element={
              <ProtectedRoute allowedRoles={['officer']}>
                <Routes>
                  <Route path="dashboard" element={<OfficerDashboard />} />
                  <Route path="identity-review" element={<IdentityReview />} />
                  <Route path="families" element={<FamiliesList />} />
                  <Route path="families/:id" element={<FamilyDetail />} />
                  <Route path="benefit-gaps" element={<BenefitGaps />} />
                  <Route path="scheme-coverage" element={<SchemeCoverage />} />
                  <Route path="applications" element={<Applications />} />
                  <Route path="*" element={<Navigate to="dashboard" replace />} />
                </Routes>
              </ProtectedRoute>
            } />
            <Route path="/admin/*" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Routes>
                  <Route path="dashboard" element={<AdminDashboard />} />
                  <Route path="data-ingestion" element={<DataIngestion />} />
                  <Route path="*" element={<Navigate to="dashboard" replace />} />
                </Routes>
              </ProtectedRoute>
            } />
          </Route>
        </Routes>
      </BrowserRouter>
    </DemoSessionProvider>
  );
}
