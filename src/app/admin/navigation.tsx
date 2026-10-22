'use client';
import { usePathname } from 'next/navigation';
export function AdminNavigation(){
  const path=usePathname();
  const links=[['/admin','▦','Visão geral'],['/admin/minicursos','◇','Minicursos'],['/admin/palestras','▣','Palestras']];
  return <nav className="admin-nav" aria-label="Navegação da organização">{links.map(([href,icon,label])=><a key={href} href={href} aria-current={path===href||(href!=='/admin'&&path.startsWith(href+'/'))?'page':undefined}><span aria-hidden="true">{icon}</span>{label}</a>)}</nav>;
}
