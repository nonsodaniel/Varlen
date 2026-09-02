#!/usr/bin/env node
/**
 * Sivena — extras seed
 * Lists, Goals, Circles, Savings, Baby logs, Habits, Subscriptions
 */

const BASE = 'https://sivena-api-production.up.railway.app/api/v1';
const hhId = 'cmsd61iqg0095u3xo3w4qnhd3';

const today = new Date();
today.setHours(0,0,0,0);
const pad = n => String(n).padStart(2,'0');
const todayStr = `${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`;
const d = (off, h=12, m=0) => { const dt=new Date(today); dt.setDate(dt.getDate()+off); dt.setHours(h,m,0,0); return dt.toISOString(); };
const ds = off => d(off).split('T')[0];

async function req(method, path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) {
    process.stdout.write(`  ✗ ${method} ${path.slice(0,55)} → ${res.status}: ${JSON.stringify(json).slice(0,100)}\n`);
    return null;
  }
  return json.data ?? json;
}

const post  = (p, b, t) => req('POST',  p, b, t);
const patch = (p, b, t) => req('PATCH', p, b, t);
const get   = (p, t)    => req('GET',   p, undefined, t);

async function main() {
  console.log('\n🌿  Extras seed starting…\n');

  const auth = await post('/auth/login', { email: 'alex.sivena.demo@gmail.com', password: 'Demo2026#' });
  if (!auth?.accessToken) { console.error('Auth failed'); process.exit(1); }
  const tok = auth.accessToken;
  console.log(`✓ ${auth.user.name}`);

  // ── 1. Lists ───────────────────────────────────────────────────────────────
  console.log('\n▸ Lists');

  const grocery = await post(`/households/${hhId}/lists`, { name: 'Weekly Groceries 🛒', shared: true }, tok);
  if (grocery) {
    const items = [
      { name: 'Salmon fillets', quantity: 2, unit: 'pieces', category: 'Seafood' },
      { name: 'Avocados', quantity: 4, unit: 'whole', category: 'Produce' },
      { name: 'Greek yogurt', quantity: 2, unit: 'tubs', category: 'Dairy' },
      { name: 'Quinoa', quantity: 1, unit: 'bag', category: 'Pantry' },
      { name: 'Sourdough bread', quantity: 1, unit: 'loaf', category: 'Bakery' },
      { name: 'Cherry tomatoes', quantity: 1, unit: 'punnet', category: 'Produce' },
      { name: 'Almond milk', quantity: 2, unit: 'cartons', category: 'Dairy' },
      { name: 'Mixed nuts', quantity: 1, unit: 'bag', category: 'Pantry' },
      { name: 'Fresh basil', quantity: 1, unit: 'bunch', category: 'Produce' },
      { name: 'Parmesan cheese', quantity: 1, unit: 'block', category: 'Dairy' },
      { name: 'Chicken breasts', quantity: 4, unit: 'pieces', category: 'Meat' },
      { name: 'Lemons', quantity: 3, unit: 'whole', category: 'Produce' },
    ];
    const created = [];
    for (const item of items) {
      const r = await post(`/households/${hhId}/lists/${grocery.id}/items`, item, tok);
      if (r) created.push(r);
    }
    for (let i = 0; i < 3 && i < created.length; i++) {
      await patch(`/households/${hhId}/lists/${grocery.id}/items/${created[i].id}/toggle`, undefined, tok);
    }
    console.log(`  ✓ Weekly Groceries (${created.length} items, 3 checked)`);
  }

  const homeTasks = await post(`/households/${hhId}/lists`, { name: 'Home Errands 🏠', shared: true }, tok);
  if (homeTasks) {
    const items = [
      { name: 'Book car service', category: 'Admin' },
      { name: 'Replace bathroom lightbulbs', category: 'Maintenance' },
      { name: 'Call internet provider', category: 'Admin' },
      { name: 'Organise wardrobe', category: 'Organisation' },
      { name: 'Water the plants', category: 'Garden' },
      { name: 'Schedule kitchen deep-clean', category: 'Cleaning' },
    ];
    const created = [];
    for (const item of items) {
      const r = await post(`/households/${hhId}/lists/${homeTasks.id}/items`, item, tok);
      if (r) created.push(r);
    }
    for (let i = 0; i < 2 && i < created.length; i++) {
      await patch(`/households/${hhId}/lists/${homeTasks.id}/items/${created[i].id}/toggle`, undefined, tok);
    }
    console.log(`  ✓ Home Errands (${created.length} items, 2 checked)`);
  }

  const packing = await post(`/households/${hhId}/lists`, { name: 'Europe Trip Packing ✈️', shared: true }, tok);
  if (packing) {
    const items = [
      { name: 'Passports', category: 'Documents' },
      { name: 'Travel adapters (x2)', quantity: 2, category: 'Electronics' },
      { name: 'Sunscreen SPF50', category: 'Personal' },
      { name: 'Walking shoes', category: 'Clothing' },
      { name: 'Camera + memory cards', category: 'Electronics' },
      { name: 'First aid kit', category: 'Health' },
      { name: 'Portable charger', category: 'Electronics' },
      { name: 'Light jacket', category: 'Clothing' },
      { name: 'Euros (cash)', category: 'Finance' },
      { name: 'Kindle', category: 'Entertainment' },
    ];
    const created = [];
    for (const item of items) {
      const r = await post(`/households/${hhId}/lists/${packing.id}/items`, item, tok);
      if (r) created.push(r);
    }
    for (let i = 0; i < 4 && i < created.length; i++) {
      await patch(`/households/${hhId}/lists/${packing.id}/items/${created[i].id}/toggle`, undefined, tok);
    }
    console.log(`  ✓ Europe Trip Packing (${created.length} items, 4 checked)`);
  }

  const kidsSchool = await post(`/households/${hhId}/lists`, { name: "Kids' School List 📚", shared: true }, tok);
  if (kidsSchool) {
    const items = [
      { name: 'Notebook (Mia)', quantity: 2, category: 'Stationery' },
      { name: 'Coloured pencils (Leo)', category: 'Stationery' },
      { name: 'School shoes (Mia — size 3)', category: 'Clothing' },
      { name: 'Backpack (Leo)', category: 'School' },
      { name: 'Lunch boxes (x2)', quantity: 2, category: 'Kitchen' },
      { name: 'Permission slip — field trip', category: 'Admin' },
    ];
    const created = [];
    for (const item of items) {
      const r = await post(`/households/${hhId}/lists/${kidsSchool.id}/items`, item, tok);
      if (r) created.push(r);
    }
    for (let i = 0; i < 2 && i < created.length; i++) {
      await patch(`/households/${hhId}/lists/${kidsSchool.id}/items/${created[i].id}/toggle`, undefined, tok);
    }
    console.log(`  ✓ Kids School List (${created.length} items, 2 checked)`);
  }

  // ── 2. Goals ─────────────────────────────────────────────────────────────
  console.log('\n▸ Goals');
  const goals = [
    { title: 'Run a 5K',             target: 5,    unit: 'km',       deadline: ds(45),  color: '#10B981', progress: 4.2 },
    { title: 'Save for Europe Trip', target: 8000, unit: 'dollars',  deadline: ds(40),  color: '#F59E0B', progress: 6800 },
    { title: 'Read 12 Books',        target: 12,   unit: 'books',    deadline: ds(150), color: '#8B5CF6', progress: 9 },
    { title: 'Cook New Recipes',     target: 52,   unit: 'recipes',  deadline: ds(120), color: '#EC4899', progress: 43 },
    { title: 'Meditate Daily',       target: 90,   unit: 'sessions', deadline: ds(60),  color: '#06B6D4', progress: 28 },
    { title: 'Gym — 100 Sessions',   target: 100,  unit: 'sessions', deadline: ds(90),  color: '#3B82F6', progress: 72 },
  ];
  for (const goal of goals) {
    const { progress, ...body } = goal;
    const r = await post(`/households/${hhId}/goals`, body, tok);
    if (r) {
      await patch(`/households/${hhId}/goals/${r.id}`, { progress }, tok);
      console.log(`  ✓ ${goal.title} (${progress}/${goal.target})`);
    }
  }

  // ── 3. Circles ────────────────────────────────────────────────────────────
  console.log('\n▸ Circles');
  const circles = [
    { name: 'Family',        description: 'Parents, siblings and close family', emoji: '👨‍👩‍👧‍👦', color: '#FF6B35' },
    { name: 'Work Friends',  description: 'Colleagues we actually like',         emoji: '💼',        color: '#6366F1' },
    { name: 'College Crew',  description: 'Friends from NYU days',              emoji: '🎓',        color: '#10B981' },
    { name: 'Gym Buddies',   description: 'Morning workout squad',              emoji: '💪',        color: '#F59E0B' },
    { name: 'Neighbours',    description: 'Building friends',                   emoji: '🏠',        color: '#EC4899' },
  ];
  for (const c of circles) {
    const r = await post('/circles', c, tok);
    if (r) console.log(`  ✓ ${c.name}`);
  }

  // ── 4. Savings goals (uses /goals with unit=dollars) ─────────────────────
  console.log('\n▸ Savings goals');
  const savingsGoals = [
    { title: 'Europe Vacation Fund ✈️', target: 8000,  progress: 6800,  color: '#F59E0B', deadline: ds(40)  },
    { title: 'Emergency Fund 🛡️',       target: 15000, progress: 11200, color: '#10B981' },
    { title: 'New MacBook Pro 💻',       target: 3500,  progress: 1800,  color: '#6366F1', deadline: ds(90)  },
    { title: 'Home Down Payment 🏡',    target: 80000, progress: 24500, color: '#3B82F6', deadline: ds(540) },
    { title: 'Anniversary Getaway 💑',  target: 2500,  progress: 2500,  color: '#EC4899', deadline: ds(20)  },
  ];
  for (const sg of savingsGoals) {
    const { progress, ...body } = sg;
    const r = await post(`/households/${hhId}/goals`, { ...body, unit: 'dollars' }, tok);
    if (r) {
      await patch(`/households/${hhId}/goals/${r.id}`, { progress }, tok);
      console.log(`  ✓ ${sg.title} ($${progress}/$${sg.target})`);
    }
  }

  // ── 5. Baby logs for Zoe (2 years old) ───────────────────────────────────
  console.log('\n▸ Baby logs (Zoe)');
  const childrenRes = await get(`/households/${hhId}/children`, tok);
  const children = Array.isArray(childrenRes) ? childrenRes : (childrenRes?.data ?? []);
  const zoe  = children.find(c => c.name.includes('Zoe'));
  const mia  = children.find(c => c.name.includes('Mia'));
  const leo  = children.find(c => c.name.includes('Leo'));

  if (zoe) {
    const pad2 = n => String(n).padStart(2,'0');
    const ts = (off, h, m=0) => {
      const dt = new Date(today);
      dt.setDate(dt.getDate() + off);
      dt.setHours(h, m, 0, 0);
      return dt.toISOString();
    };

    const babyLogs = [
      // Today's logs
      { childId: zoe.id, type: 'feed',    timestamp: ts(0, 7,  0), duration: 20, note: 'Ate well this morning' },
      { childId: zoe.id, type: 'sleep',   timestamp: ts(0, 8, 15), duration: 90 },
      { childId: zoe.id, type: 'diaper',  timestamp: ts(0, 9, 45), note: 'wet' },
      { childId: zoe.id, type: 'feed',    timestamp: ts(0, 12, 0), duration: 25, note: 'Good lunch' },
      { childId: zoe.id, type: 'diaper',  timestamp: ts(0, 13, 30), note: 'dirty' },
      { childId: zoe.id, type: 'sleep',   timestamp: ts(0, 14, 0), duration: 120, note: 'Nap time' },
      // Yesterday
      { childId: zoe.id, type: 'feed',    timestamp: ts(-1, 7, 0), duration: 18 },
      { childId: zoe.id, type: 'sleep',   timestamp: ts(-1, 8, 30), duration: 85 },
      { childId: zoe.id, type: 'diaper',  timestamp: ts(-1, 10, 0), note: 'wet' },
      { childId: zoe.id, type: 'feed',    timestamp: ts(-1, 12, 15), duration: 22 },
      { childId: zoe.id, type: 'sleep',   timestamp: ts(-1, 13, 45), duration: 110 },
      { childId: zoe.id, type: 'diaper',  timestamp: ts(-1, 16, 0), note: 'wet' },
      { childId: zoe.id, type: 'feed',    timestamp: ts(-1, 18, 30), duration: 20 },
      // Milestones
      { childId: zoe.id, type: 'milestone', timestamp: ts(-14, 10, 0), note: "First word: 'Mama' — we were all in tears!" },
      { childId: zoe.id, type: 'milestone', timestamp: ts(-7,  11, 0), note: 'Said her first two-word sentence: "More milk"' },
      { childId: zoe.id, type: 'milestone', timestamp: ts(-3,  15, 0), note: 'Stacked 5 blocks for the first time!' },
      { childId: zoe.id, type: 'milestone', timestamp: ts(-1,  9,  0), note: 'Waved bye-bye all by herself 👋' },
    ];

    // POST to /households/:hhId/children/:childId/logs (body: type, timestamp, duration?, note?)
    const postLog = (childId, body) => post(`/households/${hhId}/children/${childId}/logs`, body, tok);

    let logCount = 0;
    for (const log of babyLogs) {
      const { childId, ...body } = log;
      const r = await postLog(childId, body);
      if (r) logCount++;
    }
    console.log(`  ✓ Zoe: ${logCount} logs`);
  } else {
    console.log('  ⚠ Zoe not found');
  }

  const postLog = (childId, body) => post(`/households/${hhId}/children/${childId}/logs`, body, tok);

  // Milestones for older children
  if (mia) {
    const miaLogs = [
      { type: 'milestone', timestamp: d(-60, 10), note: 'Won the school art competition 🎨' },
      { type: 'milestone', timestamp: d(-30, 15), note: 'First ballet recital — she was incredible 🩰' },
      { type: 'milestone', timestamp: d(-7,  9),  note: 'Read her first chapter book on her own!' },
    ];
    let c = 0;
    for (const log of miaLogs) {
      const r = await postLog(mia.id, log);
      if (r) c++;
    }
    console.log(`  ✓ Mia: ${c} milestones`);
  }

  if (leo) {
    const leoLogs = [
      { type: 'milestone', timestamp: d(-45, 16), note: 'Scored his first goal at soccer practice ⚽' },
      { type: 'milestone', timestamp: d(-20, 14), note: 'Learned to ride a bike without training wheels! 🚲' },
      { type: 'milestone', timestamp: d(-5,  10), note: "Named every dinosaur in Jordan's book correctly 🦕" },
    ];
    let c = 0;
    for (const log of leoLogs) {
      const r = await postLog(leo.id, log);
      if (r) c++;
    }
    console.log(`  ✓ Leo: ${c} milestones`);
  }

  // ── Done ────────────────────────────────────────────────────────────────
  console.log('\n✅  Extras seed complete!\n');
}

main().catch(err => { console.error('Seed failed:', err); process.exit(1); });
