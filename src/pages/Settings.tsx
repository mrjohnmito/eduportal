import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useSchool } from '@/contexts/SchoolContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, Upload, Save, GraduationCap, Plus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
  const [totalSchoolDays, setTotalSchoolDays] = useState(settings.totalSchoolDays?.toString() || '64');
  
  // Interest and Conduct options
  const [interestOptions, setInterestOptions] = useState<string[]>(
    settings.interestOptions || ['Excellent', 'Very Good', 'Good', 'Satisfactory', 'Fair']
  );
  const [conductOptions, setConductOptions] = useState<string[]>(
    settings.conductOptions || ['Excellent', 'Very Good', 'Good', 'Satisfactory', 'Fair']
  );
  const [newInterest, setNewInterest] = useState('');
  const [newConduct, setNewConduct] = useState('');

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

  const addInterestOption = () => {
    if (newInterest.trim() && !interestOptions.includes(newInterest.trim())) {
      setInterestOptions([...interestOptions, newInterest.trim()]);
      setNewInterest('');
    }
  };

  const removeInterestOption = (option: string) => {
    setInterestOptions(interestOptions.filter(o => o !== option));
  };

  const addConductOption = () => {
    if (newConduct.trim() && !conductOptions.includes(newConduct.trim())) {
      setConductOptions([...conductOptions, newConduct.trim()]);
      setNewConduct('');
    }
  };

  const removeConductOption = (option: string) => {
    setConductOptions(conductOptions.filter(o => o !== option));
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
      totalSchoolDays: totalSchoolDays ? parseInt(totalSchoolDays) : 64,
      interestOptions,
      conductOptions,
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
            onClick={() => navigate('/dashboard')}
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

            {/* Total School Days */}
            <div className="space-y-2">
              <Label htmlFor="totalSchoolDays">Total School Days for Term</Label>
              <Input
                id="totalSchoolDays"
                type="number"
                value={totalSchoolDays}
                onChange={e => setTotalSchoolDays(e.target.value)}
                placeholder="e.g., 64"
              />
              <p className="text-xs text-muted-foreground">
                This is the total number of days students are expected to attend school for the term
              </p>
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

            {/* Interest Options */}
            <div className="space-y-3">
              <Label>Interest Options (for Class Teacher Reports)</Label>
              <div className="flex flex-wrap gap-2">
                {interestOptions.map((option) => (
                  <Badge key={option} variant="secondary" className="gap-1 pr-1">
                    {option}
                    <button
                      type="button"
                      onClick={() => removeInterestOption(option)}
                      className="ml-1 rounded-full hover:bg-destructive/20 p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newInterest}
                  onChange={e => setNewInterest(e.target.value)}
                  placeholder="Add new interest option"
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addInterestOption())}
                />
                <Button type="button" variant="outline" size="icon" onClick={addInterestOption}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Conduct Options */}
            <div className="space-y-3">
              <Label>Conduct Options (for Class Teacher Reports)</Label>
              <div className="flex flex-wrap gap-2">
                {conductOptions.map((option) => (
                  <Badge key={option} variant="secondary" className="gap-1 pr-1">
                    {option}
                    <button
                      type="button"
                      onClick={() => removeConductOption(option)}
                      className="ml-1 rounded-full hover:bg-destructive/20 p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newConduct}
                  onChange={e => setNewConduct(e.target.value)}
                  placeholder="Add new conduct option"
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addConductOption())}
                />
                <Button type="button" variant="outline" size="icon" onClick={addConductOption}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

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