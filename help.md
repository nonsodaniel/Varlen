# Sivena: From Student Project to Full-Blown Product — A Realistic Roadmap

You're a student in Finland building a life-coordination app for couples and households. Your codebase is already strong — NestJS backend, React Native/Expo mobile app, PostgreSQL, Redis, real-time sync, offline-first architecture, 30+ features. That puts you ahead of most solo founders. Here's the honest, detailed path from where you are now to a widely-used, revenue-generating product.

---

## Phase 1: Lock Down the Core (Before You Show It to Anyone)

**Goal: Make the app feel solid for one use case, not half-baked across many.**

Your app covers tasks, expenses, calendars, meal planning, baby logging, wellness, journals, polls, reactions, streaks, challenges, and more. That's too many surfaces to polish at once. Pick **one primary user** and **one killer workflow**.

**Recommended focus: Couples managing shared life together.**

### What to do:

1. **Cut scope ruthlessly.** Hide (don't delete) features that aren't polished. A couple managing groceries, chores, and shared expenses is a complete product. Baby logging, wellness tracking, and journals can come later. Ship fewer features that work perfectly rather than many that feel incomplete.

2. **Nail onboarding.** Right now your app requires account creation, household setup, and partner invitation before anything useful happens. That's too much friction. Build a 3-screen onboarding:
   - Screen 1: "What do you want to coordinate?" (pick top pain points)
   - Screen 2: Sign up (Google one-tap preferred)
   - Screen 3: Invite your partner (with a share link — you already have invite OG cards)

3. **Test on real phones.** Not simulators. Get 5 friends (ideally couples) to install and use it for a week. Watch them. Don't explain anything. Every time they get confused, that's a bug.

4. **Fix the basics:**
   - App launch to useful screen should be under 2 seconds
   - Push notifications must work reliably (this is your engagement lifeline)
   - Offline mode should be invisible — it should just work
   - No crashes. Period. Use Sentry or Bugsnag for crash reporting.

5. **Set up analytics from day one.** You need to know:
   - How many people finish onboarding
   - Which features get used daily vs. never
   - Where people drop off
   - Use PostHog (free tier, EU-hosted option available, privacy-friendly) or Mixpanel.

---

## Phase 2: Closed Beta (Months 1-3)

**Goal: Get 50-100 real users who use the app weekly.**

### Finding your first users:

- **Your university.** Finnish universities have active student communities. Couples in student housing are your exact target. Post in:
  - University Facebook groups, Telegram/WhatsApp groups
  - Student union channels
  - Jodel (popular in Finnish universities)
- **Reddit.** r/Finland, r/relationships, r/CouplesGoals, r/productivity — post authentically as a student building something, not as a marketer.
- **Friends of friends.** Ask every couple you know. Personally message them. "I'm building this app, can you try it for a week and tell me what's broken?" works better than any landing page.

### What you're measuring:

- **Retention, not downloads.** If 50 people install and 5 come back next week, you have a retention problem, not a marketing problem.
- **The "aha moment."** Find the action that separates users who stay from users who leave. It's probably: "created a shared list AND their partner joined." Push every new user toward that action.
- **Weekly active households**, not individual users. A household where both people are active is worth 100x a solo user who signed up and forgot.

### What to fix during beta:

- Every bug report from a real user is gold. Fix them same-day if possible.
- If people aren't using a feature, remove it from the main navigation. Don't add more features — subtract.
- Talk to your users directly. DM them. Ask "what almost made you stop using the app?" That question reveals more than "what features do you want?"

---

## Phase 3: Public Launch on App Stores (Months 3-6)

**Goal: Get listed on iOS App Store and Google Play. Reach 500-1,000 users.**

### App Store preparation:

1. **Apple Developer Account:** 99 EUR/year. Required. No way around it. Apply early — approval can take days, and you'll need to pass App Review.
2. **Google Play Developer Account:** $25 one-time fee.
3. **App Store Optimization (ASO):**
   - Title: "Sivena — Couples & Household Planner" (keyword-rich)
   - Subtitle: "Shared tasks, expenses & calendar"
   - Screenshots: 6 screenshots showing real app workflows, not abstract graphics. Use a tool like Screenshots.pro or do them in Figma.
   - Description: Lead with the problem ("Tired of 'did you buy milk?' texts?"), then the solution.
   - Keywords: couples app, shared calendar, household management, chore tracker, expense splitter, family organizer
4. **Privacy policy and terms of service.** Required by both stores. Use a generator as a starting point, but make sure it accurately reflects your data practices. Finland/EU means GDPR compliance is mandatory — you need consent flows, data export, and deletion capabilities.

### EAS Build pipeline:

You already have EAS configured. Set up:
- `eas build --platform all --profile production` for store builds
- `eas submit` for automated store submission
- OTA updates via `expo-updates` for quick fixes without going through app review

### Launch strategy:

- **Don't do a "big launch."** You're not ready for thousands of users yet. Slow growth lets you fix things.
- Post on Product Hunt (aim for a Tuesday or Wednesday launch).
- Post on Hacker News (Show HN).
- Share on Finnish tech communities: Slush alumni networks, Finnish startup Slack/Discord groups, Startup Sauna community.
- Contact Finnish tech blogs: Arctic Startup, Good News from Finland.

---

## Phase 4: Growth & Retention (Months 6-12)

**Goal: Reach 5,000-10,000 active users. Prove retention.**

### Organic growth loops:

Your app has a built-in viral loop — every user needs to invite their partner. Maximize this:

1. **Make inviting effortless.** The invite link should open the app store if the app isn't installed, then deep-link directly into the household after install. You have deep linking configured — make sure it works flawlessly across iOS and Android.
2. **Partner reminder nudges.** If someone signs up and their partner hasn't joined after 24 hours, send a push notification: "Remind [name] to join — your shared list is waiting."
3. **Shareable moments.** When a couple completes a challenge or hits a streak, generate a shareable card they can post to Instagram Stories. Free marketing.

### Content marketing:

- Start a blog or social media presence (you have social.md with accounts planned). Post about:
  - "How we split chores without fighting" (practical, relatable)
  - "The mental load problem and how to fix it" (ties into your value prop)
  - Behind-the-scenes of building the app as a student in Finland
- TikTok/Reels: Short demos of the app solving real couple problems. "POV: you finally stop arguing about groceries." These can go viral.

### Retention mechanics you already have:

- Streaks and challenges — make sure these send push notifications
- Weekly recaps — email or in-app summaries of what the household accomplished
- Reactions — lightweight engagement that keeps people opening the app

### Retention mechanics to add:

- **Smart notifications.** Don't spam. Notify when: partner added something, a task is due, an expense needs settling. Batch low-priority notifications.
- **Widgets.** iOS and Android home screen widgets showing today's tasks or upcoming events. This is a massive retention driver for utility apps.

---

## Phase 5: Monetization (Months 9-15)

**Goal: Generate revenue. Start with validation, not optimization.**

### Freemium model (recommended for your app):

**Free tier:**
- 1 household (couple)
- Shared lists, calendar, tasks
- Basic expense splitting
- Up to 100 items per list

**Premium tier (Sivena Pro) — 4.99 EUR/month or 39.99 EUR/year:**
- Multiple circles (extended family, friend groups)
- Meal planning
- Budgets and financial insights
- Wellness tracking
- Unlimited history
- Custom categories and tags
- Priority support

**Why this model works:**
- The free tier is genuinely useful (people will actually use it)
- Premium features are "nice to have" that power users want
- Couples who rely on the app daily will pay to keep it running

### Implementation:

- Use **RevenueCat** for in-app purchases. It handles iOS/Android subscriptions, receipt validation, and analytics. Free up to $2,500/month in revenue.
- Add a simple "Upgrade" prompt when users hit a free-tier limit. Don't gate core functionality aggressively early on — you need the free users for growth.

### Revenue expectations (be realistic):

- At 5,000 active users with 3-5% conversion: 150-250 paying users = 750-1,250 EUR/month
- At 20,000 active users with 5% conversion: 1,000 paying users = 5,000 EUR/month
- At 100,000 active users with 5% conversion: 5,000 paying users = 25,000 EUR/month
- These numbers take time. Don't quit your studies for 750 EUR/month.

---

## Phase 6: Scale & Sustainability (Year 1-2)

**Goal: Reach 50,000-100,000 active users. Make the app your primary income.**

### Infrastructure scaling:

Your current setup (Railway, PostgreSQL, Redis) works fine up to ~10,000 users. Beyond that:

- **Database:** Add read replicas. Your Prisma setup supports this. Add connection pooling (PgBouncer).
- **Backend:** Railway can auto-scale, but monitor costs. At scale, consider moving to a VPS provider (Hetzner has great EU pricing — data stays in Finland/EU for GDPR).
- **CDN:** Put static assets and OG images behind Cloudflare (free tier is generous).
- **Monitoring:** Set up uptime monitoring (BetterStack, free tier), error tracking (Sentry), and performance monitoring.
- **Backups:** Automated daily database backups. Test restoring them monthly.

### Localization:

- Start with English (global reach).
- Add Finnish and Swedish (your home market, shows commitment).
- If you see traction in specific countries, localize for those.
- Use i18n libraries — don't hardcode strings (check if you're already doing this).

