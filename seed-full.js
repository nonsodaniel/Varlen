#!/usr/bin/env node
/**
 * Sivena — full 3-month history seed
 * Creates a realistic active account with data across all platform features
 */

const BASE = 'https://sivena-api-production.up.railway.app/api/v1';
const hhId = 'cmsd61iqg0095u3xo3w4qnhd3';

const today = new Date();
today.setHours(0, 0, 0, 0);

const d = (offsetDays, h = 12, m = 0) => {
  const dt = new Date(today);
  dt.setDate(dt.getDate() + offsetDays);
  dt.setHours(h, m, 0, 0);
  return dt.toISOString();
};
const ds = (offsetDays) => d(offsetDays).split('T')[0];

async function req(method, path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) {
    const msg = JSON.stringify(json).slice(0, 120);
    process.stdout.write(`  ✗ ${method} ${path.slice(0, 50)} → ${res.status} ${msg}\n`);
    return null;
  }
  return json.data ?? json;
}

const post  = (p, b, t) => req('POST',  p, b, t);
const patch = (p, b, t) => req('PATCH', p, b, t);
const get   = (p, t)    => req('GET',   p, undefined, t);

// ── small helpers ──────────────────────────────────────────────────────────
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const between = (a, b) => Math.round((Math.random() * (b - a) + a) * 10) / 10;

