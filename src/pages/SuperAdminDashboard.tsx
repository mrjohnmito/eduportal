import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { School } from '@/types/school';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Upload,
  Lock,
  Unlock,
  User,
  GraduationCap,
  Send,
  Mail,
  MessageSquare,
} from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

interface SentMessage {
  id: string;
  school_id: string;
  subject: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Messaging state
  const [msgDialogOpen, setMsgDialogOpen] = useState(false);
  const [msgSchoolId, setMsgSchoolId] = useState('all');
  const [msgSubject, setMsgSubject] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [sentMessages, setSentMessages] = useState<SentMessage[]>([]);

  // Form state
  const [formName, setFormName] = useState('');
  const [formLogoUrl, setFormLogoUrl] = useState('');
  const [formSchoolCode, setFormSchoolCode] = useState('');
  const [formSubscriptionStatus, setFormSubscriptionStatus] = useState(true);
  const [formSubscriptionExpiry, setFormSubscriptionExpiry] = useState('');
  const [formThemeColor, setFormThemeColor] = useState('#3B82F6');
  const [formAdminEmail, setFormAdminEmail] = useState('');
  const [formAdminPassword, setFormAdminPassword] = useState('');
  const [formIsLocked, setFormIsLocked] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    document.title = 'Super Admin Dashboard | Edu Pro';
    checkAccess();
    fetchSchools();
    fetchSentMessages();
  }, []);

  const checkAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate('/super-admin-login'); return; }
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .eq('role', 'super_admin')
      .maybeSingle();
    if (!roleData) navigate('/super-admin-login');
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
          id: s.id, name: s.name, logoUrl: s.logo_url || undefined,
          schoolCode: s.school_code, subscriptionStatus: s.subscription_status,
          subscriptionExpiry: s.subscription_expiry || undefined,
          themeColor: s.theme_color || undefined, createdAt: s.created_at,
          adminEmail: s.admin_email || undefined, adminPasswordHash: s.admin_password_hash || undefined,
          isLocked: s.is_locked || false,
        })) || []
      );
    } catch (error) {
      console.error('Error fetching schools:', error);
      toast({ title: 'Error', description: 'Failed to load schools.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchSentMessages = async () => {
    const { data } = await supabase
      .from('admin_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setSentMessages(data);
  };

  const sendMessage = async () => {
    if (!msgSubject.trim() || !msgBody.trim()) {
      toast({ title: 'Error', description: 'Subject and message are required.', variant: 'destructive' });
      return;
    }
    setSendingMsg(true);
    try {
      const targetSchools = msgSchoolId === 'all' ? schools : schools.filter(s => s.id === msgSchoolId);
      const rows = targetSchools.map(s => ({
        school_id: s.id,
        subject: msgSubject.trim(),
        message: msgBody.trim(),
      }));
      const { error } = await supabase.from('admin_messages').insert(rows);
      if (error) throw error;
      toast({ title: 'Message Sent', description: `Sent to ${targetSchools.length} school(s).` });
      setMsgDialogOpen(false);
      setMsgSubject('');
      setMsgBody('');
      setMsgSchoolId('all');
      fetchSentMessages();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to send message.', variant: 'destructive' });
    } finally {
      setSendingMsg(false);
    }
  };

  const resetForm = () => {
    setFormName(''); setFormLogoUrl(''); setFormSchoolCode('');
    setFormSubscriptionStatus(true); setFormSubscriptionExpiry('');
    setFormThemeColor('#3B82F6'); setFormAdminEmail(''); setFormAdminPassword('');
    setFormIsLocked(false); setEditingSchool(null);
  };

  const openAddDialog = () => { resetForm(); setFormSchoolCode(generateSchoolCode()); setDialogOpen(true); };

  const openEditDialog = (school: School) => {
    setEditingSchool(school); setFormName(school.name); setFormLogoUrl(school.logoUrl || '');
    setFormSchoolCode(school.schoolCode); setFormSubscriptionStatus(school.subscriptionStatus);
    setFormSubscriptionExpiry(school.subscriptionExpiry || ''); setFormThemeColor(school.themeColor || '#3B82F6');
    setFormAdminEmail(school.adminEmail || ''); setFormAdminPassword(''); setFormIsLocked(school.isLocked || false);
    setDialogOpen(true);
  };

  const generateSchoolCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast({ title: 'Invalid File', description: 'Please select an image file.', variant: 'destructive' }); return; }
    if (file.size > 5 * 1024 * 1024) { toast({ title: 'File Too Large', description: 'Please select an image smaller than 5MB.', variant: 'destructive' }); return; }
    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('school-logos').upload(`logos/${fileName}`, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('school-logos').getPublicUrl(`logos/${fileName}`);
      setFormLogoUrl(publicUrl);
      toast({ title: 'Logo Uploaded', description: 'School logo has been uploaded successfully.' });
    } catch (error: any) {
      toast({ title: 'Upload Failed', description: error.message || 'Failed to upload logo.', variant: 'destructive' });
    } finally { setUploadingLogo(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const schoolData = {
        name: formName, logo_url: formLogoUrl || null, school_code: formSchoolCode.toUpperCase(),
        subscription_status: formSubscriptionStatus, subscription_expiry: formSubscriptionExpiry || null,
        theme_color: formThemeColor, admin_email: formAdminEmail || null, is_locked: formIsLocked,
        admin_password_hash: formAdminPassword ? btoa(formAdminPassword) : (editingSchool?.adminPasswordHash || null),
      };
      if (editingSchool) {
        const { error } = await supabase.from('schools').update(schoolData).eq('id', editingSchool.id);
        if (error) throw error;
        toast({ title: 'School Updated', description: `${formName} has been updated successfully.` });
      } else {
        const { error } = await supabase.from('schools').insert([schoolData]);
        if (error) throw error;
        toast({ title: 'School Added', description: `${formName} has been added successfully.` });
      }
      setDialogOpen(false); resetForm(); fetchSchools();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to save school.', variant: 'destructive' });
    } finally { setFormLoading(false); }
  };

  const toggleSubscription = async (school: School) => {
    try {
      const { error } = await supabase.from('schools').update({ subscription_status: !school.subscriptionStatus }).eq('id', school.id);
      if (error) throw error;
      toast({ title: 'Subscription Updated', description: `${school.name} subscription is now ${!school.subscriptionStatus ? 'active' : 'inactive'}.` });
      fetchSchools();
    } catch (error) { toast({ title: 'Error', description: 'Failed to update subscription status.', variant: 'destructive' }); }
  };

  const toggleLock = async (school: School) => {
    try {
      const { error } = await supabase.from('schools').update({ is_locked: !school.isLocked }).eq('id', school.id);
      if (error) throw error;
      toast({ title: school.isLocked ? 'School Unlocked' : 'School Locked', description: `${school.name} has been ${school.isLocked ? 'unlocked' : 'locked'}.` });
      fetchSchools();
    } catch (error) { toast({ title: 'Error', description: 'Failed to update lock status.', variant: 'destructive' }); }
  };

  const deleteSchool = async (school: School) => {
    if (!confirm(`Are you sure you want to delete ${school.name}? This action cannot be undone.`)) return;
    try {
      const { error } = await supabase.from('schools').delete().eq('id', school.id);
      if (error) throw error;
      localStorage.removeItem(`school_verified_${school.id}`);
      const shortId = school.id.substring(0, 6);
      localStorage.removeItem(`school_verified_${shortId}`);
      try {
        const storedSchool = sessionStorage.getItem('selectedSchool');
        if (storedSchool) {
          const parsed = JSON.parse(storedSchool);
          if (parsed.id === school.id) {
            sessionStorage.removeItem('selectedSchool');
            sessionStorage.removeItem('teacher');
            sessionStorage.removeItem('teacherId');
          }
        }
      } catch (e) {}
      toast({ title: 'School Deleted', description: `${school.name} has been deleted.` });
      fetchSchools();
    } catch (error) { toast({ title: 'Error', description: 'Failed to delete school.', variant: 'destructive' }); }
  };

  const copySchoolCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({ title: 'Copied!', description: 'School code copied to clipboard.' });
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
      {/* Gradient Header */}
      <header className="border-b border-border bg-gradient-to-r from-primary/10 via-card to-secondary/10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-foreground">Super Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">Manage all schools & communications</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
        >
          <div className="rounded-xl border bg-gradient-to-br from-primary/5 to-primary/10 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2.5">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{schools.length}</p>
                <p className="text-xs text-muted-foreground">Total Schools</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-500/10 p-2.5">
                <Check className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{schools.filter(s => s.subscriptionStatus).length}</p>
                <p className="text-xs text-muted-foreground">Active Subscriptions</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border bg-gradient-to-br from-secondary/5 to-secondary/10 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-secondary/10 p-2.5">
                <MessageSquare className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{sentMessages.length}</p>
                <p className="text-xs text-muted-foreground">Messages Sent</p>
              </div>
            </div>
          </div>
        </motion.div>

        <Tabs defaultValue="schools" className="space-y-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="schools" className="gap-2">
              <Building2 className="h-4 w-4" />
              Schools
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-2">
              <Mail className="h-4 w-4" />
              Messages
            </TabsTrigger>
          </TabsList>

          {/* Schools Tab */}
          <TabsContent value="schools">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Schools</h2>
                <p className="text-muted-foreground">{schools.length} school{schools.length !== 1 ? 's' : ''} registered</p>
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={openAddDialog} className="gap-2 bg-gradient-to-r from-primary to-primary/80 shadow-md">
                    <Plus className="h-4 w-4" />
                    Add School
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingSchool ? 'Edit School' : 'Add New School'}</DialogTitle>
                    <DialogDescription>{editingSchool ? 'Update the school information.' : 'Enter the details for the new school.'}</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">School Name *</Label>
                      <Input id="name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Enter school name" required />
                    </div>
                    <div className="space-y-2">
                      <Label>School Logo</Label>
                      <div className="flex items-center gap-4">
                        {formLogoUrl ? (
                          <img src={formLogoUrl} alt="School logo" className="h-16 w-16 rounded-lg object-cover border border-border" />
                        ) : (
                          <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center border border-border">
                            <Building2 className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 space-y-2">
                          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadingLogo} className="gap-2">
                            <Upload className="h-4 w-4" />
                            {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                          </Button>
                          <p className="text-xs text-muted-foreground">Max 5MB, JPG/PNG</p>
                        </div>
                      </div>
                      {formLogoUrl && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => setFormLogoUrl('')} className="text-destructive">Remove Logo</Button>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="schoolCode">School Code *</Label>
                      <div className="flex gap-2">
                        <Input id="schoolCode" value={formSchoolCode} onChange={(e) => setFormSchoolCode(e.target.value.toUpperCase())} placeholder="SCHOOL123" className="uppercase" required />
                        <Button type="button" variant="outline" onClick={() => setFormSchoolCode(generateSchoolCode())}>Generate</Button>
                      </div>
                    </div>
                    <div className="border-t border-border pt-4 space-y-4">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <Label className="text-base font-medium">Admin Credentials</Label>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="adminEmail">Admin Email</Label>
                        <Input id="adminEmail" type="email" value={formAdminEmail} onChange={(e) => setFormAdminEmail(e.target.value)} placeholder="admin@school.com" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="adminPassword">Admin Password {editingSchool && '(leave blank to keep current)'}</Label>
                        <Input id="adminPassword" type="password" value={formAdminPassword} onChange={(e) => setFormAdminPassword(e.target.value)} placeholder={editingSchool ? '••••••••' : 'Enter password'} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subscriptionExpiry">Subscription Expiry</Label>
                      <Input id="subscriptionExpiry" type="date" value={formSubscriptionExpiry} onChange={(e) => setFormSubscriptionExpiry(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="themeColor">Theme Color</Label>
                      <div className="flex gap-2">
                        <Input id="themeColor" type="color" value={formThemeColor} onChange={(e) => setFormThemeColor(e.target.value)} className="w-16 h-10 p-1" />
                        <Input value={formThemeColor} onChange={(e) => setFormThemeColor(e.target.value)} placeholder="#3B82F6" className="flex-1" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="subscriptionStatus">Subscription Active</Label>
                      <Switch id="subscriptionStatus" checked={formSubscriptionStatus} onCheckedChange={setFormSubscriptionStatus} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                        <Label htmlFor="isLocked">Lock School</Label>
                      </div>
                      <Switch id="isLocked" checked={formIsLocked} onCheckedChange={setFormIsLocked} />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                      <Button type="submit" disabled={formLoading}>{formLoading ? 'Saving...' : editingSchool ? 'Update School' : 'Add School'}</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {schools.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-12 text-center">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No schools yet</h3>
                <p className="text-muted-foreground mb-4">Add your first school to get started.</p>
                <Button onClick={openAddDialog} className="gap-2"><Plus className="h-4 w-4" />Add School</Button>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>School</TableHead>
                      <TableHead>School Code</TableHead>
                      <TableHead>Admin</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schools.map((school) => (
                      <TableRow key={school.id} className={school.isLocked ? 'opacity-60' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {school.logoUrl ? (
                              <img src={school.logoUrl} alt={school.name} className="h-10 w-10 rounded-lg object-cover" />
                            ) : (
                              <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: school.themeColor + '20' }}>
                                <Building2 className="h-5 w-5" style={{ color: school.themeColor }} />
                              </div>
                            )}
                            <div>
                              <span className="font-medium">{school.name}</span>
                              {school.isLocked && (
                                <div className="flex items-center gap-1 text-xs text-destructive"><Lock className="h-3 w-3" />Locked</div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="bg-muted px-2 py-1 rounded text-sm">{school.schoolCode}</code>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copySchoolCode(school.schoolCode)}>
                              {copiedCode === school.schoolCode ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          {school.adminEmail ? <span className="text-sm">{school.adminEmail}</span> : <span className="text-sm text-muted-foreground">Not set</span>}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch checked={school.subscriptionStatus} onCheckedChange={() => toggleSubscription(school)} />
                            <span className={school.subscriptionStatus ? 'text-green-600' : 'text-destructive'}>
                              {school.subscriptionStatus ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {school.subscriptionExpiry ? (
                            <div className="flex items-center gap-2">
                              {new Date(school.subscriptionExpiry) < new Date() && <AlertTriangle className="h-4 w-4 text-destructive" />}
                              <span className={new Date(school.subscriptionExpiry) < new Date() ? 'text-destructive' : ''}>
                                {format(new Date(school.subscriptionExpiry), 'MMM d, yyyy')}
                              </span>
                            </div>
                          ) : <span className="text-muted-foreground">No expiry</span>}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => navigate(`/class-management?school=${school.id}`)} title="Manage Classes">
                              <GraduationCap className="h-4 w-4 text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => toggleLock(school)} title={school.isLocked ? 'Unlock School' : 'Lock School'}>
                              {school.isLocked ? <Unlock className="h-4 w-4 text-green-500" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(school)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteSchool(school)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Messages</h2>
                <p className="text-muted-foreground">Send announcements to school admins</p>
              </div>
              <Dialog open={msgDialogOpen} onOpenChange={setMsgDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 bg-gradient-to-r from-primary to-primary/80 shadow-md">
                    <Send className="h-4 w-4" />
                    Send Message
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-primary" />
                      Send Message
                    </DialogTitle>
                    <DialogDescription>Send a message to school admins. They'll see it in their inbox.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Recipient</Label>
                      <Select value={msgSchoolId} onValueChange={setMsgSchoolId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select school..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Schools</SelectItem>
                          {schools.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Subject</Label>
                      <Input value={msgSubject} onChange={e => setMsgSubject(e.target.value)} placeholder="Message subject..." />
                    </div>
                    <div className="space-y-2">
                      <Label>Message</Label>
                      <Textarea value={msgBody} onChange={e => setMsgBody(e.target.value)} placeholder="Type your message here..." rows={5} />
                    </div>
                    <div className="flex justify-end gap-3">
                      <Button variant="outline" onClick={() => setMsgDialogOpen(false)}>Cancel</Button>
                      <Button onClick={sendMessage} disabled={sendingMsg} className="gap-2">
                        <Send className="h-4 w-4" />
                        {sendingMsg ? 'Sending...' : 'Send'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {sentMessages.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-12 text-center">
                <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-40" />
                <h3 className="text-lg font-medium text-foreground mb-2">No messages sent yet</h3>
                <p className="text-muted-foreground">Send your first message to school admins.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sentMessages.map((msg, i) => {
                  const school = schools.find(s => s.id === msg.school_id);
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="rounded-xl border bg-card p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-foreground text-sm">{msg.subject}</h4>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              msg.is_read ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'
                            }`}>
                              {msg.is_read ? 'Read' : 'Unread'}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{msg.message}</p>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <p className="text-xs font-medium text-foreground">{school?.name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(msg.created_at), 'MMM d, h:mm a')}</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
