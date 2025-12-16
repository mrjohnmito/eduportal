import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SchoolProvider } from "@/contexts/SchoolContext";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SchoolProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/class/:classLevel" element={<ClassPortal />} />
            <Route path="/class/:classLevel/subject/:subject" element={<ScoreEntry />} />
            <Route path="/students" element={<StudentManagement />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/clear-data" element={<ClearData />} />
            <Route path="/bulk-pdf" element={<BulkPDF />} />
            <Route path="/teachers" element={<TeacherManagement />} />
            <Route path="/classes" element={<ClassManagement />} />
            <Route path="/class-teacher-report" element={<ClassTeacherReport />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </SchoolProvider>
  </QueryClientProvider>
);

export default App;