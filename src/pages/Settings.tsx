import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useSchool } from '@/contexts/SchoolContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, Upload, Save, GraduationCap } from 'lucide-react';

export default function Settings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings, updateSettings, isAdmin } = useSchool();

  const [schoolName, setSchoolName] = useState(settings.schoolName);
  const [motto, setMotto] = useState(settings.motto);
  const [email, setEmail] = useState(settings.email);
  const [academicYear, setAcademicYear] = useState(settings.academicYear);
  const [term, setTerm] = useState(settings.term);
  const [contacts, setContacts] = useState(settings.contacts.join(', '));
  const [logo, setLogo] = useState(settings.schoolLogo || '');

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    updateSettings({
      schoolName,
      motto,
      email,
      academicYear,
      term,
      contacts: contacts.split(',').map(c => c.trim()).filter(Boolean),
      schoolLogo: logo || undefined,
    });

    toast({
      title: 'Settings Saved',
      description: 'School settings have been updated successfully.',
    });
  };

  if (!isAdmin) {
    return (
      <MainLayout>
        <div className="container py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
            <p className="mt-2 text-muted-foreground">
              Please login as admin to access settings.
            </p>
            <Button onClick={() => navigate('/login')} className="mt-4">
              Go to Login
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-4 gap-2 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>

          <h1 className="text-2xl font-bold text-foreground">School Settings</h1>
          <p className="text-muted-foreground">Configure school information for reports</p>
        </div>

        {/* Settings Form */}
        <div className="max-w-2xl">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm animate-fade-in space-y-6">
            {/* Logo */}
            <div className="space-y-3">
              <Label>School Logo</Label>
              <div className="flex items-center gap-6">
                {logo ? (
                  <img
                    src={logo}
                    alt="School Logo"
                    className="h-20 w-20 rounded-xl object-cover ring-2 ring-border"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-xl bg-muted flex items-center justify-center">
                    <GraduationCap className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-6 py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                  <Upload className="h-4 w-4" />
                  Upload Logo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                </label>
              </div>
            </div>

            {/* School Name */}
            <div className="space-y-2">
              <Label htmlFor="schoolName">School Name</Label>
              <Input
                id="schoolName"
                value={schoolName}
                onChange={e => setSchoolName(e.target.value)}
              />
            </div>

            {/* Motto */}
            <div className="space-y-2">
              <Label htmlFor="motto">School Motto</Label>
              <Input
                id="motto"
                value={motto}
                onChange={e => setMotto(e.target.value)}
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            {/* Academic Year & Term */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="academicYear">Academic Year</Label>
                <Input
                  id="academicYear"
                  value={academicYear}
                  onChange={e => setAcademicYear(e.target.value)}
                  placeholder="e.g., 2024/2025"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="term">Term</Label>
                <Input
                  id="term"
                  value={term}
                  onChange={e => setTerm(e.target.value)}
                  placeholder="e.g., First Term"
                />
              </div>
            </div>

            {/* Contact Numbers */}
            <div className="space-y-2">
              <Label htmlFor="contacts">Contact Numbers (comma separated)</Label>
              <Input
                id="contacts"
                value={contacts}
                onChange={e => setContacts(e.target.value)}
                placeholder="e.g., 0557387992, 0545231646"
              />
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSave}
              className="w-full gap-2 gradient-primary text-primary-foreground"
            >
              <Save className="h-4 w-4" />
              Save Settings
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
