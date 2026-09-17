import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: 'primary' | 'emerald' | 'amber' | 'rose' | 'slate';
}

const tones: Record<string, { ring: string; iconBg: string; text: string }> = {
  primary: { ring: 'border-primary/20 bg-primary/5', iconBg: 'bg-primary/10', text: 'text-primary' },
  emerald: { ring: 'border-emerald-500/20 bg-emerald-500/5', iconBg: 'bg-emerald-500/10', text: 'text-emerald-600' },
  amber: { ring: 'border-amber-500/20 bg-amber-500/5', iconBg: 'bg-amber-500/10', text: 'text-amber-600' },
  rose: { ring: 'border-rose-500/20 bg-rose-500/5', iconBg: 'bg-rose-500/10', text: 'text-rose-600' },
  slate: { ring: 'border-border bg-muted/30', iconBg: 'bg-muted', text: 'text-muted-foreground' },
};

export function StatCard({ label, value, hint, icon: Icon, tone = 'primary' }: StatCardProps) {
  const t = tones[tone];
  return (
    <Card className={cn('border shadow-sm', t.ring)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn('rounded-lg p-2 shrink-0', t.iconBg)}>
            <Icon className={cn('h-5 w-5', t.text)} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-foreground break-words">{value}</p>
            {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
