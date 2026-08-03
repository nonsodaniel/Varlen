#!/usr/bin/env node
/**
 * Sivena — refresh seed
 * Replaces: shopping lists (with items + qty), today's journal,
 *           personal tasks, and today's calendar schedule
 */

const BASE = 'https://sivena-api-production.up.railway.app/api/v1';
const hhId = 'cmsd61iqg0095u3xo3w4qnhd3';

const today = new Date();
today.setHours(0, 0, 0, 0);
const pad = (n) => String(n).padStart(2, '0');
const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
const dt = (h = 12, m = 0) => `${todayStr}T${pad(h)}:${pad(m)}:00.000Z`;

async function req(method, path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) {
    process.stdout.write(`  ✗ ${method} ${path.slice(0, 60)} → ${res.status}: ${JSON.stringify(json).slice(0, 120)}\n`);
    return null;
  }
  return json.data ?? json;
}

const get    = (p, t)    => req('GET',    p, undefined, t);
const post   = (p, b, t) => req('POST',   p, b, t);
const del    = (p, t)    => req('DELETE', p, undefined, t);

async function main() {
  console.log(`\n🔄  Sivena refresh — ${todayStr}\n`);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const authA = await post('/auth/login', { email: 'alex.sivena.demo@gmail.com', password: 'Demo2026#' });
  if (!authA?.accessToken) { console.error('Alex auth failed'); process.exit(1); }
  const tokA = authA.accessToken;
  const alexId = authA.user.id;
  console.log(`✓ Alex: ${authA.user.name} (${alexId})`);

  const authJ = await post('/auth/login', { email: 'jordan.sivena.demo@gmail.com', password: 'Demo2026#' });
  const tokJ = authJ?.accessToken;
  const jordanId = authJ?.user?.id;
  console.log(tokJ ? `✓ Jordan: ${authJ.user.name} (${jordanId})` : '✗ Jordan auth failed');

  // ── 1. Shopping Lists ─────────────────────────────────────────────────────
  console.log('\n▸ Shopping lists');

  // Clear existing lists
  const existingLists = await get(`/households/${hhId}/lists`, tokA);
  const listArr = Array.isArray(existingLists) ? existingLists : (existingLists?.data ?? []);
  for (const l of listArr) {
    await del(`/households/${hhId}/lists/${l.id}`, tokA);
  }
  console.log(`  ✓ Cleared ${listArr.length} existing lists`);

  // Shopping list definitions
  const shoppingLists = [
    {
      meta: { name: 'Weekly Groceries 🛒', shared: true },
      items: [
        { name: 'Bananas',           quantity: 6,  unit: '',        category: 'Produce' },
        { name: 'Avocados',          quantity: 4,  unit: '',        category: 'Produce' },
        { name: 'Baby spinach',      quantity: 1,  unit: 'bag',     category: 'Produce' },
        { name: 'Cherry tomatoes',   quantity: 1,  unit: 'pint',    category: 'Produce' },
        { name: 'Garlic',            quantity: 1,  unit: 'head',    category: 'Produce' },
        { name: 'Lemons',            quantity: 3,  unit: '',        category: 'Produce' },
        { name: 'Whole milk',        quantity: 1,  unit: 'gallon',  category: 'Dairy' },
        { name: 'Greek yogurt',      quantity: 2,  unit: 'cups',    category: 'Dairy' },
        { name: 'Cheddar cheese',    quantity: 1,  unit: 'block',   category: 'Dairy' },
        { name: 'Eggs',              quantity: 1,  unit: 'dozen',   category: 'Dairy' },
        { name: 'Butter',            quantity: 1,  unit: 'stick',   category: 'Dairy' },
        { name: 'Chicken breast',    quantity: 2,  unit: 'lbs',     category: 'Meat' },
        { name: 'Salmon fillets',    quantity: 2,  unit: '',        category: 'Meat' },
        { name: 'Ground turkey',     quantity: 1,  unit: 'lb',      category: 'Meat' },
        { name: 'Sourdough bread',   quantity: 1,  unit: 'loaf',    category: 'Bakery' },
        { name: 'Pasta (penne)',     quantity: 2,  unit: 'boxes',   category: 'Pantry' },
        { name: 'Olive oil',         quantity: 1,  unit: 'bottle',  category: 'Pantry' },
        { name: 'Canned tomatoes',   quantity: 3,  unit: 'cans',    category: 'Pantry' },
        { name: 'Vegetable broth',   quantity: 2,  unit: 'cartons', category: 'Pantry' },
        { name: 'Rolled oats',       quantity: 1,  unit: 'bag',     category: 'Pantry' },
        { name: 'Almond butter',     quantity: 1,  unit: 'jar',     category: 'Pantry' },
        { name: 'Orange juice',      quantity: 1,  unit: 'carton',  category: 'Drinks' },
        { name: 'Sparkling water',   quantity: 2,  unit: 'packs',   category: 'Drinks' },
      ],
      checked: ['Bananas', 'Eggs', 'Whole milk', 'Olive oil', 'Sourdough bread'],
    },
    {
      meta: { name: 'Pharmacy 💊', shared: false },
      items: [
        { name: 'Ibuprofen 200mg',     quantity: 1, unit: 'bottle',  category: 'Medicine' },
        { name: 'Vitamin D3 2000 IU',  quantity: 1, unit: 'bottle',  category: 'Vitamins' },
        { name: 'Magnesium glycinate', quantity: 1, unit: 'bottle',  category: 'Vitamins' },
        { name: 'Omega-3 fish oil',    quantity: 1, unit: 'bottle',  category: 'Vitamins' },
        { name: 'Allergy relief tabs', quantity: 1, unit: 'pack',    category: 'Medicine' },
        { name: 'SPF 50 sunscreen',    quantity: 2, unit: 'bottles', category: 'Skincare' },
        { name: 'Moisturiser',         quantity: 1, unit: 'tube',    category: 'Skincare' },
        { name: 'Dental floss',        quantity: 2, unit: 'packs',   category: 'Dental' },
        { name: 'Electric toothbrush heads', quantity: 1, unit: 'pack', category: 'Dental' },
      ],
      checked: ['Ibuprofen 200mg', 'Dental floss'],
    },
    {
      meta: { name: 'Europe Trip 🇪🇺', shared: true },
      items: [
        { name: 'Universal travel adapter', quantity: 2, unit: '',       category: 'Electronics' },
        { name: 'Portable charger 20000mAh', quantity: 1, unit: '',      category: 'Electronics' },
        { name: 'Packing cubes',            quantity: 1, unit: 'set',    category: 'Luggage' },
        { name: 'TSA-approved toiletry bag', quantity: 2, unit: '',       category: 'Luggage' },
        { name: 'Compression socks',        quantity: 2, unit: 'pairs',  category: 'Clothing' },
        { name: 'Lightweight rain jacket',  quantity: 1, unit: '',       category: 'Clothing' },
        { name: 'Euros (€500 each)',        quantity: 2, unit: 'sets',   category: 'Finance' },
        { name: 'Travel insurance docs',    quantity: 1, unit: '',       category: 'Documents' },
        { name: 'Copies of passports',      quantity: 2, unit: '',       category: 'Documents' },
        { name: 'Neck pillow',             quantity: 2, unit: '',       category: 'Travel' },
        { name: 'Noise-cancelling earbuds', quantity: 1, unit: 'pair',  category: 'Electronics' },
        { name: 'Italian phrasebook',       quantity: 1, unit: '',       category: 'Books' },
      ],
      checked: ['Copies of passports', 'Travel insurance docs', 'Italian phrasebook'],
    },
  ];

  for (const { meta, items, checked } of shoppingLists) {
    const list = await post(`/households/${hhId}/lists`, meta, tokA);
    if (!list) continue;
    console.log(`  ✓ Created list: ${meta.name}`);

    // Add items
    const createdItems = [];
    for (const item of items) {
      const r = await post(`/households/${hhId}/lists/${list.id}/items`, item, tokA);
      if (r) createdItems.push({ ...r, name: item.name });
    }
    console.log(`    → ${createdItems.length} items added`);

    // Toggle some as checked
    for (const ci of createdItems) {
      if (checked.includes(ci.name)) {
        await req('PATCH', `/households/${hhId}/lists/${list.id}/items/${ci.id}/toggle`, undefined, tokA);
      }
    }
    console.log(`    → ${checked.length} items checked`);
  }

  // ── 2. Today's Journal ────────────────────────────────────────────────────
  console.log('\n▸ Journal');

  // Delete any existing journal entry for today
  const allJournal = await get('/journal', tokA);
  const jList = Array.isArray(allJournal) ? allJournal : (allJournal?.data ?? []);
  const todayJournal = jList.filter(e => e.date?.startsWith(todayStr));
  for (const e of todayJournal) {
    await del(`/journal/${e.id}`, tokA);
    console.log(`  ✓ Removed old entry: "${e.gratitude || e.date}"`);
  }

  const journalEntries = [
    {
      date: todayStr,
      mood: 4,
      gratitude: 'Midweek clarity',
      note: "Cleared my inbox before 9am — rare. Had a really focused couple of hours before the rest of the team got online. Lunch with Jordan was easy; we talked about whether we want to rent or buy in the next two years. No answers yet but good to have the conversation out in the open. Yoga felt strong tonight. Starting to actually look forward to it rather than dreading the hour before.",
    },
  ];

  for (const entry of journalEntries) {
    const r = await post('/journal', entry, tokA);
    console.log(r ? `  ✓ Journal: "${entry.gratitude}" (mood ${entry.mood})` : '  ✗ Journal failed');
  }

  // ── 3. Tasks (clear + replace with richer personal list) ─────────────────
  console.log('\n▸ Tasks');

  const existingTasks = await get(`/households/${hhId}/tasks`, tokA);
  const taskArr = Array.isArray(existingTasks) ? existingTasks : (existingTasks?.data ?? []);
  for (const t of taskArr) {
    await del(`/households/${hhId}/tasks/${t.id}`, tokA);
  }
  console.log(`  ✓ Cleared ${taskArr.length} existing tasks`);

  const due = (days) => new Date(Date.now() + days * 86400000).toISOString();

  const tasks = [
    // Personal (My Tasks)
    { title: 'Call dentist — reschedule cleaning', dueDate: due(3), priority: 'MEDIUM', category: 'Health', shared: false },
    { title: 'Pick up dry cleaning', dueDate: due(1), category: 'Errands', shared: false },
    { title: 'Order birthday gift for Mom 🎁', dueDate: due(5), priority: 'HIGH', category: 'Personal', shared: false },
    { title: 'Read "Atomic Habits" (last 80 pages)', category: 'Personal', shared: false },
    { title: 'Look into 401k contribution increase', dueDate: due(14), category: 'Finance', shared: false },
    { title: 'Reply to Sam re: weekend plans', dueDate: due(1), category: 'Social', shared: false },
    { title: 'Set up auto-pay for gym membership', category: 'Finance', shared: false },
    { title: 'Back up laptop to external drive', category: 'Work', shared: false },

    // Shared household tasks
    { title: 'Book hotel in Florence 🏨', description: 'Check Booking.com, Hotels.com, and Airbnb', dueDate: due(7), priority: 'HIGH', category: 'Travel', shared: true },
    { title: 'Get Euros before trip', dueDate: due(12), category: 'Finance', shared: true },
    { title: 'Pack for Europe trip 🧳', dueDate: due(16), priority: 'HIGH', category: 'Travel', shared: true },
    { title: 'Buy wedding card (Sarah & Mike)', dueDate: due(8), category: 'Social', shared: true },
    { title: 'Book anniversary dinner reservation', dueDate: due(20), priority: 'HIGH', category: 'Social', shared: true },
    { title: 'Research European eSIM options', category: 'Travel', shared: true },
    { title: 'Fix the balcony light', category: 'Home', shared: true },
    { title: 'Schedule kitchen deep-clean', dueDate: due(10), category: 'Home', shared: true },
    { title: 'Renew car insurance', dueDate: due(21), category: 'Finance', shared: true },
    { title: 'Pick a joint savings goal for 2027', category: 'Finance', shared: true },

    // Chores
    { title: 'Clean bathrooms', category: 'Cleaning', isChore: true, shared: true },
    { title: 'Do laundry', category: 'Laundry', isChore: true, shared: true },
    { title: 'Water the plants 🌿', category: 'Garden', isChore: true, shared: true },
    { title: 'Take out recycling', category: 'Cleaning', isChore: true, shared: true },
    { title: 'Vacuum living room', category: 'Cleaning', isChore: true, shared: true },
  ];

  for (const t of tasks) {
    const r = await post(`/households/${hhId}/tasks`, t, tokA);
    if (r) process.stdout.write(`  ✓ ${t.title}\n`);
  }

  // ── 4. Today's Schedule (replace events) ─────────────────────────────────
  console.log('\n▸ Today\'s schedule');

  // Delete all today's events
  const allEvents = await get(`/households/${hhId}/events`, tokA);
  const evArr = Array.isArray(allEvents) ? allEvents : (allEvents?.data ?? []);
  const todayEvs = evArr.filter(e => e.startDate?.startsWith(todayStr));
  for (const e of todayEvs) {
    await del(`/households/${hhId}/events/${e.id}`, tokA);
  }
  console.log(`  ✓ Cleared ${todayEvs.length} existing today events`);

  const alexEvents = [
    { title: 'Morning Run 🏃', startDate: dt(6, 15), endDate: dt(7, 0), color: '#06B6D4', location: 'Riverside Park', shared: false, allDay: false },
    { title: 'Product Review — Q3 Roadmap', startDate: dt(9, 30), endDate: dt(10, 30), color: '#6366F1', location: 'Zoom', shared: false, allDay: false },
    { title: 'Lunch with Jordan', startDate: dt(12, 30), endDate: dt(13, 30), color: '#10B981', location: 'Westville', shared: true, allDay: false },
    { title: 'Dentist — Dr. Chen', startDate: dt(15, 0), endDate: dt(15, 45), color: '#F59E0B', location: '123 W 57th St', shared: false, allDay: false },
    { title: 'Yoga — Flow & Restore', startDate: dt(18, 30), endDate: dt(19, 30), color: '#8B5CF6', location: 'Harmony Studio', shared: false, allDay: false },
    { title: 'Dinner at home 🍝', startDate: dt(20, 0), endDate: dt(21, 0), color: '#EC4899', location: 'Home', shared: true, allDay: false },
  ];

  for (const ev of alexEvents) {
    const r = await post(`/households/${hhId}/events`, ev, tokA);
    if (r) process.stdout.write(`  ✓ Alex: ${ev.title}\n`);
  }

  if (tokJ) {
    const jordanEvents = [
      { title: 'Spin Class 🚴', startDate: dt(7, 0), endDate: dt(7, 45), color: '#06B6D4', location: 'SoulCycle', shared: false, allDay: false },
      { title: 'Client check-in — Meridian', startDate: dt(10, 0), endDate: dt(11, 0), color: '#F59E0B', location: 'Meridian HQ, Midtown', shared: false, allDay: false },
      { title: 'Lunch with Alex', startDate: dt(12, 30), endDate: dt(13, 30), color: '#10B981', location: 'Westville', shared: true, allDay: false },
      { title: 'Coffee with Maya ☕', startDate: dt(15, 30), endDate: dt(16, 15), color: '#EC4899', location: 'Joe Coffee', shared: false, allDay: false },
      { title: 'Pilates — Reformer', startDate: dt(17, 30), endDate: dt(18, 30), color: '#8B5CF6', location: 'Studio 1', shared: false, allDay: false },
      { title: 'Dinner at home 🍝', startDate: dt(20, 0), endDate: dt(21, 0), color: '#EC4899', location: 'Home', shared: true, allDay: false },
    ];
    for (const ev of jordanEvents) {
      const r = await post(`/households/${hhId}/events`, ev, tokJ);
      if (r) process.stdout.write(`  ✓ Jordan: ${ev.title}\n`);
    }
  }

  // ── Children's schedule (family/parenting mode) ───────────────────────────
  console.log('\n▸ Children events');
  const childrenRes = await get(`/households/${hhId}/children`, tokA);
  const children = Array.isArray(childrenRes) ? childrenRes : (childrenRes?.data ?? []);

  const childSchedule = [
    { childName: 'Mia', events: [
      { title: "School pickup — Mia", startDate: dt(14, 50), endDate: dt(15, 15), color: '#EC4899', shared: true, allDay: false },
      { title: "Mia's Ballet Class 🩰", startDate: dt(15, 30), endDate: dt(16, 30), color: '#EC4899', location: 'Dance Studio B', shared: true, allDay: false },
    ]},
    { childName: 'Leo', events: [
      { title: "School pickup — Leo", startDate: dt(14, 50), endDate: dt(15, 15), color: '#F59E0B', shared: true, allDay: false },
      { title: "Leo's Soccer Practice ⚽", startDate: dt(16, 0), endDate: dt(17, 0), color: '#F59E0B', location: 'Riverside Field', shared: true, allDay: false },
    ]},
    { childName: 'Zoe', events: [
      { title: "Zoe's Playdate 🧸", startDate: dt(14, 0), endDate: dt(16, 0), color: '#10B981', location: "Sophie's place", shared: true, allDay: false },
    ]},
  ];

  for (const { childName, events: evs } of childSchedule) {
    const child = children.find(c => c.name.startsWith(childName));
    if (!child) { process.stdout.write(`  ⚠ ${childName} not found\n`); continue; }
    for (const ev of evs) {
      const r = await post(`/households/${hhId}/events`, ev, tokA);
      if (r) process.stdout.write(`  ✓ ${ev.title}\n`);
    }
  }

  // ── Done ─────────────────────────────────────────────────────────────────
  console.log('\n✅  Refresh complete!\n');
  console.log('  ✓ 3 shopping lists with items, quantities & units');
  console.log('  ✓ Today\'s journal (midweek mood 4)');
  console.log('  ✓ 22 tasks (personal + shared + chores)');
  console.log('  ✓ 6 events for Alex, 6 for Jordan, 5 children events\n');
}

main().catch(err => { console.error('Failed:', err); process.exit(1); });
