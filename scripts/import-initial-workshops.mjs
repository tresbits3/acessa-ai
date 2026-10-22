import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';

const expected = new Map([
  ['Introdução à mobilização neural', { teacher: 'Dr. Leonardo Luiz Barretti Secchi', date: '2026-10-29', count: 25 }],
  ['Atualizações no tratamento da escoliose por meio do método S4D', { teacher: 'Dra. Rosemary Berto', date: '2026-10-28', count: 20 }],
  ['Criolipólise: teoria e prática', { teacher: 'Emylene Struminski', date: '2026-10-28', count: 9 }]
]);
const normalize = value => value.normalize('NFKC').trim().replace(/\s+/g, ' ');
const key = value => normalize(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
const fail = message => { throw new Error(message); };

const csv = readFileSync('tmp/importacao/minicursos-prontos.csv', 'utf8');
const records = parse(csv, { columns: true, skip_empty_lines: true, bom: true, trim: true });
if (records.length !== 54) fail('O CSV deve conter exatamente 54 alunos.');
const courses = new Map();
for (const record of records) {
  if (Object.keys(record).sort().join(',') !== 'aluno,carga_horaria,curso,data,detalhes,professor') fail('Cabeçalho CSV inválido.');
  const title = normalize(record.curso), teacher = normalize(record.professor), name = normalize(record.aluno);
  const spec = expected.get(title);
  if (!spec || teacher !== spec.teacher || record.data !== spec.date || record.carga_horaria !== '4 horas'
      || record.detalhes !== '' || !name || name.length > 180) fail('Dados do minicurso ou aluno divergentes.');
  const courseKey = key(title), studentKey = key(name);
  if (!courses.has(courseKey)) courses.set(courseKey, { key: courseKey, title, teacher,
    event_date: record.data, workload: record.carga_horaria, details: '', students: [] });
  const course = courses.get(courseKey);
  if (course.students.some(student => student.key === studentKey)) fail('Nome duplicado no mesmo minicurso.');
  course.students.push({ name, key: studentKey });
}
if (courses.size !== 3 || [...courses.values()].some(course => course.students.length !== expected.get(course.title).count))
  fail('Contagens por minicurso divergentes.');
console.log('CSV validado: 3 minicursos; 25, 20 e 9 alunos; 54 no total; sem duplicatas.');
if (!process.argv.includes('--apply')) {
  console.log('Modo de conferência. Use --apply para executar a carga manualmente.');
  process.exit(0);
}

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').trim().split(/\r?\n/).map(line => {
  const at = line.indexOf('='); return [line.slice(0, at), line.slice(at + 1)];
}));
if (new URL(env.SUPABASE_URL).hostname !== 'lhvloarcmhawejlkqown.supabase.co') fail('Projeto Supabase diferente do AcessaAI.');
const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: existing, error: existingError } = await client.from('workshops').select('import_key');
if (existingError) fail(existingError.message);
if (existing.some(course => !courses.has(course.import_key))) fail('O banco contém outro minicurso; carga interrompida.');
const { data: result, error: importError } = await client.rpc('import_workshops', { p_courses: [...courses.values()] });
if (importError) fail(importError.message);
console.log('Carga executada:', result);
const { data: workshops, error: workshopsError } = await client.from('workshops').select('id,import_key,title');
if (workshopsError || workshops.length !== 3) fail('A conferência dos minicursos falhou.');
let total = 0;
for (const workshop of workshops) {
  const target = courses.get(workshop.import_key);
  if (!target) fail('Minicurso inesperado no banco.');
  const { data: students, error } = await client.from('workshop_students')
    .select('id,full_name,student_key,deleted_at,certificates(id,kind)')
    .eq('workshop_id', workshop.id);
  if (error) fail(error.message);
  const expectedNames = new Map(target.students.map(student => [student.key, student.name]));
  const originals = students.filter(student => expectedNames.has(student.student_key));
  if (originals.length !== target.students.length || originals.some(student =>
    !student.certificates || student.certificates.kind !== 'workshop'))
    fail('Associações ou certificados da carga inicial divergentes.');
  const active = students.filter(student => !student.deleted_at).length;
  const changedNames = originals.filter(student => expectedNames.get(student.student_key) !== student.full_name).length;
  console.log(`${workshop.title}: ${active} alunos ativos; ${originals.length} vínculos da carga inicial; ${changedNames} nomes editados.`);
  total += active;
}
console.log(`Conferência concluída: 3 minicursos, ${total} alunos ativos; carga original preservada.`);
