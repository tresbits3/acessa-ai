import { AdminNavigation } from './navigation';
export const dynamic = 'force-dynamic';
export default function AdminLayout({children}:{children:React.ReactNode}){
  return <div className="admin-shell"><header className="admin-topbar"><div className="brand"><span className="brand-mark" aria-hidden="true">F</span><span className="brand-name">Acessa Ai</span><span className="brand-event">III Simpósio de Fisioterapia<br/>da UniFSP</span></div><span className="topbar-label">Organização</span></header><div className="admin-body"><aside className="admin-side"><p className="side-title">Espaço do evento</p><AdminNavigation/></aside><main className="admin-content">{children}</main></div></div>;
}
