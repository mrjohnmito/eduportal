import { useEffect, useState } from 'react';
import { resolveStudentPhoto, PHOTO_SIGNED_SECONDS } from '@/lib/studentPhotos';

export function StudentPhoto({ photo, name, className }: { photo?: string; name: string; className: string }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    let active = true;
    setUrl(undefined);
    const refresh = async () => {
      const signed = await resolveStudentPhoto(photo);
      if (active) setUrl(signed);
    };
    void refresh();
    const timer = window.setInterval(refresh, (PHOTO_SIGNED_SECONDS - 30) * 1000);
    return () => { active = false; window.clearInterval(timer); };
  }, [photo]);
  return url ? <img src={url} alt={name} className={className} onError={() => setUrl(undefined)} /> :
    <div className={`${className} flex items-center justify-center bg-muted text-muted-foreground`} aria-label={`${name}: no photograph available`}>{name.charAt(0)}</div>;
}