### Team:

You won't be able to do everything alone forever.

- **First hire (or co-founder):** Someone who handles marketing/growth while you handle product/engineering. Look in your university — business students often want startup experience.
- **Second priority:** A designer. Your app's functionality is strong, but polish and visual consistency will differentiate you from competitors.
- **Don't hire engineers yet.** You can handle the codebase alone until ~50,000 users if the architecture is clean (yours is).

---

## Phase 7: Competitive Positioning

**Your competitors and how to differentiate:**

| Competitor | What they do | Your advantage |
|---|---|---|
| Cozi | Family calendar/lists | Dated UI, US-focused, no expense splitting |
| OurHome | Family chore tracker | Gamification-focused, limited financial features |
| Splitwise | Expense splitting | Single-purpose, no shared planning |
| Notion/Trello | General organization | Not designed for couples, too complex |
| Famiwall | Family coordination | Limited, not actively maintained |

**Your positioning:** "The all-in-one app for couples who want to stop texting each other about groceries, bills, and whose turn it is to cook."

**Competitive moats you can build:**
- **Data network effects:** The more a couple uses the app, the harder it is to leave (history, routines, financial records).
- **Relationship stage progression:** An app that grows with you from dating to marriage to parenting is sticky.
- **European/privacy-first:** GDPR-compliant, EU-hosted, no data selling. This matters increasingly to users.

