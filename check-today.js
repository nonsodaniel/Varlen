#!/usr/bin/env node
const BASE = 'https://sivena-api-production.up.railway.app/api/v1';
const hhId = 'cmsd61iqg0095u3xo3w4qnhd3';
const TODAY = new Date().toISOString().split('T')[0];

async function r(method, path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method, headers: {'Content-Type':'application/json', ...(token?{Authorization:`Bearer ${token}`}:{})},
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await res.json().catch(() => ({}));
  return j.data ?? j;
}

async function main() {
  const auth = await r('POST', '/auth/login', {email:'alex.sivena.demo@gmail.com', password:'Demo2026#'});
  const tok = auth.accessToken;
  console.log('Today:', TODAY);

  const events = await r('GET', `/households/${hhId}/events`, null, tok);
  const evList = Array.isArray(events) ? events : [];
  const todayEvs = evList.filter(e => e.startDate?.startsWith(TODAY));
  console.log(`\nEvents for ${TODAY}: ${todayEvs.length}`);
  todayEvs.forEach(e => console.log(`  ${e.startDate?.slice(11,16)} ${e.title} (by ${e.createdById})`));

  const well = await r('GET', '/wellness', null, tok);
  const wList = Array.isArray(well) ? well : [];
  const todayW = wList.find(w => w.date?.startsWith(TODAY));
  console.log(`\nWellness for ${TODAY}:`, todayW ? `mood ${todayW.mood}, sleep ${todayW.sleep}` : 'MISSING');

  const plans = await r('GET', `/households/${hhId}/meals/plans`, null, tok);
  const planList = Array.isArray(plans) ? plans : (plans?.days ?? []);
  console.log(`\nMeal plans raw type: ${typeof plans}, isArray: ${Array.isArray(plans)}`);
  console.log('Sample:', JSON.stringify(plans)?.slice(0,200));

  const tasks = await r('GET', `/households/${hhId}/tasks`, null, tok);
  const taskList = Array.isArray(tasks) ? tasks : [];
  const openTasks = taskList.filter(t => !t.completed);
  console.log(`\nOpen tasks: ${openTasks.length}`);

  // Jordan's auth
  const jauth = await r('POST', '/auth/login', {email:'jordan.sivena.demo@gmail.com', password:'Demo2026#'});
  if (jauth?.accessToken) {
    console.log('\nJordan authenticated ✓');
    const jevents = await r('GET', `/households/${hhId}/events`, null, jauth.accessToken);
    const jevList = Array.isArray(jevents) ? jevents : [];
    const jTodayEvs = jevList.filter(e => e.startDate?.startsWith(TODAY) && e.createdById === jauth.user?.id);
    console.log(`Jordan's events today: ${jTodayEvs.length}`);
  }
}

main().catch(console.error);
