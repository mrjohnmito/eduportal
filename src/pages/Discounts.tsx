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

export default function Discounts() {
  const { selectedSchool } = useSelectedSchool();
  const [students, setStudents] = useState<any[]>([]);
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [studentId, setStudentId] = useState('');
  const [feeType, setFeeType] = useState('Tuition');
  const [originalAmount, setOriginalAmount] = useState('0');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [reason, setReason] = useState('');
  const [authorizedBy, setAuthorizedBy] = useState('Administrator');

  useEffect(() => {
    if (!selectedSchool) return;
    const load = async () => {
      const [studentsRes, discountsRes] = await Promise.all([
        (supabase as any).from('students').select('*').eq('school_id', selectedSchool.id).order('name'),
        (supabase as any).from('fee_discounts').select('*').eq('school_id', selectedSchool.id).order('created_at', { ascending: false }),
      ]);
      setStudents(studentsRes.data || []);
      setDiscounts(discountsRes.data || []);
      if ((studentsRes.data || []).length) setStudentId((studentsRes.data || [])[0].id);
    };
    load();
  }, [selectedSchool?.id]);

  const applyDiscount = async () => {
    if (!selectedSchool || !studentId) return;
    const payload = {
      school_id: selectedSchool.id,
      student_id: studentId,
      fee_account_id: null,
      fee_type: feeType,
      original_amount: Number(originalAmount || 0),
      discount_amount: Number(discountAmount || 0),
      reason,
      authorized_by: authorizedBy,
    };

    const { error } = await (supabase as any).from('fee_discounts').insert(payload);
    if (!error) {
      const refreshed = await (supabase as any).from('fee_discounts').select('*').eq('school_id', selectedSchool.id).order('created_at', { ascending: false });
      setDiscounts(refreshed.data || []);
      setOriginalAmount('0');
      setDiscountAmount('0');
      setReason('');
    }
  };

  return (
    <MainLayout>
      <div className="container py-6 space-y-6">
        <div>
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Finance</p>
          <h1 className="text-3xl font-bold">Discounts / Waivers</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Apply waiver</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Student</Label>
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger><SelectValue placeholder="Choose student" /></SelectTrigger>
                <SelectContent>
                  {students.map((student) => <SelectItem key={student.id} value={student.id}>{student.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fee</Label>
              <Select value={feeType} onValueChange={setFeeType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tuition">Tuition</SelectItem>
                  <SelectItem value="Examination">Examination</SelectItem>
                  <SelectItem value="ICT">ICT</SelectItem>
                  <SelectItem value="Development">Development</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Original amount</Label>
              <Input type="number" value={originalAmount} onChange={(e) => setOriginalAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Discount/waiver amount</Label>
              <Input type="number" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Reason</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Authorized by</Label>
              <Input value={authorizedBy} onChange={(e) => setAuthorizedBy(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Button onClick={applyDiscount}>Save waiver</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Waiver history</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Original</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Authorized by</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {discounts.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No discount records yet.</TableCell></TableRow>
                ) : (
                  discounts.map((discount) => {
                    const student = students.find((item) => item.id === discount.student_id);
                    return (
                      <TableRow key={discount.id}>
                        <TableCell>{student?.name || 'Unknown student'}</TableCell>
                        <TableCell>{discount.fee_type}</TableCell>
                        <TableCell>{Number(discount.original_amount || 0).toFixed(2)}</TableCell>
                        <TableCell>{Number(discount.discount_amount || 0).toFixed(2)}</TableCell>
                        <TableCell>{discount.reason || '—'}</TableCell>
                        <TableCell>{discount.authorized_by || '—'}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
