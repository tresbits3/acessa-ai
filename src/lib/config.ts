export function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variável ${name} não configurada`);
  return value;
}
export function longSecret(name:string){const value=required(name);if(value.length<32)throw new Error(`Variável ${name} deve ter ao menos 32 caracteres`);return value}
export function origin(): string { return required('APP_ORIGIN').replace(/\/$/, ''); }
