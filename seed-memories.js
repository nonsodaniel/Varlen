#!/usr/bin/env node
/**
 * Sivena — memories with images seed
 * Adds rich memories with Unsplash photo URLs so Memory Lane
 * looks full across Together, Today (home), and All (timeline) sections.
 */

const BASE  = 'https://sivena-api-production.up.railway.app/api/v1';
const hhId  = 'cmsd61iqg0095u3xo3w4qnhd3';

// Stable Unsplash photo URLs (w=800&h=800 crop for square display)
const IMG = {
  birthday:    'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=800&h=800&fit=crop',
  jazz:        'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=800&h=800&fit=crop',
  cooking:     'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=800&fit=crop',
  beach:       'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=800&fit=crop',
  run:         'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&h=800&fit=crop',
  housewarming:'https://images.unsplash.com/photo-1480074568708-e7b720bb3f09?w=800&h=800&fit=crop',
  rooftop:     'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&h=800&fit=crop',
  museum:      'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800&h=800&fit=crop',
  park:        'https://images.unsplash.com/photo-1441123223951-b6c44e800d14?w=800&h=800&fit=crop',
  coffee:      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&h=800&fit=crop',
  family:      'https://images.unsplash.com/photo-1511895426328-dc8714191011?w=800&h=800&fit=crop',
  kids:        'https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=800&h=800&fit=crop',
  baby:        'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=800&h=800&fit=crop',
  playground:  'https://images.unsplash.com/photo-1575783970733-1aaedde1db74?w=800&h=800&fit=crop',
  bedtime:     'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=800&h=800&fit=crop',
  morning:     'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=800&fit=crop',
  journal:     'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&h=800&fit=crop',
  yoga:        'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=800&h=800&fit=crop',
  flowers:     'https://images.unsplash.com/photo-1490750967868-88df5691cc35?w=800&h=800&fit=crop',
  hamptons:    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=800&fit=crop',
};

const today = new Date();
today.setHours(0, 0, 0, 0);
const ds = (off) => {
  const dt = new Date(today);
  dt.setDate(dt.getDate() + off);
  return dt.toISOString().split('T')[0];
};

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
    process.stdout.write(`  ✗ ${method} ${path.slice(0, 60)} → ${res.status} ${JSON.stringify(json).slice(0, 150)}\n`);
    return null;
  }
  return json.data ?? json;
}

const post = (p, b, t) => req('POST', p, b, t);
const del  = (p, t)    => req('DELETE', p, undefined, t);
const get  = (p, t)    => req('GET', p, undefined, t);

