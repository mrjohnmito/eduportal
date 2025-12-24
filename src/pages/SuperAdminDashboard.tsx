import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { School } from '@/types/school';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Shield,
  Plus,
  Building2,
  LogOut,
  Pencil,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formLogoUrl, setFormLogoUrl] = useState('');
  const [formSchoolCode, setFormSchoolCode] = useState('');
  const [formSubscriptionStatus, setFormSubscriptionStatus] = useState(true);
  const [formSubscriptionExpiry, setFormSubscriptionExpiry] = useState('');
  const [formThemeColor, setFormThemeColor] = useState('#3B82F6');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    checkAccess();
    fetchSchools();
  }, []);

  const checkAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate('/super-admin-login');
      return;
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .eq('role', 'super_admin')
      .maybeSingle();

    if (!roleData) {
      navigate('/super-admin-login');
    }
  };

  const fetchSchools = async () => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSchools(
        data?.map((s) => ({
          id: s.id,
          name: s.name,
          logoUrl: s.logo_url || undefined,
          schoolCode: s.school_code,
          subscriptionStatus: s.subscription_status,
          subscriptionExpiry: s.subscription_expiry || undefined,
          themeColor: s.theme_color || undefined,
          createdAt: s.created_at,
        })) || []
      );
    } catch (error) {
      console.error('Error fetching schools:', error);
      toast({
        title: 'Error',
        description: 'Failed to load schools.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormLogoUrl('');
    setFormSchoolCode('');
    setFormSubscriptionStatus(true);
    setFormSubscriptionExpiry('');
    setFormThemeColor('#3B82F6');
    setEditingSchool(null);
  };

  const openAddDialog = () => {
    resetForm();
    // Generate a random school code
    setFormSchoolCode(generateSchoolCode());
    setDialogOpen(true);
  };

  const openEditDialog = (school: School) => {
    setEditingSchool(school);
    setFormName(school.name);
    setFormLogoUrl(school.logoUrl || '');
    setFormSchoolCode(school.schoolCode);
    setFormSubscriptionStatus(school.subscriptionStatus);
    setFormSubscriptionExpiry(school.subscriptionExpiry || '');
    setFormThemeColor(school.themeColor || '#3B82F6');
    setDialogOpen(true);
  };

  const generateSchoolCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const schoolData = {
        name: formName,
        logo_url: formLogoUrl || null,
        school_code: formSchoolCode.toUpperCase(),
        subscription_status: formSubscriptionStatus,
        subscription_expiry: formSubscriptionExpiry || null,
        theme_color: formThemeColor,
      };

      if (editingSchool) {
        const { error } = await supabase
          .from('schools')
          .update(schoolData)
          .eq('id', editingSchool.id);

        if (error) throw error;

        toast({
          title: 'School Updated',
          description: `${formName} has been updated successfully.`,
        });
      } else {
        const { error } = await supabase.from('schools').insert(schoolData);

        if (error) throw error;

        toast({
          title: 'School Added',
          description: `${formName} has been added successfully.`,
        });
      }

      setDialogOpen(false);
      resetForm();
      fetchSchools();
    } catch (error: any) {
      console.error('Error saving school:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save school.',
        variant: 'destructive',
      });
    } finally {
      setFormLoading(false);
    }
  };

  const toggleSubscription = async (school: School) => {
    try {
      const { error } = await supabase
        .from('schools')
        .update({ subscription_status: !school.subscriptionStatus })
        .eq('id', school.id);

      if (error) throw error;

      toast({
        title: 'Subscription Updated',
        description: `${school.name} subscription is now ${!school.subscriptionStatus ? 'active' : 'inactive'}.`,
      });

      fetchSchools();
    } catch (error) {
      console.error('Error toggling subscription:', error);
      toast({
        title: 'Error',
        description: 'Failed to update subscription status.',
        variant: 'destructive',
      });
    }
  };

  const deleteSchool = async (school: School) => {
    if (!confirm(`Are you sure you want to delete ${school.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase.from('schools').delete().eq('id', school.id);

      if (error) throw error;

      toast({
        title: 'School Deleted',
        description: `${school.name} has been deleted.`,
      });

      fetchSchools();
    } catch (error) {
      console.error('Error deleting school:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete school.',
        variant: 'destructive',
      });
    }
  };

  const copySchoolCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({
      title: 'Copied!',
      description: 'School code copied to clipboard.',
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-foreground">Super Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">Manage all schools</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Schools</h2>
            <p className="text-muted-foreground">
              {schools.length} school{schools.length !== 1 ? 's' : ''} registered
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAddDialog} className="gap-2">
                <Plus className="h-4 w-4" />
                Add School
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingSchool ? 'Edit School' : 'Add New School'}
                </DialogTitle>
                <DialogDescription>
                  {editingSchool
                    ? 'Update the school information.'
                    : 'Enter the details for the new school.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">School Name *</Label>
                  <Input
                    id="name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Enter school name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logoUrl">Logo URL</Label>
                  <Input
                    id="logoUrl"
                    value={formLogoUrl}
                    onChange={(e) => setFormLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="schoolCode">School Code *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="schoolCode"
                      value={formSchoolCode}
                      onChange={(e) => setFormSchoolCode(e.target.value.toUpperCase())}
                      placeholder="SCHOOL123"
                      className="uppercase"
                      required
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setFormSchoolCode(generateSchoolCode())}
                    >
                      Generate
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subscriptionExpiry">Subscription Expiry</Label>
                  <Input
                    id="subscriptionExpiry"
                    type="date"
                    value={formSubscriptionExpiry}
                    onChange={(e) => setFormSubscriptionExpiry(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="themeColor">Theme Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="themeColor"
                      type="color"
                      value={formThemeColor}
                      onChange={(e) => setFormThemeColor(e.target.value)}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={formThemeColor}
                      onChange={(e) => setFormThemeColor(e.target.value)}
                      placeholder="#3B82F6"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="subscriptionStatus">Subscription Active</Label>
                  <Switch
                    id="subscriptionStatus"
                    checked={formSubscriptionStatus}
                    onCheckedChange={setFormSubscriptionStatus}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={formLoading}>
                    {formLoading
                      ? 'Saving...'
                      : editingSchool
                      ? 'Update School'
                      : 'Add School'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {schools.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No schools yet</h3>
            <p className="text-muted-foreground mb-4">
              Add your first school to get started.
            </p>
            <Button onClick={openAddDialog} className="gap-2">
              <Plus className="h-4 w-4" />
              Add School
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>School</TableHead>
                  <TableHead>School Code</TableHead>
                  <TableHead>Subscription</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schools.map((school) => (
                  <TableRow key={school.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {school.logoUrl ? (
                          <img
                            src={school.logoUrl}
                            alt={school.name}
                            className="h-10 w-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div
                            className="h-10 w-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: school.themeColor + '20' }}
                          >
                            <Building2
                              className="h-5 w-5"
                              style={{ color: school.themeColor }}
                            />
                          </div>
                        )}
                        <span className="font-medium">{school.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="bg-muted px-2 py-1 rounded text-sm">
                          {school.schoolCode}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => copySchoolCode(school.schoolCode)}
                        >
                          {copiedCode === school.schoolCode ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={school.subscriptionStatus}
                          onCheckedChange={() => toggleSubscription(school)}
                        />
                        <span
                          className={
                            school.subscriptionStatus
                              ? 'text-green-600'
                              : 'text-destructive'
                          }
                        >
                          {school.subscriptionStatus ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {school.subscriptionExpiry ? (
                        <div className="flex items-center gap-2">
                          {new Date(school.subscriptionExpiry) < new Date() && (
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                          )}
                          <span
                            className={
                              new Date(school.subscriptionExpiry) < new Date()
                                ? 'text-destructive'
                                : ''
                            }
                          >
                            {format(new Date(school.subscriptionExpiry), 'MMM d, yyyy')}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No expiry</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(school.createdAt), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(school)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteSchool(school)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>
    </div>
  );
}