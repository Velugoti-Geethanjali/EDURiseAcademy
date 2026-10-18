import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { Spinner } from './components/ui';
import Layout from './components/Layout';

import Landing from './pages/public/Landing';
import Login from './pages/public/Login';
import Register from './pages/public/Register';
import Receipt from './pages/Receipt';
import Notifications from './pages/Notifications';

import TutorDashboard from './pages/tutor/Dashboard';
import Students from './pages/tutor/Students';
import StudentForm from './pages/tutor/StudentForm';
import StudentDetail from './pages/tutor/StudentDetail';
import PackagePage from './pages/tutor/PackagePage';
import Classes from './pages/tutor/Classes';
import Attendance from './pages/tutor/Attendance';
import Payments from './pages/tutor/Payments';
import Assignments from './pages/tutor/Assignments';
import Tests from './pages/tutor/Tests';
import Announcements from './pages/tutor/Announcements';
import TutorProfile from './pages/tutor/Profile';

import StudentHome from './pages/student/Home';
import MyClasses from './pages/student/MyClasses';
import Homework from './pages/student/Homework';
import Materials from './pages/student/Materials';
import StudentPayments from './pages/student/Payments';
import Results from './pages/student/Results';
import StudentProfile from './pages/student/Profile';

function Guard({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner className="min-h-screen" />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={user.role === 'tutor' ? '/tutor' : '/student'} replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/receipt/:id" element={<Receipt />} />

      <Route path="/tutor" element={<Guard role="tutor"><Layout role="tutor" /></Guard>}>
        <Route index element={<TutorDashboard />} />
        <Route path="students" element={<Students />} />
        <Route path="students/new" element={<StudentForm />} />
        <Route path="students/:id" element={<StudentDetail />} />
        <Route path="students/:id/edit" element={<StudentForm />} />
        <Route path="packages/:id" element={<PackagePage />} />
        <Route path="classes" element={<Classes />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="payments" element={<Payments />} />
        <Route path="assignments" element={<Assignments />} />
        <Route path="tests" element={<Tests />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="profile" element={<TutorProfile />} />
      </Route>

      <Route path="/student" element={<Guard role="student"><Layout role="student" /></Guard>}>
        <Route index element={<StudentHome />} />
        <Route path="classes" element={<MyClasses />} />
        <Route path="homework" element={<Homework />} />
        <Route path="materials" element={<Materials />} />
        <Route path="payments" element={<StudentPayments />} />
        <Route path="results" element={<Results />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="profile" element={<StudentProfile />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
