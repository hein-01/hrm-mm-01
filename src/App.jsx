import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UserAccessProvider } from './context/UserAccessProvider';
import { EmployeeProvider } from './context/EmployeeProvider';
import { AppDataProvider } from './context/AppDataContext';
// PayrollProvider is now rendered internally by AppDataProvider (live bridge pattern)
import { SystemCalendarProvider } from './context/SystemCalendarContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Adjustments from './pages/Adjustments';
import Attendance from './pages/Attendance';
import BankDisbursements from './pages/BankDisbursements';
import Candidates from './pages/Candidates';
import Employees from './pages/Employee';
import EmployeesDirectory from './pages/EmployeesDirectory';
import FieldForce from './pages/FieldForce';
import InsightsDashboard from './pages/InsightsDashboard';
import Jobs from './pages/Jobs';
import LeaveRequests from './pages/LeaveRequests';
import LoansAdvances from './pages/LoansAdvances';
import OTApprovals from './pages/OTApprovals';
import Onboarding from './pages/Onboarding';
import PayrollRun from './pages/PayrollRun';
import SSBPIT from './pages/SSBPIT';
import Setting from './pages/Setting';
import ShiftPlanner from './pages/ShiftPlanner';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Performance from './pages/Performance';
import AssetManagement from './pages/AssetManagement';
import LearningTraining from './pages/LearningTraining';
import LaborContracts from './pages/LaborContracts';
import DisciplinaryActions from './pages/DisciplinaryActions';
import FormLibrary from './pages/FormLibrary';
import Expenses from './pages/Expenses';
import MobileCockpit from './pages/MobileCockpit';
import DeviceSetup from './pages/DeviceSetup';

function App() {
  useEffect(() => {
    const MIN_MS = 800;
    const startTime = Date.now();

    const reveal = () => {
      document.body.classList.add('app-ready', 'fonts-loaded');
      const preloader = document.getElementById('global-preloader');
      if (preloader) {
        preloader.classList.add('hiding');
        setTimeout(() => { if (preloader.parentNode) preloader.parentNode.removeChild(preloader); }, 420);
      }
    };

    // Hard fallback: never block the UI longer than 3s
    const hardFallback = setTimeout(reveal, 3000);

    // Primary: wait for fonts AND minimum display time, then reveal
    Promise.all([
      document.fonts.ready,
      new Promise(res => {
        const elapsed = Date.now() - startTime;
        setTimeout(res, Math.max(0, MIN_MS - elapsed));
      }),
    ]).then(reveal).catch(reveal);

    return () => clearTimeout(hardFallback);
  }, []);

  return (
    <SystemCalendarProvider>
      <UserAccessProvider>
        <EmployeeProvider>
          <AppDataProvider>
            <Router>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Login />} />
                <Route path="/insights-dashboard" element={<InsightsDashboard />} />
                <Route path="/attendance" element={<Attendance />} />
                <Route path="/field-force" element={<FieldForce />} />
                <Route path="/leave-requests" element={<LeaveRequests />} />
                <Route path="/shift-planner" element={<ShiftPlanner />} />
                <Route path="/ot-approvals" element={<ProtectedRoute allowedRoles={['Admin']}><OTApprovals /></ProtectedRoute>} />
                <Route path="/payroll-run" element={<ProtectedRoute allowedRoles={['Admin']}><PayrollRun /></ProtectedRoute>} />
                <Route path="/bank-disbursements" element={<ProtectedRoute allowedRoles={['Admin']}><BankDisbursements /></ProtectedRoute>} />
                <Route path="/loans-advances" element={<ProtectedRoute allowedRoles={['Admin']}><LoansAdvances /></ProtectedRoute>} />
                <Route path="/adjustments" element={<ProtectedRoute allowedRoles={['Admin']}><Adjustments /></ProtectedRoute>} />
                <Route path="/expenses" element={<Expenses />} />
                <Route path="/employees" element={<EmployeesDirectory />} />
                <Route path="/employees/:id" element={<Employees />} />
                <Route path="/jobs" element={<Jobs />} />
                <Route path="/candidates" element={<Candidates />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/ssb-pit" element={<ProtectedRoute allowedRoles={['Admin']}><SSBPIT /></ProtectedRoute>} />
                <Route path="/performance" element={<Performance />} />
                <Route path="/assets" element={<ProtectedRoute allowedRoles={['Admin']}><AssetManagement /></ProtectedRoute>} />
                <Route path="/learning-training" element={<LearningTraining />} />
                <Route path="/settings" element={<ProtectedRoute allowedRoles={['Admin']}><Setting /></ProtectedRoute>} />
                <Route path="/labor-contracts" element={<ProtectedRoute allowedRoles={['Admin']}><LaborContracts /></ProtectedRoute>} />
                <Route path="/disciplinary-actions" element={<ProtectedRoute allowedRoles={['Admin']}><DisciplinaryActions /></ProtectedRoute>} />
                <Route path="/forms-library" element={<FormLibrary />} />
                <Route path="/mobile-cockpit" element={<MobileCockpit />} />
                <Route path="/device-setup" element={<DeviceSetup />} />
              </Routes>
            </Router>
          </AppDataProvider>
        </EmployeeProvider>
      </UserAccessProvider>
    </SystemCalendarProvider>
  );
}

export default App;
