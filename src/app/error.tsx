'use client';
export default function ErrorPage({reset}:{error:Error;reset:()=>void}){return <main className="public-main"><div className="card public-card" role="alert"><p className="eyebrow">Acessa Ai</p><h1>Não foi possível abrir esta página</h1><p>Verifique sua conexão e tente novamente.</p><button onClick={reset}>Tentar novamente</button></div></main>}
