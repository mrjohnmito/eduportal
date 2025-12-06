import { MainLayout } from '@/components/layout/MainLayout';
import { ClassCard } from '@/components/dashboard/ClassCard';
import { TotalStudentsCard } from '@/components/dashboard/TotalStudentsCard';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { useSchool } from '@/contexts/SchoolContext';
import { CLASS_LEVELS } from '@/types/school';

export default function Dashboard() {
  const { settings } = useSchool();

  return (
    <MainLayout>
      <div className="container py-8">
        {/* Hero Section */}
        <div className="mb-10 text-center">
          <h1 className="mb-3 text-3xl font-bold text-foreground animate-fade-in sm:text-4xl">
            Welcome to <span className="text-primary">{settings.schoolName}</span>
          </h1>
          <p className="mx-auto max-w-2xl text-muted-foreground animate-fade-in [animation-delay:100ms]">
            Junior High School Management System • {settings.academicYear} • {settings.term}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="mb-8 flex justify-center animate-fade-in [animation-delay:200ms]">
          <QuickActions />
        </div>

        {/* Class Cards Grid */}
        <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {CLASS_LEVELS.map((level, index) => (
            <div
              key={level.id}
              className="animate-fade-in"
              style={{ animationDelay: `${300 + index * 100}ms` }}
            >
              <ClassCard
                classLevel={level.id}
                name={level.name}
                colorClass={level.color}
              />
            </div>
          ))}
          <div
            className="animate-fade-in"
            style={{ animationDelay: '600ms' }}
          >
            <TotalStudentsCard />
          </div>
        </div>

        {/* Instructions for Teachers */}
        <div className="rounded-xl border border-border/50 bg-card p-6 animate-fade-in [animation-delay:700ms]">
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Quick Guide for Teachers
          </h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
              Click on a class card to access the class portal
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
              Select a subject to enter scores in the Excel-style grid
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
              Grades and remarks are calculated automatically
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
              Admin login required for advanced features
            </li>
          </ul>
        </div>
      </div>
    </MainLayout>
  );
}
