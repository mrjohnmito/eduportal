import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SchoolProvider } from "@/contexts/SchoolContext";
import { SelectedSchoolProvider } from "@/contexts/SelectedSchoolContext";
import SchoolSelection from "./pages/SchoolSelection";
import SchoolCodeVerification from "./pages/SchoolCodeVerification";
import SuperAdminLogin from "./pages/SuperAdminLogin";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import ClassPortal from "./pages/ClassPortal";
import ScoreEntry from "./pages/ScoreEntry";
import StudentManagement from "./pages/StudentManagement";
import Settings from "./pages/Settings";
import ClearData from "./pages/ClearData";
import BulkPDF from "./pages/BulkPDF";
import TeacherManagement from "./pages/TeacherManagement";
import ClassManagement from "./pages/ClassManagement";
import ClassTeacherReport from "./pages/ClassTeacherReport";
import StudentPromotion from "./pages/StudentPromotion";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SelectedSchoolProvider>
      <SchoolProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Multi-school flow */}
              <Route path="/" element={<SchoolSelection />} />
              <Route path="/school-code" element={<SchoolCodeVerification />} />
              <Route path="/t/:shortId" element={<SchoolCodeVerification />} />
              <Route path="/super-admin-login" element={<SuperAdminLogin />} />
              <Route path="/super-admin" element={<SuperAdminDashboard />} />
              
              {/* School-specific routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/class/:classLevel" element={<ClassPortal />} />
              <Route path="/class/:classLevel/subject/:subject" element={<ScoreEntry />} />
              <Route path="/students" element={<StudentManagement />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/clear-data" element={<ClearData />} />
              <Route path="/bulk-pdf" element={<BulkPDF />} />
              <Route path="/teachers" element={<TeacherManagement />} />
              <Route path="/classes" element={<ClassManagement />} />
              <Route path="/class-management" element={<ClassManagement />} />
              <Route path="/class-teacher-report" element={<ClassTeacherReport />} />
              <Route path="/promotion" element={<StudentPromotion />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </SchoolProvider>
    </SelectedSchoolProvider>
  </QueryClientProvider>
);

export default App;