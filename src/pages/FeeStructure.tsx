import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useSelectedSchool } from '@/contexts/SelectedSchoolContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const formatCurrency = (value: number) => `GH₵${Number(value || 0).toFixed(2)}`;

export default function FeeStructure() {
  const { selectedSchool } = useSelectedSchool();
  const [classes, setClasses] = useState<string[]>([]);
  const [structures, setStructures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    academic_year: '2026/2027',
    term: '1st Term',
    class_level: '',
    title: '',
    items: [
      { fee_type: 'Tuition', amount: 0 },
      { fee_type: 'Examination', amount: 0 },
      { fee_type: 'ICT', amount: 0 },
    ],
  });

  useEffect(() => {
    if (!selectedSchool) return;
    const load = async () => {
      const [classesRes, structuresRes] = await Promise.all([
        (supabase as any).from('classes').select('name').eq('school_id', selectedSchool.id).order('name'),
        (supabase as any).from('fee_structures').select('*, fee_structure_items(*)').eq('school_id', selectedSchool.id).order('created_at', { ascending: false }),
      ]);

      setClasses((classesRes.data || []).map((classRow: any) => classRow.name));
      setStructures(structuresRes.data || []);
      setLoading(false);
    };

    load();
  }, [selectedSchool?.id]);

  const totalAmount = form.items.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const handleItemChange = (index: number, field: string, value: string | number) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
    }));
  };

  const addItem = () => {
    setForm(prev => ({ ...prev, items: [...prev.items, { fee_type: 'Other school charges', amount: 0 }] }));
  };

  const saveStructure = async () => {
    if (!selectedSchool || !form.class_level) return;
    setSaving(true);

    try {
      const structurePayload = {
        school_id: selectedSchool.id,
        academic_year: form.academic_year,
        term: form.term,
        class_level: form.class_level,
        title: form.title || `${form.class_level} ${form.term}`,
        total_amount: totalAmount,
      };

      const structureRes = await (supabase as any).from('fee_structures').insert(structurePayload).select().single();
      if (structureRes.error) throw structureRes.error;

      const items = (form.items || []).filter((item) => item.fee_type && Number(item.amount || 0) > 0).map((item) => ({
        school_id: selectedSchool.id,
        fee_structure_id: structureRes.data.id,
        fee_type: item.fee_type,
        amount: Number(item.amount || 0),
      }));

      if (items.length) {
        const itemsRes = await (supabase as any).from('fee_structure_items').insert(items);
        if (itemsRes.error) throw itemsRes.error;
      }

      const refreshed = await (supabase as any).from('fee_structures').select('*, fee_structure_items(*)').eq('school_id', selectedSchool.id).order('created_at', { ascending: false });
      setStructures(refreshed.data || []);
      setForm({
        academic_year: '2026/2027',
        term: '1st Term',
        class_level: '',
        title: '',
        items: [
          { fee_type: 'Tuition', amount: 0 },
          { fee_type: 'Examination', amount: 0 },
          { fee_type: 'ICT', amount: 0 },
        ],
      });
    } catch (error) {
      console.error('Could not save fee structure:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout>
      <div className="container py-6 space-y-6">
        <div>
          <p className="text-sm uppercase tracking-wide text-muted-foreground">School Fees</p>
          <h1 className="text-3xl font-bold">Fee Structure</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create fee structure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Academic year</Label>
                <Input value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Term</Label>
                <Select value={form.term} onValueChange={(value) => setForm({ ...form, term: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1st Term">1st Term</SelectItem>
                    <SelectItem value="2nd Term">2nd Term</SelectItem>
                    <SelectItem value="3rd Term">3rd Term</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Class</Label>
                <Select value={form.class_level} onValueChange={(value) => setForm({ ...form, class_level: value })}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    {classes.map((className) => <SelectItem key={className} value={className}>{className}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Structure title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Optional title" />
              </div>
            </div>

            <div className="space-y-3">
              {form.items.map((item, index) => (
                <div key={`${item.fee_type}-${index}`} className="grid gap-3 md:grid-cols-[1.3fr_1fr_auto] items-end">
                  <div className="space-y-2">
                    <Label>Fee type</Label>
                    <Select value={item.fee_type} onValueChange={(value) => handleItemChange(index, 'fee_type', value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['Tuition','Admission','Examination','ICT','Development','Library','Sports','PTA','Other school charges'].map((feeType) => (
                          <SelectItem key={feeType} value={feeType}>{feeType}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input type="number" step="0.01" value={item.amount} onChange={(e) => handleItemChange(index, 'amount', Number(e.target.value || 0))} />
                  </div>
                  <Button variant="outline" type="button" onClick={() => setForm(prev => ({ ...prev, items: prev.items.filter((_, itemIndex) => itemIndex !== index) }))}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <Button variant="secondary" onClick={addItem}>Add item</Button>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Total</div>
                <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
              </div>
            </div>

            <Button onClick={saveStructure} disabled={saving || !form.class_level} className="w-full md:w-auto">
              {saving ? 'Saving...' : 'Save fee structure'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Saved structures</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading structures...</p>
            ) : structures.length === 0 ? (
              <p className="text-sm text-muted-foreground">No structures saved yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class</TableHead>
                    <TableHead>Academic Year</TableHead>
                    <TableHead>Term</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {structures.map((structure) => (
                    <TableRow key={structure.id}>
                      <TableCell>{structure.class_level}</TableCell>
                      <TableCell>{structure.academic_year}</TableCell>
                      <TableCell>{structure.term}</TableCell>
                      <TableCell>{(structure.fee_structure_items || []).map((item: any) => item.fee_type).join(', ') || '—'}</TableCell>
                      <TableCell>{formatCurrency(Number(structure.total_amount || 0))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
