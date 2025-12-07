import { MainLayout } from '@/components/layout/MainLayout';
import { ClassCard } from '@/components/dashboard/ClassCard';
import { TotalStudentsCard } from '@/components/dashboard/TotalStudentsCard';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { useSchool } from '@/contexts/SchoolContext';
import { CLASS_LEVELS } from '@/types/school';
import { GraduationCap, BookOpen, Award, TrendingUp } from 'lucide-react';

export default function Dashboard() {
  const { settings } = useSchool();

  const stats = [
    { icon: BookOpen, label: 'Subjects', value: '10', color: 'text-blue-500' },
    { icon: GraduationCap, label: 'Classes', value: '3', color: 'text-emerald-500' },
    { icon: Award, label: 'Term', value: settings.term?.split(' ')[0] || '1st', color: 'text-amber-500' },
    { icon: TrendingUp, label: 'Year', value: settings.academicYear?.split('-')[0] || '2024', color: 'text-violet-500' },
  ];

  return (
    <MainLayout>
      <div className="container py-8">
        {/* Hero Section */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4 animate-fade-in">
            <GraduationCap className="h-4 w-4" />
            School Management System
          </div>
          <h1 className="mb-3 text-4xl font-bold text-foreground animate-fade-in sm:text-5xl">
            Welcome to{' '}
            <span className="bg-gradient-to-r from-primary via-purple-500 to-secondary bg-clip-text text-transparent">
              {settings.schoolName}
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground animate-fade-in [animation-delay:100ms]">
            Junior High School • {settings.academicYear} • {settings.term}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4 animate-fade-in [animation-delay:150ms]">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className="flex items-center gap-3 rounded-xl border border-border/50 bg-card p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
              style={{ animationDelay: `${150 + index * 50}ms` }}
            >
              <div className={`rounded-lg bg-muted p-2.5 ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
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
        <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-card to-muted/30 p-6 shadow-sm animate-fade-in [animation-delay:700ms]">
          <h2 className="mb-4 text-lg font-semibold text-foreground flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Quick Guide for Teachers
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              'Click on a class card to access the class portal',
              'Select a subject to enter scores in the Excel-style grid',
              'Grades and remarks are calculated automatically',
              'Admin login required for advanced features',
            ].map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-3 rounded-lg bg-background/50 p-3 transition-colors hover:bg-background"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {index + 1}
                </span>
                <span className="text-sm text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
