#!/usr/bin/env node
/**
 * Sivena demo seed script
 * Populates the platform with realistic data for screenshots / store listings
 */

const BASE = 'https://sivena-api-production.up.railway.app/api/v1';

const today = new Date();
const d = (offsetDays, h = 0, m = 0) => {
  const dt = new Date(today);
  dt.setDate(dt.getDate() + offsetDays);
  dt.setHours(h, m, 0, 0);
  return dt.toISOString();
};

// ── helpers ───────────────────────────────────────────────────────────────────
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
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) {
    console.error(`  ✗ ${method} ${path} → ${res.status}`, JSON.stringify(json).slice(0, 300));
    return null;
  }
  return json.data ?? json;
}

const post  = (path, body, token) => req('POST',  path, body, token);
const patch = (path, body, token) => req('PATCH', path, body, token);

// ── main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🌱  Sivena seed starting…\n');

  // ── 1. Login primary user ─────────────────────────────────────────────────
  console.log('▸ Auth: primary user');
  const EMAIL_A = 'alex.sivena.demo@gmail.com';
  const PASSWORD = 'Demo2026#';

  const primary = await post('/auth/login', { email: EMAIL_A, password: PASSWORD });
  if (!primary?.accessToken) { console.error('Cannot authenticate primary user', primary); process.exit(1); }
  const tokenA = primary.accessToken;
  const userA  = primary.user;
  console.log(`  ✓ ${userA.name} (${userA.id})`);

  const hhId = 'cmsd61iqg0095u3xo3w4qnhd3'; // Alex's household
  console.log(`  ✓ Household: ${hhId}`);

  // ── 2. Calendar events ────────────────────────────────────────────────────
  console.log('\n▸ Calendar events');
  const events = [
    { title: "Alex's Birthday Dinner", startDate: d(3, 19, 0), endDate: d(3, 21, 30), color: '#FF6B35', location: 'Nobu Restaurant, NYC', shared: true, allDay: false },
    { title: 'Yoga Class', startDate: d(1, 7, 0), endDate: d(1, 8, 0), color: '#8B5CF6', location: 'Harmony Studio', shared: false, allDay: false, recurring: 'WEEKLY' },
    { title: 'Grocery Run', startDate: d(2, 10, 0), endDate: d(2, 11, 0), color: '#10B981', location: 'Whole Foods', shared: true, allDay: false },
    { title: 'Weekend Getaway ✈️', startDate: d(6, 9, 0), endDate: d(8, 20, 0), color: '#F59E0B', location: 'Montauk, NY', shared: true, allDay: false },
    { title: 'Doctor Appointment', startDate: d(4, 14, 30), endDate: d(4, 15, 30), color: '#EF4444', location: 'City Medical Center', shared: false, allDay: false },
    { title: 'Date Night 🌙', startDate: d(5, 19, 30), endDate: d(5, 22, 0), color: '#EC4899', location: 'Lure Fishbar', shared: true, allDay: false },
    { title: 'Gym Session', startDate: d(0, 6, 30), endDate: d(0, 7, 30), color: '#06B6D4', location: 'Equinox', shared: false, allDay: false, recurring: 'DAILY' },
    { title: "Jordan's Work Presentation", startDate: d(3, 10, 0), endDate: d(3, 11, 30), color: '#6366F1', shared: false, allDay: false },
    { title: 'Family Brunch', startDate: d(9, 11, 0), endDate: d(9, 13, 0), color: '#F97316', location: "Mom's House", shared: true, allDay: false },
    { title: 'Movie Night 🍿', startDate: d(1, 20, 0), endDate: d(1, 22, 30), color: '#8B5CF6', shared: true, allDay: false },
  ];

  for (const ev of events) {
    const r = await post(`/households/${hhId}/events`, ev, tokenA);
    if (r) console.log(`  ✓ Event: ${ev.title}`);
  }

  // ── 3. Meals library ──────────────────────────────────────────────────────
  console.log('\n▸ Meals library');
  // DTO: title (req), type (BREAKFAST|LUNCH|DINNER|SNACK req), emoji, prepTime, servings, tags, ingredients, notes
  const meals = [
    {
      title: 'Avocado Toast & Eggs', emoji: '🥑', type: 'BREAKFAST', prepTime: 10, servings: 2,
      tags: ['healthy'],
      ingredients: [{ name: 'Avocado', quantity: '2', unit: 'whole' }, { name: 'Sourdough bread', quantity: '4', unit: 'slices' }, { name: 'Eggs', quantity: '4', unit: 'whole' }],
    },
    {
      title: 'Greek Yogurt Parfait', emoji: '🫐', type: 'BREAKFAST', prepTime: 5, servings: 2,
      tags: ['quick'],
      ingredients: [{ name: 'Greek yogurt', quantity: '2', unit: 'cups' }, { name: 'Granola', quantity: '1', unit: 'cup' }, { name: 'Mixed berries', quantity: '1', unit: 'cup' }],
    },
    {
      title: 'Smoothie Bowl', emoji: '🫙', type: 'BREAKFAST', prepTime: 8, servings: 1,
      tags: ['healthy'],
      ingredients: [{ name: 'Frozen açaí', quantity: '100', unit: 'g' }, { name: 'Banana', quantity: '1', unit: 'whole' }, { name: 'Almond milk', quantity: '0.5', unit: 'cup' }],
    },
    {
      title: 'Chicken Caesar Salad', emoji: '🥗', type: 'LUNCH', prepTime: 15, servings: 2,
      tags: ['light'],
      ingredients: [{ name: 'Romaine lettuce', quantity: '1', unit: 'head' }, { name: 'Chicken breast', quantity: '2', unit: 'pieces' }, { name: 'Parmesan', quantity: '50', unit: 'g' }, { name: 'Caesar dressing', quantity: '3', unit: 'tbsp' }],
    },
    {
      title: 'Veggie Wrap', emoji: '🌯', type: 'LUNCH', prepTime: 10, servings: 2,
      tags: ['vegan'],
      ingredients: [{ name: 'Whole wheat tortillas', quantity: '4', unit: 'pieces' }, { name: 'Hummus', quantity: '4', unit: 'tbsp' }, { name: 'Cucumber', quantity: '1', unit: 'whole' }, { name: 'Bell pepper', quantity: '1', unit: 'whole' }],
    },
    {
      title: 'Caprese Salad', emoji: '🍅', type: 'LUNCH', prepTime: 10, servings: 2,
      tags: ['light', 'italian'],
      ingredients: [{ name: 'Fresh mozzarella', quantity: '200', unit: 'g' }, { name: 'Tomatoes', quantity: '4', unit: 'whole' }, { name: 'Fresh basil', quantity: '1', unit: 'bunch' }, { name: 'Olive oil', quantity: '2', unit: 'tbsp' }],
    },
    {
      title: 'Grilled Salmon & Quinoa', emoji: '🐟', type: 'DINNER', prepTime: 30, servings: 2,
      tags: ['healthy', 'protein'],
      ingredients: [{ name: 'Salmon fillets', quantity: '2', unit: 'pieces' }, { name: 'Quinoa', quantity: '1', unit: 'cup' }, { name: 'Asparagus', quantity: '1', unit: 'bunch' }, { name: 'Lemon', quantity: '1', unit: 'whole' }],
    },
    {
      title: 'Pasta Carbonara', emoji: '🍝', type: 'DINNER', prepTime: 25, servings: 4,
      tags: ['comfort'],
      ingredients: [{ name: 'Spaghetti', quantity: '400', unit: 'g' }, { name: 'Pancetta', quantity: '150', unit: 'g' }, { name: 'Eggs', quantity: '4', unit: 'whole' }, { name: 'Pecorino romano', quantity: '100', unit: 'g' }],
    },
    {
      title: 'Beef Tacos', emoji: '🌮', type: 'DINNER', prepTime: 20, servings: 4,
      tags: ['family'],
      ingredients: [{ name: 'Ground beef', quantity: '500', unit: 'g' }, { name: 'Taco shells', quantity: '12', unit: 'pieces' }, { name: 'Shredded cheese', quantity: '1', unit: 'cup' }, { name: 'Salsa', quantity: '0.5', unit: 'cup' }],
    },
    {
      title: 'Mixed Nuts & Fruit', emoji: '🍎', type: 'SNACK', prepTime: 2, servings: 2,
      tags: ['healthy'],
      ingredients: [{ name: 'Mixed nuts', quantity: '0.5', unit: 'cup' }, { name: 'Apple', quantity: '2', unit: 'whole' }],
    },
  ];

  const mealIds = {};
  for (const meal of meals) {
    const r = await post(`/households/${hhId}/meals`, meal, tokenA);
    if (r) { mealIds[meal.title] = r.id; console.log(`  ✓ Meal: ${meal.title}`); }
  }

  // ── 4. Meal plans — one slot per request ──────────────────────────────────
  // DTO: date (req), mealType (BREAKFAST|LUNCH|DINNER|SNACK req), mealId?, customTitle?
  console.log('\n▸ Meal plans');
  const planSlots = [
    // Yesterday
    { date: d(-1).split('T')[0], mealType: 'BREAKFAST', title: 'Greek Yogurt Parfait' },
    { date: d(-1).split('T')[0], mealType: 'LUNCH',     title: 'Chicken Caesar Salad' },
    { date: d(-1).split('T')[0], mealType: 'DINNER',    title: 'Grilled Salmon & Quinoa' },
    { date: d(-1).split('T')[0], mealType: 'SNACK',     title: 'Mixed Nuts & Fruit' },
    // Today
    { date: d(0).split('T')[0],  mealType: 'BREAKFAST', title: 'Avocado Toast & Eggs' },
    { date: d(0).split('T')[0],  mealType: 'LUNCH',     title: 'Veggie Wrap' },
    { date: d(0).split('T')[0],  mealType: 'DINNER',    title: 'Pasta Carbonara' },
    // Tomorrow
    { date: d(1).split('T')[0],  mealType: 'BREAKFAST', title: 'Smoothie Bowl' },
    { date: d(1).split('T')[0],  mealType: 'LUNCH',     title: 'Caprese Salad' },
    { date: d(1).split('T')[0],  mealType: 'DINNER',    title: 'Beef Tacos' },
    { date: d(1).split('T')[0],  mealType: 'SNACK',     title: 'Mixed Nuts & Fruit' },
    // Day +2
    { date: d(2).split('T')[0],  mealType: 'BREAKFAST', title: 'Greek Yogurt Parfait' },
    { date: d(2).split('T')[0],  mealType: 'LUNCH',     title: 'Chicken Caesar Salad' },
    { date: d(2).split('T')[0],  mealType: 'DINNER',    title: 'Grilled Salmon & Quinoa' },
    // Day +3
    { date: d(3).split('T')[0],  mealType: 'BREAKFAST', title: 'Avocado Toast & Eggs' },
    { date: d(3).split('T')[0],  mealType: 'LUNCH',     title: 'Veggie Wrap' },
    { date: d(3).split('T')[0],  mealType: 'DINNER',    title: 'Pasta Carbonara' },
  ];

  for (const slot of planSlots) {
    const mealId = mealIds[slot.title];
    const body = mealId
      ? { date: slot.date, mealType: slot.mealType, mealId }
      : { date: slot.date, mealType: slot.mealType, customTitle: slot.title };
    const r = await post(`/households/${hhId}/meals/plans`, body, tokenA);
    if (r) console.log(`  ✓ Plan: ${slot.date} ${slot.mealType} — ${slot.title}`);
  }

  // ── 5. Journal entries ────────────────────────────────────────────────────
  // DTO: date (req), note (req), mood (1-5, optional), gratitude (optional)
  console.log('\n▸ Journal entries');
  const journals = [
    { date: d(-6).split('T')[0], mood: 4, gratitude: 'A quiet Sunday',         note: "Spent the whole morning in bed reading. Jordan made coffee and we just existed together quietly — no plans, no pressure. These slow days are becoming my favorite kind. Feeling so grateful for this season of life." },
    { date: d(-5).split('T')[0], mood: 3, gratitude: 'Unexpected kindness',    note: "A stranger held the elevator for me even though I was clearly far away. Such a small thing but it changed my whole mood. I want to be that person for someone else this week." },
    { date: d(-4).split('T')[0], mood: 5, gratitude: 'Progress on the project', note: "Finally cracked the design problem I've been sitting with for two weeks. The solution was simpler than I made it. I need to remember to step away more often — clarity comes when I stop forcing it." },
    { date: d(-3).split('T')[0], mood: 4, gratitude: 'Good food, good people', note: "Dinner at home tonight. We made pasta from scratch — flour everywhere, Jordan laughing at my terrible knife skills. I don't think I've laughed that hard in months. I want more evenings like this." },
    { date: d(-2).split('T')[0], mood: 5, gratitude: 'My health',              note: "Had a really strong workout this morning. Energy has been great lately. Sleeping better, eating better. It's funny how everything compounds — one good habit makes the others easier." },
    { date: d(-1).split('T')[0], mood: 4, gratitude: 'Time to think',          note: "Walked to the park after lunch. No headphones, no phone. Just the sound of the city and my own thoughts. I've been so plugged in lately — this was exactly what I needed. Going to try to make it a weekly ritual." },
    { date: d(0).split('T')[0],  mood: 5, gratitude: 'This morning',           note: "Woke up early before my alarm. Lay there feeling content. Not happy about anything specific — just… settled. That's a rare feeling and I want to remember it. Writing this down so I can come back to it on harder days." },
  ];

  for (const j of journals) {
    const r = await post('/journal', j, tokenA);
    if (r) console.log(`  ✓ Journal: ${j.gratitude}`);
  }

  // ── 6. Wellness entries ───────────────────────────────────────────────────
  // DTO: date (req), mood (1-5 req), sleep (0-24 req), water (req), exercise?, note?
  // water = glasses (integer), sleep = hours
  console.log('\n▸ Wellness entries');
  const wellness = [
    { date: d(-6).split('T')[0], mood: 4, sleep: 8,   water: 8, exercise: true,  note: 'Great rest day. Feeling recovered.' },
    { date: d(-5).split('T')[0], mood: 3, sleep: 6,   water: 5, exercise: false, note: 'Bit tired today. Work was intense.' },
    { date: d(-4).split('T')[0], mood: 5, sleep: 7.5, water: 8, exercise: true,  note: 'Smashed my workout. Feeling strong.' },
    { date: d(-3).split('T')[0], mood: 4, sleep: 7,   water: 7, exercise: true,  note: 'Solid day overall.' },
    { date: d(-2).split('T')[0], mood: 5, sleep: 8.5, water: 8, exercise: true,  note: 'Best sleep in weeks. Energy through the roof.' },
    { date: d(-1).split('T')[0], mood: 4, sleep: 7.5, water: 6, exercise: false, note: 'Chose rest over gym — good call.' },
    { date: d(0).split('T')[0],  mood: 5, sleep: 8,   water: 4, exercise: true,  note: 'Morning workout done. Productive day ahead.' },
  ];

  for (const w of wellness) {
    const r = await post('/wellness', w, tokenA);
    if (r) console.log(`  ✓ Wellness: ${w.date}`);
  }

  // ── 7. Lists ──────────────────────────────────────────────────────────────
  // List DTO: name (req), shared?
  // Item DTO: name (req), quantity?, unit?, category?
  console.log('\n▸ Lists');

  const grocery = await post(`/households/${hhId}/lists`, { name: 'Weekly Groceries 🛒', shared: true }, tokenA);
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
    const createdItems = [];
    for (const item of items) {
      const r = await post(`/households/${hhId}/lists/${grocery.id}/items`, item, tokenA);
      if (r) createdItems.push(r);
    }
    // Toggle first 3 items as checked (already picked up)
    for (let i = 0; i < Math.min(3, createdItems.length); i++) {
      await patch(`/households/${hhId}/lists/${grocery.id}/items/${createdItems[i].id}/toggle`, undefined, tokenA);
    }
    console.log(`  ✓ List: Weekly Groceries (${createdItems.length} items)`);
  }

  const tasks = await post(`/households/${hhId}/lists`, { name: 'Home Tasks 🏠', shared: true }, tokenA);
  if (tasks) {
    const items = [
      { name: 'Clean bathrooms', category: 'Cleaning' },
      { name: 'Do laundry', category: 'Laundry' },
      { name: 'Vacuum living room', category: 'Cleaning' },
      { name: 'Water the plants', category: 'Garden' },
      { name: 'Call internet provider', category: 'Admin' },
      { name: 'Book car service', category: 'Admin' },
      { name: 'Organise wardrobe', category: 'Organisation' },
    ];
    const createdItems = [];
    for (const item of items) {
      const r = await post(`/households/${hhId}/lists/${tasks.id}/items`, item, tokenA);
      if (r) createdItems.push(r);
    }
    // Toggle first 2 as done
    for (let i = 0; i < Math.min(2, createdItems.length); i++) {
      await patch(`/households/${hhId}/lists/${tasks.id}/items/${createdItems[i].id}/toggle`, undefined, tokenA);
    }
    console.log(`  ✓ List: Home Tasks (${createdItems.length} items)`);
  }

  const packing = await post(`/households/${hhId}/lists`, { name: 'Montauk Packing List 🏖️', shared: true }, tokenA);
  if (packing) {
    const items = [
      { name: 'Sunscreen SPF50', category: 'Personal' },
      { name: 'Swimwear', quantity: 2, category: 'Clothing' },
      { name: 'Beach towels', quantity: 2, category: 'Essentials' },
      { name: 'Camera', category: 'Electronics' },
      { name: 'Portable charger', category: 'Electronics' },
      { name: 'Snacks for the drive', category: 'Food' },
      { name: 'Book / Kindle', category: 'Entertainment' },
    ];
    const createdItems = [];
    for (const item of items) {
      const r = await post(`/households/${hhId}/lists/${packing.id}/items`, item, tokenA);
      if (r) createdItems.push(r);
    }
    // Toggle first 2 as packed
    for (let i = 0; i < Math.min(2, createdItems.length); i++) {
      await patch(`/households/${hhId}/lists/${packing.id}/items/${createdItems[i].id}/toggle`, undefined, tokenA);
    }
    console.log(`  ✓ List: Montauk Packing (${createdItems.length} items)`);
  }

  // ── 8. Goals ─────────────────────────────────────────────────────────────
  // Create DTO: title (req), target (req, Min: 1), unit?, deadline?, color?
  // Update DTO adds: progress?
  console.log('\n▸ Goals');
  const goals = [
    { title: 'Run a 5K',              target: 5,    unit: 'km',      deadline: d(90).split('T')[0],  color: '#10B981', progress: 2 },
    { title: 'Save for Europe Trip',  target: 8000, unit: 'dollars', deadline: d(180).split('T')[0], color: '#F59E0B', progress: 4400 },
    { title: 'Read 12 Books',         target: 12,   unit: 'books',   deadline: d(150).split('T')[0], color: '#8B5CF6', progress: 8 },
    { title: 'Cook New Recipes',      target: 52,   unit: 'recipes', deadline: d(60).split('T')[0],  color: '#EC4899', progress: 39 },
    { title: 'Meditate Daily',        target: 30,   unit: 'sessions',deadline: d(30).split('T')[0],  color: '#06B6D4', progress: 9 },
  ];

  for (const goal of goals) {
    const { progress, ...createBody } = goal;
    const r = await post(`/households/${hhId}/goals`, createBody, tokenA);
    if (r) {
      await patch(`/households/${hhId}/goals/${r.id}`, { progress }, tokenA);
      console.log(`  ✓ Goal: ${goal.title} (${progress}/${goal.target} ${goal.unit})`);
    }
  }

  // ── 9. Circles ────────────────────────────────────────────────────────────
  console.log('\n▸ Circles');
  const circles = [
    { name: 'Family',       description: 'Parents, siblings, and close family', emoji: '👨‍👩‍👧‍👦', color: '#FF6B35' },
    { name: 'Work Friends', description: 'Colleagues we actually like',          emoji: '💼',        color: '#6366F1' },
    { name: 'College Crew', description: 'Friends from NYU days',               emoji: '🎓',        color: '#10B981' },
    { name: 'Gym Buddies',  description: 'Morning workout squad',               emoji: '💪',        color: '#F59E0B' },
  ];

  for (const circle of circles) {
    const r = await post('/circles', circle, tokenA);
    if (r) console.log(`  ✓ Circle: ${circle.name}`);
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  console.log('\n✅  Seed complete!\n');
  console.log('Demo account credentials:');
  console.log(`  Email:    ${EMAIL_A}`);
  console.log(`  Password: ${PASSWORD}`);
  console.log(`  HH ID:    ${hhId}\n`);
}

main().catch(err => { console.error('Seed failed:', err); process.exit(1); });


 Email: alex.sivena.demo@gmail.com
  - Password: Demo2026#