---

## Phase 8: Legal, Financial & Business Setup

### As a student in Finland, you have advantages:

1. **Business formation:** Register as a sole trader (toiminimi) initially — free and simple through the Finnish Patent and Registration Office (PRH). When revenue justifies it, form an Oy (limited company) — 2,500 EUR minimum share capital.

2. **Startup grants:**
   - **Business Finland:** Offers grants for innovative startups (Tempo funding: up to 50,000 EUR for early-stage).
   - **ELY Centre:** Startup grants (starttiraha) for new entrepreneurs — ~700-1,100 EUR/month for 6-12 months.
   - **Slush/Junction:** Participate for networking and visibility.
   - **University startup programs:** Most Finnish universities (Aalto, Helsinki, Tampere, etc.) have startup incubators and accelerators. Apply to yours.
   - **EU grants:** Horizon Europe and EIC Accelerator for later stages.

3. **Student status:** In Finland, you can run a business while studying. Your student benefits (KELA, student housing) have income thresholds — check with KELA so you don't accidentally lose benefits when revenue grows.

4. **GDPR compliance (mandatory):**
   - Privacy policy explaining what data you collect and why
   - Cookie consent if you have a web app
   - Right to data export and deletion (add these API endpoints)
   - Data Processing Agreement if you use third-party services (Railway, Google, etc.)
   - Appoint yourself as data controller
   - If you process data of children (baby logging feature), extra care is needed

5. **Taxes:** As a sole trader, income is taxed as personal income. An Oy pays 20% corporate tax. Talk to a tax advisor when monthly revenue exceeds ~2,000 EUR consistently.

---

## Phase 9: Key Metrics to Track at Each Stage

| Stage | Users | Key Metric | Target |
|---|---|---|---|
| Closed Beta | 50-100 | Week 1 retention | > 40% |
| Public Launch | 500-1,000 | Partner join rate | > 60% of inviters |
| Growth | 5,000-10,000 | Monthly active households | > 30% of signups |
| Monetization | 10,000-20,000 | Free-to-paid conversion | > 3% |
| Scale | 50,000-100,000 | LTV:CAC ratio | > 3:1 |
| Mature | 100,000+ | Monthly revenue | > 10,000 EUR |

---

## Phase 10: What Could Kill This (Be Honest With Yourself)

1. **Trying to do too much.** Your biggest risk right now. 30+ features means 30+ things that can break, confuse users, or feel half-done. Focus.

2. **Building in isolation.** If you spend 6 months coding without real users, you'll build the wrong thing. Ship ugly and early. Get feedback weekly.

3. **Ignoring retention for growth.** 10,000 downloads with 2% retention is worse than 500 downloads with 40% retention. Fix the leaky bucket before pouring more water in.

4. **Burning out.** You're a student building a full-stack app alone. Set boundaries. Work on this 15-20 hours/week consistently rather than 60 hours one week and zero the next. Consistency wins.

5. **Not charging.** Free apps feel disposable. Charging money (even a small amount) signals value and filters for serious users. Don't be afraid to monetize once you have product-market fit.

6. **A big company copies you.** Apple, Google, or Meta could build "shared household" features into their ecosystems. Your defense: move fast, be opinionated, serve your niche deeply. Big companies build generic tools. You build for couples.

---

## Immediate Next Steps (This Week)

1. **Pick your top 5 features.** Hide everything else behind a "Coming Soon" or remove it from navigation entirely.
2. **Set up crash reporting** (Sentry — free tier). You need to know when things break.
3. **Set up basic analytics** (PostHog — free tier, EU hosting). You need to know what people actually do.
4. **Get 5 couples to install and test.** Watch them. Take notes. Fix what confuses them.
5. **Create your Apple Developer account** (99 EUR/year). It takes time to get approved.
6. **Write your App Store listing** — screenshots, description, keywords.
7. **Set up a simple landing page** (you have one started) with an email signup for launch announcements.

---

## The Honest Timeline

- **Months 1-3:** Closed beta, fixing bugs, getting first 100 users.
- **Months 3-6:** App Store launch, reaching 1,000 users, finding what retains people.
- **Months 6-12:** Growth experiments, adding monetization, reaching 5,000-10,000 users.
- **Year 1-2:** If retention is strong, push growth. Revenue target: 2,000-5,000 EUR/month.
- **Year 2-3:** If you hit 50,000+ active users with healthy retention, this can become your full-time income. Consider raising funding or staying bootstrapped (both are valid).

This is a marathon, not a sprint. Most successful apps took 2-3 years of consistent work before they became sustainable businesses. You're in Finland with low living costs (as a student), a strong social safety net, and a solid technical foundation. That's a better starting position than most founders in the world. Use it.
