import { certificateData } from '@/lib/pdf';import { certificateFile } from '@/lib/certificate-file';import { notFound } from 'next/navigation';import { CertificateActions } from './certificate-actions';
export const dynamic = 'force-dynamic';
export default async function CertificatePage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;const data=await certificateData(id);if(!data||data.kind!=='lecture')notFound();const version=certificateFile(data);
 return <><header className="public-header"><div className="brand"><span className="brand-mark" aria-hidden="true">F</span><span className="brand-name">Acessa Ai</span></div></header><main className="public-main"><div className="card"><p className="eyebrow">Certificado disponível</p><h1>{data.student}</h1><p className="muted">{data.title}</p><p>Seu certificado está pronto. Você pode visualizar, baixar, imprimir ou compartilhar o link.</p><CertificateActions id={id} version={version}/><iframe title="Prévia do certificado" src={`/api/certificates/${id}?inline=1&v=${version}`}/></div></main></>;
}
