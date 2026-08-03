#!/usr/bin/env node
/**
 * Sivena — household members seed
 * Couple: Alex + Jordan (2 adults)
 * Parenting: Alex + Jordan + 1 child
 * Family: Alex + Jordan + 3 children = 5
 */

const BASE = 'https://sivena-api-production.up.railway.app/api/v1';
const hhId = 'cmsd61iqg0095u3xo3w4qnhd3';

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
    process.stdout.write(`  ✗ ${method} ${path.slice(0, 60)} → ${res.status} ${JSON.stringify(json).slice(0, 200)}\n`);
    return null;
  }
  return json.data ?? json;
}

const post  = (p, b, t) => req('POST',  p, b, t);
const patch = (p, b, t) => req('PATCH', p, b, t);
const get   = (p, t)    => req('GET',   p, undefined, t);

async function main() {
  console.log('\n👥  Household members seed starting…\n');

  // ── Auth: Alex (primary) ─────────────────────────────────────────────────
  const alex = await post('/auth/login', { email: 'alex.sivena.demo@gmail.com', password: 'Demo2026#' });
  if (!alex?.accessToken) { console.error('Alex auth failed'); process.exit(1); }
  const tokA = alex.accessToken;
  console.log(`✓ Alex: ${alex.user.name} (${alex.user.id})`);

  // ── Check current members ────────────────────────────────────────────────
  const members = await get(`/households/${hhId}/members`, tokA);
  const memberList = Array.isArray(members) ? members : (members?.data ?? []);
  console.log(`✓ Current members: ${memberList.map(m => m.name).join(', ')}`);

  const jordanEmail = 'jordan.sivena.demo@gmail.com';
  const jordanPassword = 'Demo2026#';

  // ── Register Jordan if not already a member ──────────────────────────────
  const jordanAlreadyMember = memberList.some(m => m.email === jordanEmail);
  let tokJ = null;

  if (!jordanAlreadyMember) {
    console.log('\n▸ Registering Jordan…');
    // Try login first (in case account exists but not in household)
    let jordan = await post('/auth/login', { email: jordanEmail, password: jordanPassword });
    if (!jordan?.accessToken) {
      // Register
      jordan = await post('/auth/register', {
        email: jordanEmail,
        password: jordanPassword,
        name: 'Jordan Rivera',
      });
    }
    if (!jordan?.accessToken) { console.error('Jordan auth failed'); process.exit(1); }
    tokJ = jordan.accessToken;
    console.log(`  ✓ Jordan authenticated: ${jordan.user?.name ?? 'Jordan Rivera'}`);

    // Generate invite code from Alex's household
    console.log('\n▸ Generating invite code…');
    const invite = await post(`/households/${hhId}/invite`, undefined, tokA);
    if (!invite?.inviteCode) { console.error('Could not get invite code:', invite); process.exit(1); }
    console.log(`  ✓ Invite code: ${invite.inviteCode}`);

    // Jordan joins the household
    console.log('\n▸ Jordan joining household…');
    const joined = await post('/households/join', { inviteCode: invite.inviteCode }, tokJ);
    if (joined) {
      console.log(`  ✓ Jordan joined household: ${hhId}`);
    } else {
      console.log('  ⚠ Jordan may already be in a household — continuing');
    }
  } else {
    console.log('  ✓ Jordan already a member');
    const jordan = await post('/auth/login', { email: jordanEmail, password: jordanPassword });
    if (jordan?.accessToken) tokJ = jordan.accessToken;
  }

  // ── Check current children ───────────────────────────────────────────────
  const childrenRes = await get(`/households/${hhId}/children`, tokA);
  const existingChildren = Array.isArray(childrenRes) ? childrenRes : (childrenRes?.data ?? []);
  console.log(`\n✓ Current children: ${existingChildren.length} (${existingChildren.map(c => c.name).join(', ') || 'none'})`);

  // Target: 3 children total (for family = 5: 2 adults + 3 kids)
  const childrenToAdd = [
    {
      name: 'Mia Rivera',
      dateOfBirth: '2018-04-12', // 8 years old
      color: '#EC4899',
      schoolName: 'Sunshine Elementary',
      bedtime: '20:00',
      allergies: ['peanuts'],
      notes: 'Loves drawing and dancing',
    },
    {
      name: 'Leo Rivera',
      dateOfBirth: '2020-09-03', // 5 years old
      color: '#F59E0B',
      schoolName: 'Sunshine Elementary',
      bedtime: '19:30',
      allergies: [],
      notes: 'Obsessed with dinosaurs',
    },
    {
      name: 'Zoe Rivera',
      dateOfBirth: '2023-01-20', // 2 years old (toddler)
      color: '#10B981',
      bedtime: '19:00',
      allergies: [],
      notes: 'Currently learning to talk',
    },
  ];

  let addedChildren = 0;
  for (const child of childrenToAdd) {
    const alreadyExists = existingChildren.some(c => c.name === child.name);
    if (alreadyExists) {
      console.log(`  ✓ ${child.name} already exists`);
      continue;
    }
    const r = await post(`/households/${hhId}/children`, child, tokA);
    if (r) {
      addedChildren++;
      console.log(`  ✓ Added child: ${child.name} (born ${child.dateOfBirth})`);
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  const updatedMembers = await get(`/households/${hhId}/members`, tokA);
  const updatedChildren = await get(`/households/${hhId}/children`, tokA);
  const mList = Array.isArray(updatedMembers) ? updatedMembers : (updatedMembers?.data ?? []);
  const cList = Array.isArray(updatedChildren) ? updatedChildren : (updatedChildren?.data ?? []);

  console.log('\n✅  Household members seed complete!\n');
  console.log(`  Adults (${mList.length}): ${mList.map(m => m.name).join(', ')}`);
  console.log(`  Children (${cList.length}): ${cList.map(c => c.name).join(', ')}`);
  console.log(`  Total household: ${mList.length + cList.length} people\n`);
  console.log('  Mode breakdown:');
  console.log(`  ✓ Couple / Partner:  ${mList.length} people (${mList.map(m => m.name.split(' ')[0]).join(' + ')})`);
  console.log(`  ✓ Parenting:         ${mList.length + 1} people (${mList.map(m => m.name.split(' ')[0]).join(' + ')} + ${cList[0]?.name?.split(' ')[0] ?? 'child'})`);
  console.log(`  ✓ Family:            ${mList.length + cList.length} people`);
}

main().catch(err => { console.error('Seed failed:', err); process.exit(1); });
