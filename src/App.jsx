import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UserAccessProvider } from './context/UserAccessProvider';
import { EmployeeProvider } from './context/EmployeeProvider';
import { AppDataProvider } from './context/AppDataContext';
// PayrollProvider is now rendered internally by AppDataProvider (live bridge pattern)
import { SystemCalendarProvider } from './context/SystemCalendarContext';
import { NotificationProvider } from './context/NotificationProvider';
import { ApprovalProvider } from './context/ApprovalContext';
import NotificationToast from './components/NotificationToast';
import { ProtectedRoute } from './components/ProtectedRoute';
import Adjustments from './pages/Adjustments';
import Attendance from './pages/Attendance';
import BankDisbursements from './pages/BankDisbursements';
import Candidates from './pages/Candidates';
import Employees from './pages/Employee';
import EmployeesDirectory from './pages/EmployeesDirectory';
import FieldForce from './pages/FieldForce';
import HomeDashboard from './pages/HomeDashboard';
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
import TeamCalendar from './pages/TeamCalendar';
import SelfService from './pages/SelfService';
import OrgChart from './pages/OrgChart';
import Offboarding from './pages/Offboarding';
import Approvals from './pages/Approvals';
import Benefits from './pages/Benefits';
import Reports from './pages/Reports';
import Tickets from './pages/Tickets';
import Handbook from './pages/Handbook';
import MyAssets from './pages/MyAssets';
import MyPayroll from './pages/MyPayroll';
import Suggestions from './pages/Suggestions';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Keep error visible in console for debugging
    console.error('App runtime error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 16, fontFamily: 'ui-sans-serif, system-ui' }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>App crashed during startup.</div>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{String(this.state.error?.stack || this.state.error || 'Unknown error')}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  useEffect(() => {
    const MIN_MS = 800;
    const startTime = Date.now();

    const tryEnableIcons = () => {
      try {
        if (document.fonts && document.fonts.check("12px 'Material Symbols Outlined'")) {
          document.body.classList.add('fonts-loaded');
        }
      } catch (_) {
        // Ignore; icon font support may be unavailable in some environments.
      }
    };

    const reveal = () => {
      document.body.classList.add('app-ready');
      tryEnableIcons();
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
      (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve(),
      new Promise(res => {
        const elapsed = Date.now() - startTime;
        setTimeout(res, Math.max(0, MIN_MS - elapsed));
      }),
    ]).then(reveal).catch(reveal);

    // In case fonts load after reveal (or check() returns false initially),
    // enable icons as soon as the font set reports readiness.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(tryEnableIcons).catch(() => {});
    }

    return () => clearTimeout(hardFallback);
  }, []);

  return (
    <ErrorBoundary>
      <SystemCalendarProvider>
        <UserAccessProvider>
          <EmployeeProvider>
            <AppDataProvider>
              <NotificationProvider>
                <ApprovalProvider>
                <Router>
                  <NotificationToast />
                  <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Login />} />
                  <Route path="/home" element={<HomeDashboard />} />
                  <Route path="/attendance" element={<Attendance />} />
                  <Route path="/field-force" element={<FieldForce />} />
                  <Route path="/leave-requests" element={<LeaveRequests />} />
                  <Route path="/shift-planner" element={<ShiftPlanner />} />
                  <Route path="/team-calendar" element={<TeamCalendar />} />
                  <Route path="/ot-approvals" element={<ProtectedRoute allowedRoles={['Admin']} allowedPermission="view_payroll"><OTApprovals /></ProtectedRoute>} />
                  <Route path="/payroll-run" element={<ProtectedRoute allowedRoles={['Admin']} allowedPermission="view_payroll"><PayrollRun /></ProtectedRoute>} />
                  <Route path="/bank-disbursements" element={<ProtectedRoute allowedRoles={['Admin']} allowedPermission="view_payroll"><BankDisbursements /></ProtectedRoute>} />
                  <Route path="/loans-advances" element={<ProtectedRoute allowedRoles={['Admin']} allowedPermission="view_salary"><LoansAdvances /></ProtectedRoute>} />
                  <Route path="/adjustments" element={<ProtectedRoute allowedRoles={['Admin']} allowedPermission="view_payroll"><Adjustments /></ProtectedRoute>} />
                  <Route path="/expenses" element={<Expenses />} />
                  <Route path="/employees" element={<EmployeesDirectory />} />
                  <Route path="/employees/:id" element={<Employees />} />
                  <Route path="/self-service" element={<SelfService />} />
                  <Route path="/org-chart" element={<OrgChart />} />
                  <Route path="/jobs" element={<Jobs />} />
                  <Route path="/candidates" element={<Candidates />} />
                  <Route path="/onboarding" element={<Onboarding />} />
                  <Route path="/offboarding" element={<Offboarding />} />
                  <Route path="/approvals" element={<Approvals />} />
                  <Route path="/benefits" element={<Benefits />} />
                  <Route path="/ssb-pit" element={<ProtectedRoute allowedRoles={['Admin']} allowedPermission="view_payroll"><SSBPIT /></ProtectedRoute>} />
                  <Route path="/performance" element={<Performance />} />
                  <Route path="/assets" element={<ProtectedRoute allowedRoles={['Admin']} allowedPermission="manage_assets"><AssetManagement /></ProtectedRoute>} />
                  <Route path="/learning-training" element={<LearningTraining />} />
                  <Route path="/settings" element={<ProtectedRoute allowedRoles={['Admin']}><Setting /></ProtectedRoute>} />
                  <Route path="/labor-contracts" element={<ProtectedRoute allowedRoles={['Admin']} allowedPermission="manage_contracts"><LaborContracts /></ProtectedRoute>} />
                  <Route path="/disciplinary-actions" element={<ProtectedRoute allowedRoles={['Admin']}><DisciplinaryActions /></ProtectedRoute>} />
                  <Route path="/forms-library" element={<ProtectedRoute allowedRoles={['Admin']} allowedPermission="view_audit"><FormLibrary /></ProtectedRoute>} />
                  <Route path="/mobile-cockpit" element={<MobileCockpit />} />
                  <Route path="/device-setup" element={<DeviceSetup />} />
                  <Route path="/reports" element={<ProtectedRoute allowedRoles={['Admin']}><Reports /></ProtectedRoute>} />
                  <Route path="/tickets" element={<Tickets />} />
                  <Route path="/handbook" element={<Handbook />} />
                  <Route path="/my-assets" element={<MyAssets />} />
                  <Route path="/my-payroll" element={<MyPayroll />} />
                  <Route path="/suggestions" element={<Suggestions />} />
                </Routes>
                </Router>
                </ApprovalProvider>
              </NotificationProvider>
            </AppDataProvider>
          </EmployeeProvider>
        </UserAccessProvider>
      </SystemCalendarProvider>
    </ErrorBoundary>
  );
}

export default App;
