#!/usr/bin/env node
/**
 * Sivena — today patch
 * Creates today's data for all modes: single, couple, family, parenting
 */

const BASE = 'https://sivena-api-production.up.railway.app/api/v1';
const hhId = 'cmsd61iqg0095u3xo3w4qnhd3';

const today = new Date();
today.setHours(0, 0, 0, 0);
// Use local date string (not UTC) to match what the mobile app uses
const pad = (n) => String(n).padStart(2, '0');
const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

const dt = (h = 12, m = 0) => `${todayStr}T${pad(h)}:${pad(m)}:00.000Z`;

async function req(method, path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) {
    process.stdout.write(`  ✗ ${method} ${path.slice(0, 55)} → ${res.status}: ${JSON.stringify(json).slice(0, 120)}\n`);
    return null;
  }
  return json.data ?? json;
}

const post  = (p, b, t) => req('POST',  p, b, t);
const patch = (p, b, t) => req('PATCH', p, b, t);
const get   = (p, t)    => req('GET',   p, undefined, t);

async function main() {
  console.log(`\n🌅  Today patch — ${todayStr}\n`);

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

  // ── 1. Wellness ──────────────────────────────────────────────────────────
  console.log('\n▸ Wellness');
  const w = await post('/wellness', { date: todayStr, mood: 5, sleep: 7.5, water: 6, exercise: true, note: 'Great morning workout. Energy is high.' }, tokA);
  console.log(w ? `  ✓ Alex wellness: mood 5, sleep 7.5h` : '  ⚠ Already exists or failed');

  // ── 2. Meal plans for today ──────────────────────────────────────────────
  console.log('\n▸ Meal plans');
  const mealsRes = await get(`/households/${hhId}/meals`, tokA);
  const meals = Array.isArray(mealsRes) ? mealsRes : (mealsRes?.data ?? []);
  const byType = { BREAKFAST: [], LUNCH: [], DINNER: [], SNACK: [] };
  for (const m of meals) if (byType[m.type]) byType[m.type].push(m);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  for (const [mealType, pool] of Object.entries(byType)) {
    const meal = pick(pool);
    if (!meal) continue;
    const r = await post(`/households/${hhId}/meals/plans`, { date: todayStr, mealType, mealId: meal.id }, tokA);
    if (r) console.log(`  ✓ ${mealType}: ${meal.title}`);
  }

  // ── 3. Alex's events today ───────────────────────────────────────────────
  console.log('\n▸ Alex calendar events');
  const alexEvents = [
    { title: 'Morning Workout 💪', startDate: dt(6,30), endDate: dt(7,30), color: '#06B6D4', location: 'Equinox', shared: false, allDay: false },
    { title: 'Team Standup',       startDate: dt(9, 0), endDate: dt(9,30), color: '#6366F1', location: 'Zoom',    shared: false, allDay: false },
    { title: 'Lunch with Jordan',  startDate: dt(12,30),endDate: dt(13,30),color: '#10B981', location: 'Sweetgreen', shared: true, allDay: false },
    { title: 'Yoga Class 🧘',      startDate: dt(18, 0),endDate: dt(19, 0),color: '#8B5CF6', location: 'Harmony Studio', shared: false, allDay: false },
  ];
  for (const ev of alexEvents) {
    const r = await post(`/households/${hhId}/events`, ev, tokA);
    if (r) console.log(`  ✓ ${ev.title}`);
  }

  // ── 4. Jordan's events today ─────────────────────────────────────────────
  if (tokJ) {
    console.log('\n▸ Jordan calendar events');
    const jordanEvents = [
      { title: 'Client Presentation', startDate: dt(10, 0), endDate: dt(11, 0), color: '#F59E0B', location: 'Office — Midtown', shared: false, allDay: false },
      { title: 'Lunch with Alex',     startDate: dt(12,30), endDate: dt(13,30), color: '#10B981', location: 'Sweetgreen',        shared: true,  allDay: false },
      { title: 'Coffee with Maya ☕', startDate: dt(15, 0), endDate: dt(15,45), color: '#EC4899', location: 'Joe Coffee',         shared: false, allDay: false },
      { title: 'Pilates Class',       startDate: dt(17,30), endDate: dt(18,30), color: '#8B5CF6', location: 'Studio 1',           shared: false, allDay: false },
    ];
    for (const ev of jordanEvents) {
      const r = await post(`/households/${hhId}/events`, ev, tokJ);
      if (r) console.log(`  ✓ ${ev.title}`);
    }
  }

  // ── 5. Tasks for today (household) ──────────────────────────────────────
  console.log('\n▸ Tasks');
  // Delete completed tasks first to avoid stale state, then add fresh ones
  const existingTasks = await get(`/households/${hhId}/tasks`, tokA);
  const taskList = Array.isArray(existingTasks) ? existingTasks : (existingTasks?.data ?? []);
  console.log(`  Found ${taskList.length} existing tasks`);

  if (taskList.length === 0) {
    // Re-seed tasks if empty
    const newTasks = [
      { title: 'Book hotel in Florence 🏨', description: 'Check Airbnb and Booking.com', dueDate: new Date(Date.now() + 7*86400000).toISOString(), priority: 'HIGH', category: 'Travel', shared: true },
      { title: 'Get Euros before trip', dueDate: new Date(Date.now() + 12*86400000).toISOString(), category: 'Finance', shared: false },
      { title: 'Pack for Europe trip 🧳', dueDate: new Date(Date.now() + 16*86400000).toISOString(), priority: 'HIGH', category: 'Travel', shared: true },
      { title: 'Buy wedding card (Sarah & Mike)', dueDate: new Date(Date.now() + 8*86400000).toISOString(), category: 'Social', shared: true },
      { title: 'Write anniversary card 💌', dueDate: new Date(Date.now() + 24*86400000).toISOString(), category: 'Personal', shared: false },
      { title: 'Book anniversary dinner reservation', dueDate: new Date(Date.now() + 20*86400000).toISOString(), priority: 'HIGH', category: 'Social', shared: true },
      { title: 'Renew car insurance', dueDate: new Date(Date.now() + 21*86400000).toISOString(), category: 'Finance', shared: false },
      { title: 'Fix the balcony light', category: 'Home', shared: true },
      { title: 'Prepare team offsite presentation', dueDate: new Date(Date.now() + 14*86400000).toISOString(), priority: 'HIGH', category: 'Work', shared: false },
      { title: 'Read "Atomic Habits" (finish last 80 pages)', category: 'Personal', shared: false },
      { title: 'Research European eSIM options', category: 'Travel', shared: true },
      { title: 'Schedule kitchen deep-clean service', category: 'Home', shared: true },
      { title: 'Pick a joint savings goal for 2027', category: 'Finance', shared: true },
      { title: 'Clean bathrooms', category: 'Cleaning', isChore: true, shared: true },
      { title: 'Do laundry', category: 'Laundry', isChore: true, shared: true },
      { title: 'Water the plants 🌿', category: 'Garden', isChore: true, shared: true },
    ];
    for (const t of newTasks) {
      const r = await post(`/households/${hhId}/tasks`, t, tokA);
      if (r) console.log(`  ✓ Task: ${t.title}`);
    }
  }

  // ── 6. Habits ────────────────────────────────────────────────────────────
  console.log('\n▸ Habits (routines)');
  const existingHabits = await get(`/households/${hhId}/routines`, tokA);
  const habitList = Array.isArray(existingHabits) ? existingHabits : (existingHabits?.data ?? []);
  if (habitList.length === 0) {
    const habits = [
      { title: 'Morning workout',  emoji: '💪', time: '06:30', days: [1,2,3,4,5], category: 'fitness',     color: '#06B6D4', frequency: 'DAILY' },
      { title: 'Drink 8 glasses',  emoji: '💧', time: '08:00', days: [0,1,2,3,4,5,6], category: 'health', color: '#3B82F6', frequency: 'DAILY' },
      { title: 'Journal entry',    emoji: '📓', time: '21:00', days: [0,1,2,3,4,5,6], category: 'mindfulness', color: '#8B5CF6', frequency: 'DAILY' },
      { title: 'Evening walk',     emoji: '🚶', time: '19:00', days: [1,2,3,4,5],     category: 'wellness',  color: '#10B981', frequency: 'DAILY' },
      { title: 'Read 20 minutes',  emoji: '📚', time: '22:00', days: [0,1,2,3,4,5,6], category: 'personal', color: '#F59E0B', frequency: 'DAILY' },
      { title: 'Meditate',         emoji: '🧘', time: '07:00', days: [0,1,2,3,4,5,6], category: 'mindfulness', color: '#EC4899', frequency: 'DAILY' },
    ];
    const ids = [];
    for (const h of habits) {
      const r = await post(`/households/${hhId}/routines`, h, tokA);
      if (r) { ids.push(r.id); console.log(`  ✓ ${h.title}`); }
    }
    for (let i = 0; i < Math.min(3, ids.length); i++) {
      await patch(`/households/${hhId}/routines/${ids[i]}/toggle`, undefined, tokA);
    }
  } else {
    console.log(`  ✓ ${habitList.length} habits already exist`);
    // Toggle first 3 as done for today
    for (let i = 0; i < Math.min(3, habitList.length); i++) {
      await patch(`/households/${hhId}/routines/${habitList[i].id}/toggle`, undefined, tokA);
    }
    console.log('  ✓ Toggled first 3 as completed today');
  }

  // ── 7. Journal for today ─────────────────────────────────────────────────
  console.log('\n▸ Journal');
  const j = await post('/journal', {
    date: todayStr, mood: 5, gratitude: 'This morning',
    note: "Woke up early before my alarm. Workout done, coffee made, feeling settled before the day even started. There's something about getting ahead of the day instead of chasing it.",
  }, tokA);
  console.log(j ? '  ✓ Journal logged' : '  ⚠ Already exists');

  // ── 8. Family/Parenting: children events & chores ────────────────────────
  console.log('\n▸ Children events (family/parenting mode)');
  const childrenRes = await get(`/households/${hhId}/children`, tokA);
  const children = Array.isArray(childrenRes) ? childrenRes : (childrenRes?.data ?? []);
  console.log(`  Found ${children.length} children: ${children.map(c=>c.name).join(', ')}`);

  // Children's events need to be created by Alex (parent) and linked —
  // create events "for" each child so they appear on the family schedule
  const childEvents = [
    { childName: 'Mia', events: [
      { title: "Mia's Ballet Class 🩰", startDate: dt(15,30), endDate: dt(16,30), color: '#EC4899', location: 'Dance Studio', shared: true, allDay: false },
      { title: "School pickup — Mia", startDate: dt(14,45), endDate: dt(15,15), color: '#F97316', shared: true, allDay: false },
    ]},
    { childName: 'Leo', events: [
      { title: "Leo's Soccer Practice ⚽", startDate: dt(16, 0), endDate: dt(17, 0), color: '#F59E0B', location: 'Riverside Field', shared: true, allDay: false },
      { title: "School pickup — Leo", startDate: dt(14,45), endDate: dt(15,15), color: '#F97316', shared: true, allDay: false },
    ]},
    { childName: 'Zoe', events: [
      { title: "Zoe's Playdate 🧸", startDate: dt(14, 0), endDate: dt(16, 0), color: '#10B981', location: "Sophie's place", shared: true, allDay: false },
    ]},
  ];

  for (const { childName, events: evs } of childEvents) {
    const child = children.find(c => c.name.startsWith(childName));
    if (!child) { console.log(`  ⚠ ${childName} not found`); continue; }
    for (const ev of evs) {
      // Tag the title to associate with child — API doesn't have child assignee, title makes it clear
      const r = await post(`/households/${hhId}/events`, ev, tokA);
      if (r) console.log(`  ✓ ${ev.title}`);
    }
  }

  // ── Done ─────────────────────────────────────────────────────────────────
  console.log('\n✅  Today patch complete!\n');
  console.log(`  Date: ${todayStr}`);
  console.log('  ✓ Wellness, meal plan, journal for Alex');
  console.log('  ✓ 4 calendar events for Alex');
  console.log('  ✓ 4 calendar events for Jordan');
  console.log('  ✓ Children events (ballet, soccer, playdate)');
  console.log('  ✓ Tasks + habits seeded\n');
}

main().catch(err => { console.error('Failed:', err); process.exit(1); });