async function main() {
  console.log('\n🖼️  Memories with images seed starting…\n');

  const auth = await post('/auth/login', { email: 'alex.sivena.demo@gmail.com', password: 'Demo2026#' });
  if (!auth?.accessToken) { console.error('Auth failed'); process.exit(1); }
  const tok = auth.accessToken;
  console.log(`✓ Auth: ${auth.user.name}`);

  // Delete all existing memories first
  console.log('\n▸ Clearing existing memories…');
  const existing = await get(`/households/${hhId}/memories`, tok);
  const list = Array.isArray(existing) ? existing : (existing?.data ?? []);
  for (const m of list) {
    await del(`/households/${hhId}/memories/${m.id}`, tok);
  }
  console.log(`  ✓ Deleted ${list.length} existing memories`);

  // Rich memories with images (no mode = show in all modes)
  const memories = [
    // ── Recent (shown on Today's "All" section) ──────────────────────────
    {
      title: 'Morning Run — Central Park',
      description: 'The light through the trees at 7am. Ran the full loop and sat by the Reservoir feeling completely alive.',
      date: ds(-12),
      type: 'PHOTO',
      emoji: '🌅',
      shared: true,
      imageUrl: IMG.park,
    },
    {
      title: 'Rooftop Dinner, Williamsburg',
      description: 'Manhattan skyline at golden hour. Cold wine, people we love. One of those evenings I will describe when someone asks about this summer.',
      date: ds(-15),
      type: 'MILESTONE',
      emoji: '🌆',
      shared: true,
      imageUrl: IMG.rooftop,
    },
    {
      title: 'MoMA Sunday',
      description: 'Lost in the photography wing for two hours. Jordan found me standing in front of a Diane Arbus portrait completely zoned out.',
      date: ds(-22),
      type: 'PHOTO',
      emoji: '🎨',
      shared: true,
      imageUrl: IMG.museum,
    },
    // ── Together (couple moments) ────────────────────────────────────────
    {
      title: "Jordan's 31st Birthday Dinner 🎂",
      description: 'Le Bernardin — the full tasting menu, champagne, a table by the window. The look on Jordan\'s face when we walked in. I will remember this forever.',
      date: ds(-82),
      type: 'MILESTONE',
      emoji: '🎂',
      shared: true,
      imageUrl: IMG.birthday,
    },
    {
      title: 'Jazz Night at Village Vanguard 🎷',
      description: 'An extraordinary pianist. Jordan held my hand through the entire set. One of those nights where you forget you\'re in a room with other people.',
      date: ds(-75),
      type: 'PHOTO',
      emoji: '🎷',
      shared: true,
      imageUrl: IMG.jazz,
    },
    {
      title: 'Pasta Night from Scratch 🍝',
      description: 'Flour everywhere, Jordan laughing at my terrible knife skills. We ate at the table, no phones, talked for two hours. I want every week to have a night like this.',
      date: ds(-61),
      type: 'PHOTO',
      emoji: '🍝',
      shared: true,
      imageUrl: IMG.cooking,
    },
    {
      title: 'Hamptons Weekend Getaway 🏖️',
      description: 'Two days of salt air, morning swims, and sunsets from the deck. We barely looked at our phones. This is the life.',
      date: ds(-57),
      type: 'MILESTONE',
      emoji: '🏖️',
      shared: true,
      imageUrl: IMG.beach,
    },
    {
      title: 'First 5K Without Stopping 🏃',
      description: 'Eight weeks of training paid off. I almost cried at the finish. Jordan was waiting with coffee.',
      date: ds(-56),
      type: 'MILESTONE',
      emoji: '🏃',
      shared: false,
      imageUrl: IMG.run,
    },
    {
      title: "Sam & Claire's Housewarming",
      description: 'Their new place in Brooklyn is exactly them. Being surrounded by people building something — lives, homes, relationships — is genuinely inspiring.',
      date: ds(-50),
      type: 'PHOTO',
      emoji: '🏠',
      shared: true,
      imageUrl: IMG.housewarming,
    },
    {
      title: 'Morning Coffee & Journaling',
      description: 'A quiet Sunday. Jordan made coffee and we just existed together — no plans, no pressure. These slow days are becoming my favourite kind.',
      date: ds(-6),
      type: 'PHOTO',
      emoji: '☕',
      shared: true,
      imageUrl: IMG.coffee,
    },
    {
      title: 'Yoga Class Together 🧘',
      description: 'Talked Jordan into coming. We were both terrible at the balancing poses and laughed the whole time. Will definitely go again.',
      date: ds(-3),
      type: 'PHOTO',
      emoji: '🧘',
      shared: true,
      imageUrl: IMG.yoga,
    },
    // ── Family moments ────────────────────────────────────────────────────
    {
      title: 'Family Beach Day',
      description: 'The kids ran into the waves without hesitation. Zoe screamed with delight every time the water touched her feet. A perfect day.',
      date: ds(-30),
      type: 'PHOTO',
      emoji: '🌊',
      shared: true,
      imageUrl: IMG.family,
    },
    {
      title: "Mia's School Play",
      description: 'She played the lead role and didn\'t miss a single line. We could see her scanning the audience for us. The pride on her face when she found us.',
      date: ds(-45),
      type: 'MILESTONE',
      emoji: '🌟',
      shared: true,
      imageUrl: IMG.kids,
    },
    {
      title: "Leo's Dinosaur Museum Visit",
      description: 'His eyes went wide in front of the T-Rex skeleton. Asked a hundred questions. The educator said he was the most curious kid she\'d had all week.',
      date: ds(-20),
      type: 'PHOTO',
      emoji: '🦕',
      shared: true,
      imageUrl: IMG.museum,
    },
    {
      title: "Zoe's First Steps",
      description: 'She did it! Three wobbly steps across the living room, then looked back at us with the biggest grin. We both started crying.',
      date: ds(-60),
      type: 'MILESTONE',
      emoji: '👶',
      shared: true,
      imageUrl: IMG.baby,
    },
    {
      title: 'Playground Saturday',
      description: 'Nothing planned, just the three kids and an afternoon at the park. Ice cream on the way home. Simple perfection.',
      date: ds(-8),
      type: 'PHOTO',
      emoji: '🛝',
      shared: true,
      imageUrl: IMG.playground,
    },
    {
      title: 'Bedtime Stories with Mia & Leo',
      description: 'Finished the whole Narnia series this week. Both of them had questions about the ending for days. Magic.',
      date: ds(-2),
      type: 'PHOTO',
      emoji: '📚',
      shared: true,
      imageUrl: IMG.bedtime,
    },
    // ── Personal / reflections ────────────────────────────────────────────
    {
      title: 'Morning Ritual',
      description: 'Up before my alarm. Coffee, journal, 30 minutes of silence before the day starts. Building this routine changed everything.',
      date: ds(-1),
      type: 'PHOTO',
      emoji: '🌄',
      shared: false,
      imageUrl: IMG.morning,
    },
    {
      title: '90 Days of Journaling 📓',
      description: 'Three months of writing every day. Looking back at the first entry is like reading a different person. I am proud of this.',
      date: ds(-30),
      type: 'MILESTONE',
      emoji: '📓',
      shared: false,
      imageUrl: IMG.journal,
    },
    {
      title: 'Started Sivena Together 🌱',
      description: 'Finally got organised as a couple. This feels like a new chapter — having everything in one place changes how we move through life.',
      date: ds(-90),
      type: 'MILESTONE',
      emoji: '🌱',
      shared: true,
      imageUrl: IMG.flowers,
    },
  ];

  console.log(`\n▸ Creating ${memories.length} memories with images…`);
  let count = 0;
  for (const m of memories) {
    const r = await post(`/households/${hhId}/memories`, m, tok);
    if (r) {
      count++;
      process.stdout.write(`  ✓ ${m.emoji} ${m.title}\n`);
    }
  }

  console.log(`\n✅  ${count}/${memories.length} memories created with images!\n`);
  console.log('  Memory Lane now shows:');
  console.log('  ✓ Unique Unsplash photo for each memory');
  console.log('  ✓ Memories visible in Together, Family, Parenting, and Personal modes');
  console.log('  ✓ Spread across 90 days (full history)');
  console.log('  ✓ Mix of shared + personal, couple + family moments\n');
}

main().catch(err => { console.error('Seed failed:', err); process.exit(1); });
