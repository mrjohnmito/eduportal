import { useEffect, useState } from 'react';
import { MessageCircle, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ContactInfo {
  name: string | null;
  whatsapp: string | null;
  email: string | null;
}

export function ContactAdminBanner() {
  const [contact, setContact] = useState<ContactInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('super_admin_contact')
        .select('name, whatsapp, email')
        .limit(1)
        .maybeSingle();
      if (!cancelled) setContact(data ?? null);
    })();
    return () => { cancelled = true; };
  }, []);

  if (!contact) return null;

  const digits = (contact.whatsapp ?? '').replace(/\D/g, '');
  const hasWhatsapp = digits.length >= 8;
  const hasEmail = !!contact.email;
  if (!hasWhatsapp && !hasEmail) return null;

  const href = hasWhatsapp
    ? `https://wa.me/${digits}?text=${encodeURIComponent('Hello Admin, I need help with Edu Pro')}`
    : `mailto:${contact.email}?subject=${encodeURIComponent('Edu Pro — Help Request')}`;

  const Icon = hasWhatsapp ? MessageCircle : Mail;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group inline-flex items-center justify-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs sm:text-sm font-semibold text-primary shadow-sm transition-all hover:bg-primary/15 hover:shadow-md"
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Icon className="h-3 w-3" />
      </span>
      <span className="animate-blink">
        Contact admin for help
        {contact.name ? ` — ${contact.name}` : ''}
      </span>
    </a>
  );
}