async function main() {
  console.log('\n🌱  Full 3-month seed starting…\n');

  // ── Auth ──────────────────────────────────────────────────────────────────
  const primary = await post('/auth/login', { email: 'alex.sivena.demo@gmail.com', password: 'Demo2026#' });
  if (!primary?.accessToken) { console.error('Auth failed'); process.exit(1); }
  const tok = primary.accessToken;
  console.log(`✓ Auth: ${primary.user.name}`);

  // ── Fetch existing meals for meal plan use ─────────────────────────────
  const mealsRes = await get(`/households/${hhId}/meals`, tok);
  const meals = (Array.isArray(mealsRes) ? mealsRes : mealsRes?.data ?? []);
  const byType = { BREAKFAST: [], LUNCH: [], DINNER: [], SNACK: [] };
  for (const m of meals) if (byType[m.type]) byType[m.type].push(m.id);
  console.log(`✓ Found ${meals.length} existing meals`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. CALENDAR EVENTS — 60 spread over 3 months
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n▸ Calendar events');
  const events = [
    // ── Past recurring gym sessions ──
    { title: 'Gym Session', startDate: d(-84, 6,30), endDate: d(-84, 7,30), color: '#06B6D4', location: 'Equinox', shared: false, allDay: false },
    { title: 'Gym Session', startDate: d(-81, 6,30), endDate: d(-81, 7,30), color: '#06B6D4', location: 'Equinox', shared: false, allDay: false },
    { title: 'Yoga Class',  startDate: d(-80, 7, 0), endDate: d(-80, 8, 0), color: '#8B5CF6', location: 'Harmony Studio', shared: false, allDay: false },
    { title: 'Gym Session', startDate: d(-77, 6,30), endDate: d(-77, 7,30), color: '#06B6D4', location: 'Equinox', shared: false, allDay: false },
    { title: 'Yoga Class',  startDate: d(-73, 7, 0), endDate: d(-73, 8, 0), color: '#8B5CF6', location: 'Harmony Studio', shared: false, allDay: false },
    { title: 'Gym Session', startDate: d(-70, 6,30), endDate: d(-70, 7,30), color: '#06B6D4', location: 'Equinox', shared: false, allDay: false },
    { title: 'Gym Session', startDate: d(-67, 6,30), endDate: d(-67, 7,30), color: '#06B6D4', location: 'Equinox', shared: false, allDay: false },
    { title: 'Yoga Class',  startDate: d(-66, 7, 0), endDate: d(-66, 8, 0), color: '#8B5CF6', location: 'Harmony Studio', shared: false, allDay: false },
    { title: 'Gym Session', startDate: d(-63, 6,30), endDate: d(-63, 7,30), color: '#06B6D4', location: 'Equinox', shared: false, allDay: false },
    { title: 'Gym Session', startDate: d(-60, 6,30), endDate: d(-60, 7,30), color: '#06B6D4', location: 'Equinox', shared: false, allDay: false },
    { title: 'Yoga Class',  startDate: d(-59, 7, 0), endDate: d(-59, 8, 0), color: '#8B5CF6', location: 'Harmony Studio', shared: false, allDay: false },
    { title: 'Gym Session', startDate: d(-56, 6,30), endDate: d(-56, 7,30), color: '#06B6D4', location: 'Equinox', shared: false, allDay: false },
    { title: 'Gym Session', startDate: d(-53, 6,30), endDate: d(-53, 7,30), color: '#06B6D4', location: 'Equinox', shared: false, allDay: false },
    { title: 'Yoga Class',  startDate: d(-52, 7, 0), endDate: d(-52, 8, 0), color: '#8B5CF6', location: 'Harmony Studio', shared: false, allDay: false },
    { title: 'Gym Session', startDate: d(-49, 6,30), endDate: d(-49, 7,30), color: '#06B6D4', location: 'Equinox', shared: false, allDay: false },
    { title: 'Gym Session', startDate: d(-46, 6,30), endDate: d(-46, 7,30), color: '#06B6D4', location: 'Equinox', shared: false, allDay: false },
    { title: 'Yoga Class',  startDate: d(-45, 7, 0), endDate: d(-45, 8, 0), color: '#8B5CF6', location: 'Harmony Studio', shared: false, allDay: false },
    { title: 'Gym Session', startDate: d(-42, 6,30), endDate: d(-42, 7,30), color: '#06B6D4', location: 'Equinox', shared: false, allDay: false },
    { title: 'Gym Session', startDate: d(-39, 6,30), endDate: d(-39, 7,30), color: '#06B6D4', location: 'Equinox', shared: false, allDay: false },
    { title: 'Yoga Class',  startDate: d(-38, 7, 0), endDate: d(-38, 8, 0), color: '#8B5CF6', location: 'Harmony Studio', shared: false, allDay: false },
    { title: 'Gym Session', startDate: d(-35, 6,30), endDate: d(-35, 7,30), color: '#06B6D4', location: 'Equinox', shared: false, allDay: false },
    { title: 'Gym Session', startDate: d(-32, 6,30), endDate: d(-32, 7,30), color: '#06B6D4', location: 'Equinox', shared: false, allDay: false },
    { title: 'Yoga Class',  startDate: d(-31, 7, 0), endDate: d(-31, 8, 0), color: '#8B5CF6', location: 'Harmony Studio', shared: false, allDay: false },
    { title: 'Gym Session', startDate: d(-28, 6,30), endDate: d(-28, 7,30), color: '#06B6D4', location: 'Equinox', shared: false, allDay: false },
    { title: 'Gym Session', startDate: d(-25, 6,30), endDate: d(-25, 7,30), color: '#06B6D4', location: 'Equinox', shared: false, allDay: false },
    { title: 'Yoga Class',  startDate: d(-24, 7, 0), endDate: d(-24, 8, 0), color: '#8B5CF6', location: 'Harmony Studio', shared: false, allDay: false },
    { title: 'Gym Session', startDate: d(-21, 6,30), endDate: d(-21, 7,30), color: '#06B6D4', location: 'Equinox', shared: false, allDay: false },
    { title: 'Gym Session', startDate: d(-18, 6,30), endDate: d(-18, 7,30), color: '#06B6D4', location: 'Equinox', shared: false, allDay: false },
    { title: 'Gym Session', startDate: d(-14, 6,30), endDate: d(-14, 7,30), color: '#06B6D4', location: 'Equinox', shared: false, allDay: false },
    { title: 'Yoga Class',  startDate: d(-10, 7, 0), endDate: d(-10, 8, 0), color: '#8B5CF6', location: 'Harmony Studio', shared: false, allDay: false },
    // ── Past special events ──
    { title: "Jordan's Birthday Dinner 🎂", startDate: d(-82, 19, 0), endDate: d(-82, 22, 0), color: '#FF6B35', location: 'Le Bernardin, NYC', shared: true, allDay: false },
    { title: 'Date Night — Jazz Bar 🎷',    startDate: d(-75, 20, 0), endDate: d(-75, 23, 0), color: '#EC4899', location: 'Village Vanguard', shared: true, allDay: false },
    { title: 'Brunch with the Millers',     startDate: d(-68, 11, 0), endDate: d(-68, 13, 30), color: '#F97316', location: 'Buvette, West Village', shared: true, allDay: false },
    { title: "Alex's Annual Physical",      startDate: d(-65, 9, 0),  endDate: d(-65, 10, 0), color: '#EF4444', location: 'City Medical Center', shared: false, allDay: false },
    { title: 'Cooking Class 🍳',            startDate: d(-61, 18, 0), endDate: d(-61, 20, 30), color: '#10B981', location: 'Institute of Culinary Education', shared: true, allDay: false },
    { title: 'Weekend at the Hamptons 🏖️',  startDate: d(-57, 14, 0), endDate: d(-55, 18, 0), color: '#F59E0B', location: 'East Hampton, NY', shared: true, allDay: false },
    { title: 'Friends Housewarming Party',  startDate: d(-50, 18, 30), endDate: d(-50, 22, 0), color: '#6366F1', location: "Sam & Claire's place, BK", shared: true, allDay: false },
    { title: 'Dentist Appointment',         startDate: d(-47, 10, 0), endDate: d(-47, 11, 0), color: '#EF4444', location: 'SmileCraft Dental', shared: false, allDay: false },
    { title: 'Date Night — Sushi 🍣',       startDate: d(-43, 19, 30), endDate: d(-43, 21, 30), color: '#EC4899', location: 'Nobu Downtown', shared: true, allDay: false },
    { title: "Mom's Visit 🏠",              startDate: d(-40, 10, 0), endDate: d(-38, 17, 0), color: '#F97316', location: 'Home', shared: true, allDay: false },
    { title: 'Farmers Market',              startDate: d(-36, 9, 0), endDate: d(-36, 11, 0), color: '#10B981', location: 'Union Square Greenmarket', shared: true, allDay: false },
    { title: 'Work All-Hands',              startDate: d(-33, 9, 0), endDate: d(-33, 17, 0), color: '#6366F1', location: 'Office — Midtown', shared: false, allDay: false },
    { title: "Sarah's Bachelorette Brunch", startDate: d(-29, 12, 0), endDate: d(-29, 15, 0), color: '#EC4899', location: 'Pastis, Meatpacking', shared: true, allDay: false },
    { title: 'Museum Day 🎨',               startDate: d(-22, 11, 0), endDate: d(-22, 15, 0), color: '#8B5CF6', location: 'MoMA', shared: true, allDay: false },
    { title: 'Performance Review',          startDate: d(-20, 14, 0), endDate: d(-20, 15, 0), color: '#6366F1', shared: false, allDay: false },
    { title: 'Rooftop Dinner with Friends', startDate: d(-15, 19, 0), endDate: d(-15, 22, 0), color: '#EC4899', location: 'Westlight, Williamsburg', shared: true, allDay: false },
    { title: 'Central Park Run 🏃',         startDate: d(-12, 7, 0), endDate: d(-12, 8, 0), color: '#10B981', location: 'Central Park', shared: false, allDay: false },
    { title: 'Therapy Session',             startDate: d(-11, 12, 0), endDate: d(-11, 13, 0), color: '#8B5CF6', shared: false, allDay: false },
    { title: 'Grocery Run',                 startDate: d(-9, 10, 0), endDate: d(-9, 11, 30), color: '#10B981', location: 'Whole Foods', shared: true, allDay: false },
    // ── Upcoming events ──
    { title: "Sarah & Mike's Wedding 💍",   startDate: d(14, 15, 0), endDate: d(14, 23, 0), color: '#EC4899', location: 'The Plaza Hotel', shared: true, allDay: false },
    { title: 'Team Offsite 🏕️',            startDate: d(18, 9, 0), endDate: d(20, 18, 0), color: '#6366F1', location: 'Hudson Valley', shared: false, allDay: false },
    { title: 'Anniversary Dinner 💑',       startDate: d(28, 19, 30), endDate: d(28, 22, 0), color: '#EC4899', location: 'Daniel, Upper East Side', shared: true, allDay: false },
    { title: 'Europe Trip ✈️',              startDate: d(47, 8, 0), endDate: d(61, 22, 0), color: '#F59E0B', location: 'Rome → Florence → Paris', shared: true, allDay: false },
  ];

  let evCount = 0;
  for (const ev of events) {
    const r = await post(`/households/${hhId}/events`, ev, tok);
    if (r) evCount++;
  }
  console.log(`  ✓ ${evCount}/${events.length} events created`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. MEAL PLANS — past 45 days (3 meals/day)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n▸ Meal plans (45-day history)');
  if (meals.length > 0) {
    let planCount = 0;
    for (let day = -45; day <= -8; day++) {
      const date = ds(day);
      const slots = [
        { mealType: 'BREAKFAST', mealId: pick(byType.BREAKFAST.length ? byType.BREAKFAST : meals.map(m=>m.id)) },
        { mealType: 'LUNCH',     mealId: pick(byType.LUNCH.length ? byType.LUNCH : meals.map(m=>m.id)) },
        { mealType: 'DINNER',    mealId: pick(byType.DINNER.length ? byType.DINNER : meals.map(m=>m.id)) },
      ];
      // Add snack every other day
      if (day % 2 === 0 && byType.SNACK.length) {
        slots.push({ mealType: 'SNACK', mealId: pick(byType.SNACK) });
      }
      for (const slot of slots) {
        const r = await post(`/households/${hhId}/meals/plans`, { date, ...slot }, tok);
        if (r) planCount++;
      }
    }
    console.log(`  ✓ ${planCount} meal plan slots created`);
  } else {
    console.log('  ⚠ No meals found, skipping plans');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. JOURNAL — 45 entries going back 90 days (every 2nd day, skipping last 7)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n▸ Journal (3-month history)');
  const journalEntries = [
    { off: -90, mood: 4, gratitude: 'New beginnings', note: "Started using Sivena today to get more organised. Jordan and I have been meaning to do this for months. Already feel like having everything in one place is going to change how we manage our time together. Excited to see how it goes." },
    { off: -88, mood: 3, gratitude: 'Honest conversations', note: "Had a tough conversation with Jordan about how we divide responsibilities at home. It was uncomfortable but needed. We both want to be better partners. Grateful we can talk about hard things without it becoming a fight." },
    { off: -86, mood: 5, gratitude: 'A perfect Tuesday evening', note: "Cooked together for the first time in weeks — Jordan made the pasta while I handled the sauce. We ate at the table instead of the couch, talked for two hours. No phones. Just us. I want more evenings like this." },
    { off: -84, mood: 4, gratitude: 'Work momentum', note: "Hit a major milestone on the project today. The team is finally aligned and the roadmap is clear. Six months of uncertainty just resolved in one afternoon meeting. Feeling focused and energised." },
    { off: -82, mood: 5, gratitude: "Jordan's birthday", note: "Surprised Jordan with dinner at Le Bernardin. The look on their face when we walked in — I'll remember that forever. We ordered the tasting menu and stayed for three hours. One of the best nights of the past year." },
    { off: -80, mood: 3, gratitude: 'The little things', note: "Nothing dramatic today. Just a quiet Monday — coffee in the morning, a long walk, some work, leftovers for dinner. But I noticed I wasn't anxious. That's the goal. Ordinary days feeling manageable is actually remarkable." },
    { off: -78, mood: 4, gratitude: 'Body feeling strong', note: "Three gym sessions this week. My sleep has been solid. I feel like I'm in a good cycle where each habit reinforces the others. This is what people mean by momentum — I finally get it." },
    { off: -76, mood: 4, gratitude: 'Creative breakthroughs', note: "Spent the morning sketching in a café. No agenda, just exploring. One of my doodles turned into something I actually want to develop. Sometimes the best work comes when you're not trying." },
    { off: -74, mood: 5, gratitude: 'Jazz night', note: "Caught a late set at Village Vanguard. The pianist was extraordinary — one of those performances where you forget you're in a room with other people. Jordan held my hand through the whole set. Perfect night." },
    { off: -72, mood: 3, gratitude: 'Rest', note: "Feeling a bit worn down. The pace at work has been relentless and I think my body is asking for a break. Taking it slower today. Saying no to the evening plans. Rest isn't quitting — it's strategy." },
    { off: -70, mood: 4, gratitude: 'Morning light', note: "Woke up to sunlight actually hitting the apartment at the right angle. Made coffee, stood by the window for ten minutes just watching the street below. Simple, but it felt like a gift." },
    { off: -68, mood: 5, gratitude: 'Old friends', note: "Brunch with the Millers was exactly what I needed. We laughed until it hurt reminiscing about that trip to Portugal. These are the friendships that feel like home regardless of how much time passes between visits." },
    { off: -66, mood: 4, gratitude: 'Focus', note: "Deep work day. Phone on airplane mode, four hours of uninterrupted thinking. I forget how capable I am when I remove all the noise. The output today was some of my best work in months." },
    { off: -64, mood: 3, gratitude: 'Honesty with myself', note: "Admitted to myself that I've been avoiding a difficult conversation at work. Named the fear. It's not about the conversation — it's about being judged. Knowing this doesn't make it easier but it makes it real." },
    { off: -62, mood: 5, gratitude: 'The cooking class', note: "Doing the cooking class with Jordan was one of the most fun things we've done in a while. We were terrible at the pasta folding but we were laughing so hard it didn't matter. Coming home with new skills AND great memories." },
    { off: -60, mood: 4, gratitude: 'Travel anticipation', note: "Started planning the Europe trip in earnest. Booked the flights to Rome. There's something electric about having something big to look forward to. It makes the ordinary days feel like they're building toward something." },
    { off: -58, mood: 5, gratitude: 'The Hamptons weekend', note: "Two days at the beach house completely reset me. Salt air, morning swims, watching sunsets from the deck. Jordan and I barely looked at our phones. This is the life I want to build more of." },
    { off: -56, mood: 4, gratitude: 'Fitness progress', note: "Ran 5km without stopping for the first time. It's been a goal for months and it happened almost accidentally — I just didn't want to stop. My body is getting stronger in ways I can feel." },
    { off: -54, mood: 3, gratitude: 'Patience', note: "Difficult day at work. A project I care about got deprioritised. Feeling the frustration but also trying to hold it loosely — I don't control timelines, I control effort. Reminding myself of the bigger picture." },
    { off: -52, mood: 4, gratitude: 'Sunday rituals', note: "Farmers market, coffee from our favourite cart, cooking something new for Sunday dinner. These weekly rituals have become the anchor of my week. I look forward to them all week long." },
    { off: -50, mood: 5, gratitude: 'Community', note: "Sam and Claire's housewarming was beautiful. Their new place in Brooklyn is exactly them. Being surrounded by people who are all building something — lives, homes, relationships — is genuinely inspiring." },
    { off: -48, mood: 4, gratitude: 'Consistent mornings', note: "Twenty days of morning workouts in a row. I never thought I was a morning person but it turns out I just needed the right reason. The day feels completely different when I've already done something hard before 8am." },
    { off: -46, mood: 3, gratitude: 'Slowing down', note: "Been running at 100% for too long. The dentist appointment today was a good reminder to take care of the basics. I schedule everything for others but forget to schedule things for myself." },
    { off: -44, mood: 4, gratitude: 'Evening walks', note: "Jordan and I have started taking evening walks after dinner. No agenda — just 30 minutes around the neighbourhood. It's become my favourite part of the day. We talk about things we'd never bring up at home." },
    { off: -42, mood: 5, gratitude: 'Good sleep', note: "Slept nine hours. Woke up feeling genuinely rested for the first time in weeks. Everything looks different when you're not running on fumes. Going to protect sleep like it's sacred because apparently it is." },
    { off: -40, mood: 4, gratitude: "Mom's visit", note: "Mom arrived today. She immediately started reorganising my kitchen which would normally drive me crazy — but I just watched her and felt grateful that she still cares enough to do it." },
    { off: -38, mood: 4, gratitude: 'Letting go', note: "Mom left today. Said goodbye at the airport and cried a little on the train home. Jordan was waiting with tea when I got back. These are the small moments that feel like everything." },
    { off: -36, mood: 5, gratitude: 'Saturday at the market', note: "Bought too many vegetables at the farmers market again. Came home and spent the afternoon turning them into something. The smell of garlic in olive oil is one of my favourite things in the world." },
    { off: -34, mood: 3, gratitude: 'Difficult feedback', note: "Received some critical feedback on my work today. My first reaction was defensive. My second was to listen. There's something true in it and I want to be the kind of person who grows from this, not shrinks." },
    { off: -32, mood: 4, gratitude: 'Small luxuries', note: "Treated myself to a proper sit-down lunch instead of eating at my desk. A glass of wine at 1pm on a Thursday. Sometimes living well is just refusing to rush." },
    { off: -30, mood: 5, gratitude: 'Bachelorette brunch', note: "Sarah is getting married in two weeks. Watching her at brunch — how happy she is, how settled — was the best reminder that good things do happen. Couldn't be more excited for her." },
    { off: -28, mood: 4, gratitude: 'Being known', note: "Jordan made my coffee exactly the way I like it this morning without being asked, without even thinking about it. Three years in and the small acts of care have become automatic. That's love." },
    { off: -26, mood: 3, gratitude: 'Introspection', note: "A quieter week. Work has slowed down slightly and I find myself uncomfortable with the stillness. Why do I need to be busy to feel okay? Something to explore." },
    { off: -24, mood: 4, gratitude: 'The yoga effect', note: "After yoga this morning I sat on a bench outside and didn't check my phone for 20 minutes. Just sat. My mind was actually quiet. Whatever yoga does to my nervous system, I want more of it." },
    { off: -22, mood: 5, gratitude: 'MoMA Sunday', note: "Spent the whole afternoon at MoMA. Got lost in the photography wing for an hour. Jordan found me standing in front of a Diane Arbus portrait looking completely zoned out. Art does something to my brain I can't explain." },
    { off: -20, mood: 3, gratitude: 'Growth over comfort', note: "Performance review today. It was honest and a bit hard. I'm good at the technical work but need to develop more strategic presence. True, and uncomfortable to hear. Growth requires this." },
    { off: -18, mood: 4, gratitude: 'Progress visible', note: "Looked back at photos from 3 months ago. I look different — more rested, more alive. The work of building good habits is slow and invisible until suddenly it isn't." },
    { off: -16, mood: 5, gratitude: 'Rooftop summer nights', note: "Dinner with friends on a rooftop in Williamsburg. The Manhattan skyline at golden hour. Cold wine. People I love. These are the evenings I'll describe when someone asks me what my life was like this summer." },
    { off: -14, mood: 4, gratitude: 'Routine as foundation', note: "Realised today that I've been running consistently for eight weeks. Not every run was good, but I showed up every time. Consistency is the only thing that actually moves the needle." },
    { off: -12, mood: 5, gratitude: 'Central Park in summer', note: "7am run through Central Park while it was still cool. The light through the trees, other runners nodding in that early-morning solidarity. Finished strong and sat by the Reservoir feeling completely alive." },
    { off: -10, mood: 4, gratitude: 'Quality of attention', note: "Therapy today. We talked about presence — about how being with people means actually being with them, not planning what to say next. Going to practise this." },
    { off: -8, mood: 5, gratitude: 'Summer lightness', note: "Something is different this summer. I feel lighter, more myself. It's the accumulation of small decisions — sleeping more, moving my body, being more present. Hard to point to one thing. It's all of it together." },
  ];

  let jCount = 0;
  for (const j of journalEntries) {
    const { off, ...entry } = j;
    const r = await post('/journal', { ...entry, date: ds(off) }, tok);
    if (r) jCount++;
  }
  console.log(`  ✓ ${jCount}/${journalEntries.length} journal entries`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. WELLNESS — ~80 entries over past 90 days (skip last 7 already done)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n▸ Wellness (3-month history)');
  const wellnessNotes = [
    'Good energy today.', 'Feeling rested.', 'Bit tired but pushed through.',
    'Strong morning workout.', 'Rest day — needed it.', 'Feeling balanced.',
    'Busy day but stayed on track.', 'Great sleep last night.', 'Sluggish start, better by noon.',
    'Felt strong all day.', 'Skipped the gym — stress day.', 'Meditated this morning.',
    'Energy was steady throughout.', 'A bit anxious but managed it well.', 'Productive and calm.',
  ];
  const exerciseDays = new Set([0, 1, 3, 4]);  // Mon Tue Thu Fri tend to exercise

  let wCount = 0;
  for (let off = -90; off <= -8; off++) {
    if (Math.random() < 0.1) continue; // skip ~10% of days (realistic gaps)
    const dt = new Date(today);
    dt.setDate(dt.getDate() + off);
    const dayOfWeek = dt.getDay();
    const exercise = exerciseDays.has(dayOfWeek) && Math.random() > 0.25;
    const moodBase = exercise ? 4 : 3;
    const mood = Math.min(5, Math.max(1, moodBase + Math.round((Math.random() - 0.3) * 2)));
    const sleep = parseFloat(between(5.5, 8.5).toFixed(1));
    const water = Math.round(between(4, 9));
    const r = await post('/wellness', {
      date: ds(off),
      mood,
      sleep,
      water,
      exercise,
      note: pick(wellnessNotes),
    }, tok);
    if (r) wCount++;
  }
  console.log(`  ✓ ${wCount} wellness entries`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. TASKS — 40 tasks (mix of completed/open)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n▸ Tasks');
  const tasks = [
    // Completed
    { title: 'Set up Sivena account', category: 'Admin', shared: false, completed: true },
    { title: 'Book flights to Rome ✈️', description: 'Confirmed for Aug 20 departure', category: 'Travel', shared: true, completed: true },
    { title: 'Get travel insurance', category: 'Travel', shared: true, completed: true },
    { title: 'Renew passport', category: 'Admin', shared: false, completed: true },
    { title: 'Schedule annual physical', category: 'Health', shared: false, completed: true },
    { title: 'Deep clean the apartment', category: 'Home', shared: true, completed: true },
    { title: 'Cancel unused gym membership (old)', category: 'Finance', shared: false, completed: true },
    { title: 'Enroll in cooking class', category: 'Personal', shared: true, completed: true },
    { title: 'Set up automatic savings transfer', category: 'Finance', shared: false, completed: true },
    { title: "Buy Sarah & Mike's wedding gift", category: 'Social', shared: true, completed: true, dueDate: d(10) },
    { title: 'Fix bathroom faucet drip', category: 'Home', shared: true, completed: true },
    { title: 'Organise digital photos', category: 'Personal', shared: false, completed: true },
    { title: 'Submit expense report — Q2', category: 'Work', shared: false, completed: true },
    { title: 'Plant the herb garden on balcony 🌿', category: 'Home', shared: true, completed: true },
    { title: 'Schedule couples therapy session', category: 'Wellbeing', shared: true, completed: true },
    // Open — due soon
    { title: 'Book hotel in Florence 🏨', description: 'Check Airbnb and Booking.com', dueDate: d(7), priority: 'HIGH', category: 'Travel', shared: true, completed: false },
    { title: 'Get Euros before trip', dueDate: d(12), category: 'Finance', shared: false, completed: false },
    { title: 'Pack for Europe trip 🧳', dueDate: d(16), priority: 'HIGH', category: 'Travel', shared: true, completed: false },
    { title: "Buy wedding card (Sarah & Mike)", dueDate: d(8), category: 'Social', shared: true, completed: false },
    { title: 'Write anniversary card 💌', dueDate: d(24), category: 'Personal', shared: false, completed: false },
    { title: 'Book anniversary dinner reservation', dueDate: d(20), priority: 'HIGH', category: 'Social', shared: true, completed: false },
    { title: 'Renew car insurance', dueDate: d(21), category: 'Finance', shared: false, completed: false },
    { title: 'Fix the balcony light', category: 'Home', shared: true, completed: false },
    { title: 'Prepare team offsite presentation', dueDate: d(14), priority: 'HIGH', category: 'Work', shared: false, completed: false },
    { title: 'Read "Atomic Habits" (finish last 80 pages)', category: 'Personal', shared: false, completed: false },
    // Open — no due date
    { title: 'Research European eSIM options', category: 'Travel', shared: true, completed: false },
    { title: 'Look into home loan pre-approval', description: "We're thinking 2027", category: 'Finance', shared: true, completed: false },
    { title: 'Schedule kitchen deep-clean service', category: 'Home', shared: true, completed: false },
    { title: 'Set up evening routines in Sivena', category: 'Wellbeing', shared: false, completed: false },
    { title: 'Pick a joint savings goal for 2027', category: 'Finance', shared: true, completed: false },
  ];

  let tCount = 0;
  const completedTaskIds = [];
  for (const task of tasks) {
    const { completed, ...body } = task;
    const r = await post(`/households/${hhId}/tasks`, body, tok);
    if (r) {
      tCount++;
      if (completed) completedTaskIds.push(r.id);
    }
  }
  // Toggle completed tasks
  for (const id of completedTaskIds) {
    await patch(`/households/${hhId}/tasks/${id}/toggle`, undefined, tok);
  }
  console.log(`  ✓ ${tCount} tasks (${completedTaskIds.length} completed)`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. EXPENSES — 80 expenses over 3 months
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n▸ Expenses');
  const expenseData = [];

  // Monthly rent
  for (let mo = -2; mo <= 0; mo++) {
    expenseData.push({ title: 'Rent', amount: 2950, category: 'RENT', date: d(mo * 30 - 1) });
  }
  // Groceries — twice weekly
  const groceryAmts = [87, 112, 94, 103, 78, 125, 91, 108, 95, 118, 82, 99, 106, 87, 113, 92, 101, 88, 119, 94, 107, 83, 98, 115];
  groceryAmts.forEach((amount, i) => {
    expenseData.push({ title: 'Whole Foods', amount, category: 'GROCERIES', date: d(-88 + i * 3.5 | 0) });
  });
  // Dining out — 3-4x per month
  const restaurants = [
    { title: 'Le Bernardin (Birthday dinner)', amount: 340, date: d(-82) },
    { title: 'Village Vanguard — drinks', amount: 85, date: d(-75) },
    { title: 'Buvette brunch', amount: 94, date: d(-68) },
    { title: 'Sweetgreen', amount: 24, date: d(-66) },
    { title: 'Nobu Downtown', amount: 220, date: d(-43) },
    { title: 'Pastis brunch', amount: 78, date: d(-29) },
    { title: 'Westlight dinner', amount: 165, date: d(-15) },
    { title: 'Joe & The Juice', amount: 18, date: d(-13) },
    { title: 'Levain Bakery', amount: 22, date: d(-8) },
    { title: 'Thai place — takeout', amount: 46, date: d(-6) },
    { title: 'Sweetgreen', amount: 26, date: d(-4) },
    { title: 'Lure Fishbar', amount: 178, date: d(-3) },
  ];
  restaurants.forEach(r => expenseData.push({ ...r, category: 'DINING' }));
  // Utilities
  for (let mo = -2; mo <= 0; mo++) {
    expenseData.push({ title: 'Con Edison (electricity)', amount: 124 + mo * 8, category: 'UTILITIES', date: d(mo * 30 - 5) });
    expenseData.push({ title: 'Internet — Spectrum', amount: 65, category: 'UTILITIES', date: d(mo * 30 - 3) });
    expenseData.push({ title: 'Spotify Family', amount: 16.99, category: 'UTILITIES', date: d(mo * 30 - 2) });
    expenseData.push({ title: 'Netflix', amount: 22.99, category: 'UTILITIES', date: d(mo * 30 - 1) });
  }
  // Transport
  const transports = [
    { title: 'Metro card refill', amount: 33, date: d(-85) },
    { title: 'Uber — late night', amount: 28, date: d(-82) },
    { title: 'Metro card refill', amount: 33, date: d(-55) },
    { title: 'Uber — airport', amount: 54, date: d(-57) },
    { title: 'Lyft home', amount: 22, date: d(-50) },
    { title: 'Metro card refill', amount: 33, date: d(-28) },
    { title: 'Uber — rainy day', amount: 18, date: d(-20) },
    { title: 'Citi Bike monthly pass', amount: 19, date: d(-15) },
    { title: 'Uber — date night', amount: 31, date: d(-3) },
  ];
  transports.forEach(r => expenseData.push({ ...r, category: 'TRANSPORT' }));
  // Entertainment
  const entertainment = [
    { title: 'MoMA tickets', amount: 50, date: d(-22) },
    { title: 'Cooking class (x2)', amount: 280, date: d(-61) },
    { title: 'Broadway show — tickets', amount: 220, date: d(-54) },
    { title: 'Equinox membership', amount: 185, date: d(-88) },
    { title: 'Equinox membership', amount: 185, date: d(-58) },
    { title: 'Equinox membership', amount: 185, date: d(-28) },
    { title: 'Kindle book purchases', amount: 34, date: d(-40) },
    { title: 'Yoga mat + blocks', amount: 78, date: d(-72) },
  ];
  entertainment.forEach(r => expenseData.push({ ...r, category: 'ENTERTAINMENT' }));
  // Health
  const health = [
    { title: 'Annual physical — co-pay', amount: 40, date: d(-65) },
    { title: 'Dentist — cleaning', amount: 120, date: d(-47) },
    { title: 'Pharmacy — vitamins', amount: 58, date: d(-60) },
    { title: 'Therapy session', amount: 150, date: d(-11) },
    { title: 'Therapy session', amount: 150, date: d(-74) },
    { title: 'Pharmacy — vitamins', amount: 58, date: d(-30) },
  ];
  health.forEach(r => expenseData.push({ ...r, category: 'HEALTH' }));

  let exCount = 0;
  for (const expense of expenseData) {
    const { date, ...rest } = expense;
    const r = await post(`/households/${hhId}/expenses`, { ...rest, date }, tok);
    if (r) exCount++;
  }
  console.log(`  ✓ ${exCount}/${expenseData.length} expenses`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. BUDGETS
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n▸ Budgets');
  const budgets = [
    { category: 'Groceries',     limit: 600,  period: 'monthly' },
    { category: 'Dining Out',    limit: 400,  period: 'monthly' },
    { category: 'Entertainment', limit: 250,  period: 'monthly' },
    { category: 'Transport',     limit: 150,  period: 'monthly' },
    { category: 'Health',        limit: 300,  period: 'monthly' },
    { category: 'Utilities',     limit: 250,  period: 'monthly' },
  ];
  let bCount = 0;
  for (const b of budgets) {
    const r = await post(`/households/${hhId}/budgets`, b, tok);
    if (r) bCount++;
  }
  console.log(`  ✓ ${bCount} budgets`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. COUNTDOWNS
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n▸ Countdowns');
  const countdowns = [
    { title: 'Europe Trip ✈️',          date: d(47), emoji: '✈️', color: '#F59E0B' },
    { title: 'Our Anniversary 💑',       date: d(28), emoji: '💑', color: '#EC4899' },
    { title: "Sarah & Mike's Wedding 💍",date: d(14), emoji: '💍', color: '#8B5CF6' },
    { title: 'Team Offsite 🏕️',         date: d(18), emoji: '🏕️', color: '#6366F1' },
    { title: 'Christmas 🎄',            date: new Date(today.getFullYear(), 11, 25).toISOString(), emoji: '🎄', color: '#10B981' },
  ];
  let cdCount = 0;
  for (const c of countdowns) {
    const r = await post(`/households/${hhId}/countdowns`, c, tok);
    if (r) cdCount++;
  }
  console.log(`  ✓ ${cdCount} countdowns`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. MEMORIES
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n▸ Memories');
  const memories = [
    { title: 'Started using Sivena together 🌱',              date: ds(-90), description: 'Finally got organised as a couple. This feels like a new chapter.', emoji: '🌱', shared: true },
    { title: "Jordan's 31st Birthday Dinner",                 date: ds(-82), description: 'Le Bernardin — the tasting menu, champagne, and a night we will never forget.', emoji: '🎂', shared: true },
    { title: 'First Jazz Night at Village Vanguard',          date: ds(-75), description: 'An extraordinary pianist. Jordan held my hand the whole set.', emoji: '🎷', shared: true },
    { title: 'Cooking Class — Pasta from Scratch 🍝',         date: ds(-61), description: 'Terrible at folding but laughed until our sides hurt.', emoji: '🍝', shared: true },
    { title: 'Hamptons Weekend Getaway',                      date: ds(-57), description: 'Two days of salt air, morning swims, and sunsets from the deck.', emoji: '🏖️', shared: true },
    { title: 'First 5K Without Stopping 🏃',                  date: ds(-56), description: 'Eight weeks of training paid off. I almost cried at the end.', emoji: '🏃', shared: false },
    { title: "Sam & Claire's Housewarming",                   date: ds(-50), description: "Celebrated our friends' new Brooklyn home. Such a beautiful night.", emoji: '🏠', shared: true },
    { title: "Mom's Visit — Three Days Together",             date: ds(-40), description: 'She reorganised my kitchen. I was grateful.', emoji: '💛', shared: false },
    { title: 'Rooftop Summer Dinner, Williamsburg',           date: ds(-15), description: 'Manhattan skyline at golden hour. Cold wine. Perfect.', emoji: '🌆', shared: true },
    { title: 'Ran the Most Consistent Month Yet 💪',          date: ds(-14), description: 'Eight consecutive weeks of training. My body is changing.', emoji: '💪', shared: false },
    { title: 'MoMA Sunday — Lost in Photography Wing',        date: ds(-22), description: 'Two hours in front of one Diane Arbus portrait. Art got me.', emoji: '🎨', shared: true },
    { title: 'Booked Flights — Rome, Florence, Paris',        date: ds(-60), description: "It's real. We are actually going to Europe this summer.", emoji: '✈️', shared: true },
    { title: 'Central Park Run — Golden Morning',             date: ds(-12), description: 'The light through the trees at 7am. Sat by the Reservoir feeling alive.', emoji: '🌅', shared: false },
    { title: "Sarah's Bachelorette Brunch",                   date: ds(-29), description: 'She is so happy. Watching people you love thrive is everything.', emoji: '👰', shared: true },
    { title: '90 Days of Sivena — Account Anniversary 🎉',    date: ds(0),  description: 'Three months of building better habits, together.', emoji: '🎉', shared: true },
  ];
  let memCount = 0;
  for (const m of memories) {
    const r = await post(`/households/${hhId}/memories`, m, tok);
    if (r) memCount++;
  }
  console.log(`  ✓ ${memCount} memories`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. TIMELINE
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n▸ Timeline');
  const timeline = [
    { title: 'Joined Sivena',                date: ds(-90), description: 'Started the journey to get organised as a couple.', emoji: '🌱', category: 'milestone' },
    { title: 'Set our first shared goals',   date: ds(-89), description: "Europe trip, fitness goals, savings targets — it's all on paper now.", emoji: '🎯', category: 'milestone' },
    { title: 'First week of meal planning',  date: ds(-85), emoji: '🥗', category: 'wellness' },
    { title: 'Completed first month of gym', date: ds(-58), description: 'Showed up every scheduled session. Consistency win.', emoji: '💪', category: 'fitness' },
    { title: 'Weekend getaway — Hamptons',   date: ds(-57), emoji: '🏖️', category: 'travel' },
    { title: 'Cooking class milestone',      date: ds(-61), description: 'Officially can make pasta from scratch (badly, but still).', emoji: '🍝', category: 'lifestyle' },
    { title: 'Booked Europe flights',        date: ds(-60), description: 'Rome to Paris. 14 days. It\'s happening.', emoji: '✈️', category: 'milestone' },
    { title: 'Hit savings goal checkpoint',  date: ds(-55), description: '$4,400 saved toward Europe trip. Halfway there.', emoji: '💰', category: 'finance' },
    { title: "Mom's visit — 3 days",         date: ds(-40), emoji: '💛', category: 'family' },
    { title: 'Ran 5K without stopping',      date: ds(-56), description: 'First time ever. Training is working.', emoji: '🏃', category: 'fitness' },
    { title: 'Two months of consistent gym', date: ds(-28), emoji: '🏋️', category: 'fitness' },
    { title: '30 journal entries milestone', date: ds(-30), emoji: '📓', category: 'milestone' },
    { title: 'Rooftop summer dinner',        date: ds(-15), emoji: '🌆', category: 'social' },
    { title: 'Wellness streak — 60 days',    date: ds(-30), description: 'Tracking wellness daily for two months straight.', emoji: '✨', category: 'milestone' },
    { title: 'Central Park 7am run',         date: ds(-12), emoji: '🌅', category: 'fitness' },
    { title: 'Europe trip fully booked',     date: ds(-10), description: 'Hotels, trains, activities. All confirmed.', emoji: '🗺️', category: 'milestone' },
    { title: '90 days — 3-month milestone 🎉', date: ds(0), description: 'What a quarter. Healthier, more present, more us.', emoji: '🎉', category: 'milestone' },
  ];
  let tlCount = 0;
  for (const t of timeline) {
    const r = await post(`/households/${hhId}/timeline`, t, tok);
    if (r) tlCount++;
  }
  console.log(`  ✓ ${tlCount} timeline entries`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 11. POLLS
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n▸ Polls');
  const polls = [
    {
      question: 'Where should we go for our anniversary dinner?',
      options: [
        { label: 'Daniel (classic French)', emoji: '🥂' },
        { label: 'Eleven Madison Park', emoji: '🌿' },
        { label: 'Atomix (Korean tasting menu)', emoji: '🍱' },
        { label: 'Per Se', emoji: '⭐' },
      ],
      closesAt: d(20),
    },
    {
      question: "What's our top priority for the Europe trip?",
      options: [
        { label: 'Food & wine experiences', emoji: '🍷' },
        { label: 'Art museums & culture', emoji: '🎨' },
        { label: 'Relaxing & slow travel', emoji: '☀️' },
        { label: 'Checking off bucket list', emoji: '✅' },
      ],
      closesAt: d(10),
    },
    {
      question: 'How should we spend Sunday?',
      options: [
        { label: 'Farmers market + cook at home', emoji: '🥦' },
        { label: 'Brunch out + Central Park walk', emoji: '🌳' },
        { label: 'Museum day', emoji: '🖼️' },
      ],
    },
    {
      question: 'Holiday destination this Christmas?',
      options: [
        { label: 'Stay in NYC — cozy home holiday', emoji: '🎄' },
        { label: 'Visit family', emoji: '👨‍👩‍👧' },
        { label: 'Ski trip', emoji: '⛷️' },
        { label: 'Warm weather escape', emoji: '🌴' },
      ],
    },
  ];

  for (const poll of polls) {
    const r = await post(`/households/${hhId}/polls`, poll, tok);
    if (r) {
      // Vote on first two polls to make them look active
      if (r.options?.length > 0 && polls.indexOf(poll) < 2) {
        const optionId = r.options[0].id;
        await post(`/households/${hhId}/polls/${r.id}/vote`, { optionId }, tok);
      }
    }
  }
  console.log(`  ✓ ${polls.length} polls`);

  // ── Done ──────────────────────────────────────────────────────────────────
  console.log('\n✅  Full seed complete!\n');
  console.log('  Email:    alex.sivena.demo@gmail.com');
  console.log('  Password: Demo2026#');
  console.log(`  Household: ${hhId}\n`);
}

main().catch(err => { console.error('Seed failed:', err); process.exit(1); });
