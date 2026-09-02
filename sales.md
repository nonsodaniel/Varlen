# Sivena — Sales, Revenue & Growth Projection
**Year 1: September 2026 – August 2027**

*Prepared by: Sales & Finance Manager / Growth Lead*
*Date: August 7, 2026*
*Status: Internal Planning Document — Confidential*

---

## Executive Summary

Sivena is a freemium life coordination platform targeting couples, families, and households. We monetize through recurring subscription plans ($4.99/mo, $39.99/yr, $7.99/mo family) distributed via Apple App Store and Google Play, powered by RevenueCat.

This document presents a realistic, grounded 12-month revenue and growth projection anchored in consumer app benchmarks, our built-in viral loop (the partner invite mechanic), and known seasonal demand spikes relevant to our audience.

**Year 1 Targets (conservative base case):**
| Metric | Target |
|---|---|
| Total App Downloads | 26,000–30,000 |
| Registered Users (end of year) | 18,000–22,000 |
| Monthly Active Users (month 12) | 4,000–5,000 |
| Paying Subscribers (month 12) | 200–260 |
| MRR at End of Year 1 | $1,100–$1,500 |
| Total Cash Revenue (Year 1) | $10,000–$14,000 |
| ARR Run Rate (August 2027) | $13,200–$18,000 |

These numbers are achievable without a paid acquisition budget. With even modest ad spend ($500–$1,000/month from month 6 onward), the upper bounds become reachable.

---

## Section 1: Where We Are Now (August 2026)

### Current State
- Mobile app built and deployed on iOS (App Store) and Android (Google Play)
- Backend infrastructure live: Railway (NestJS + PostgreSQL), Vercel (landing page + admin)
- RevenueCat subscription infrastructure fully wired and tested
- ASO implemented (Smart App Banners, AASA, assetlinks, structured data, sitemap)
- Auth flows stable (email/password, Google OAuth, Apple Sign-In)
- Core product complete: Tasks, Calendar, Expenses, Shopping Lists, Wellness, Habits, Journal, Meal Planning, Baby Tracking, AI Assistant, Activity Feed

### Monetization Infrastructure (Ready)
- Three pricing tiers live in App Store & Play Store
- Paywall screens implemented with feature comparison UI
- Premium feature gating active (meal planning, savings goals, wellness trends, budget insights, countdowns, weekly recap)
- Subscription webhooks (purchase, renewal, cancellation, expiration) syncing to backend
- Free tier limits create meaningful upgrade pressure (1 circle, 50 list items, 30-day history, 5 saved date ideas, 3 AI messages/day)

### What We Do NOT Have Yet
- A marketing budget
- Active social media presence
- Press coverage
- Paid user acquisition
- Any revenue

This means everything in the first 3 months comes from organic channels: App Store discovery, word of mouth, and the partner invite loop.

---

## Section 2: Our Growth Engine — Why This Can Work

### 2.1 The Built-in Viral Loop

Most consumer apps struggle to grow because they are individual tools. Sivena is fundamentally different: **it is worthless alone and valuable in pairs.** This creates a structural viral loop.

When one person downloads Sivena and sets up a household:
1. They immediately invite their partner or family members
2. The app prompts this at onboarding with clear value framing ("Add your partner to unlock shared features")
3. Invited users land directly into an active household — the app is already useful on day one

**Estimated K-factor (viral coefficient): 0.5–0.7**
This means for every 10 organic downloads, we get 5–7 additional users via invites. This compresses our effective cost-per-acquisition significantly.

### 2.2 Seasonal Demand Spikes (Critical to Revenue)

Our audience is couples and families. This creates predictable demand spikes we can plan around:

| Period | Why It Matters | Expected Lift |
|---|---|---|
| **December (Christmas)** | "New year, new us" intent; gifting season | +40–60% downloads |
| **January (New Year)** | Resolutions around togetherness, organization, finances | +50–70% downloads |
| **February (Valentine's Day)** | Single biggest moment for a couples app | +90–120% downloads |
| **May (Mother's Day)** | Parenting mode discovery spike | +25–35% downloads |
| **June–July (Summer)** | Couples traveling, weddings, moving in together | +20–30% downloads |

Valentine's Day alone can be worth 2–3 months of normal acquisition if we execute well.

### 2.3 App Store Optimization (Already Done)

ASO is our primary free acquisition channel. We have:
- Smart App Banners and AASA in place for web-to-app conversion
- Structured data and sitemap indexed by search engines
- Keyword targeting for: "couples app," "family organizer," "shared todo list," "expense tracker couples," "household management app"

These keywords collectively represent **hundreds of thousands of monthly searches** with relatively low competition from well-funded alternatives. Most competing apps are either too simple (basic shared lists) or too expensive/complex (enterprise family apps).

### 2.4 The "10 Apps in One" Positioning

Our most powerful marketing claim is grounded in product reality: Sivena replaces separate apps users already pay for or tolerate using across:
- Shared to-do list (Todoist, Any.do)
- Shared calendar (no good shared calendar exists for couples)
- Expense splitting (Splitwise — but without banking features)
- Shopping lists (OurGroceries)
- Habit tracking (Habitica, Streaks)
- Meal planning (standalone apps, none couples-focused)
- Baby tracking (many fragmented apps)
- Mood/wellness (standalone apps)
- Journal (Day One — individual only)
- AI assistant (fragmented across apps)

At $4.99/month, Sivena is cheaper than most of these individual apps. The value proposition is clear and communicable.

---

## Section 3: Pricing Strategy

### Current Tiers

| Plan | Price | Effective Monthly Cost | Target User |
|---|---|---|---|
| Free | $0 | — | Discovery, trial |
| Pro Monthly | $4.99/mo | $4.99 | Users wanting flexibility |
| Pro Yearly | $39.99/yr | $3.33/mo | Committed users (best value) |
| Family Monthly | $7.99/mo | $7.99 | 3+ member households |

### Blended ARPPU (Average Revenue Per Paying User)

Based on observed industry conversion splits (55% monthly, 30% yearly, 15% family):
- Monthly users: $4.99 × 55% = $2.74
- Yearly users: $3.33 × 30% = $1.00
- Family users: $7.99 × 15% = $1.20

**Blended ARPPU ≈ $4.94/month per paying subscriber**

(Note: yearly subscribers generate $39.99 cash at the moment of conversion, improving cash flow significantly even though MRR counts them at $3.33)

### Apple/Google Revenue Share

App stores take 30% of subscription revenue (reduces to 15% after 12 months under Apple's Small Business Program and for subscribers after month 1 on both platforms).

**Net revenue per paying user: ~70–85% of gross**

For a $4.99 monthly subscriber: we net ~$3.49–$4.24 depending on platform and tenure.

---

## Section 4: Month-by-Month Projection (Sep 2026 – Aug 2027)

### Assumptions
- No paid acquisition budget months 1–5
- Modest paid budget ($300–$500/month) starting month 6
- Partner invite conversion: 50% of users who see invite → invite someone; 45% of invited users join
- Retention: 40% D30 (realistic for a habit-forming household app)
- Freemium → premium conversion: 4.5–5.5% of MAU (higher than industry average due to strong feature gating and household stickiness)
- Monthly churn from premium: 4%

---

### Month 1 — September 2026: Launch

**Activities:** Soft launch, ProductHunt submission, Reddit posts (r/mildlyinteresting, r/relationships, r/lifehacks, r/LifeProTips), direct outreach to 50 couples in personal network, Apple Search Ads basic setup.

| Metric | Value |
|---|---|
| New Downloads | 550 |
| New Registered Users | 370 (67% install-to-register) |
| Users from Partner Invites | ~100 |
| Total Registered (cumulative) | 470 |
| MAU | 310 |
| New Paying Subscribers | 12 |
| Total Paying Subscribers | 12 |
| MRR | $59 |
| Cash Received | ~$110 (mix of monthly + some annual upfront) |
| Infra Cost | $120 |
| Net | –$61 |

**Notes:** Launch month is always slow. Focus is on collecting feedback, not revenue. The goal is 10+ paying users to validate the funnel works.

---

### Month 2 — October 2026: Early Word of Mouth

**Activities:** First blog post ("Why We Built Sivena"), TikTok/Instagram Reels content begins (budget: $0, founder-driven), reaching out to relationship and family bloggers for reviews, App Store reviews push.

| Metric | Value |
|---|---|
| New Downloads | 800 |
| New Registered Users | 540 |
| Users from Partner Invites | +165 |
| Total Registered (cumulative) | 1,175 |
| MAU | 580 |
| New Paying Subscribers | 22 |
| Churn from Existing | 0 |
| Total Paying Subscribers | 34 |
| MRR | $168 |
| Cash Received | ~$250 |
| Infra Cost | $130 |
| Net | +$120 |

**Notes:** First profitable month operationally (infra coverage). The partner invite loop begins to show: nearly 31% of new registered users came from invites, not downloads.

---

### Month 3 — November 2026: Organic Acceleration

**Activities:** ASO begins generating steady traffic, first press mention target (TechCrunch, The Verge "Apps we love" roundup, or local tech press), social content getting traction, push toward App Store featured consideration.

| Metric | Value |
|---|---|
| New Downloads | 1,200 |
| New Registered Users | 810 |
| Users from Partner Invites | +280 |
| Total Registered (cumulative) | 2,265 |
| MAU | 980 |
| New Paying Subscribers | 40 |
| Churn from Existing | 1 |
| Total Paying Subscribers | 73 |
| MRR | $361 |
| Cash Received | ~$560 (several annual subscribers) |
| Infra Cost | $140 |
| Net | +$420 |

**Notes:** Subscriber base crosses 70 — enough to show real signal. Annual subscription cash is meaningful now. App Store algorithm rewards apps with growing install velocity; this month matters for ranking.

---

### Month 4 — December 2026: Holiday Spike

**Activities:** Holiday campaign — "Give your relationship the gift of less chaos" messaging, gift card concept (App Store gifting), push notification campaign for existing free users ("Year-in-review: here's what Sivena helped you do — go Pro to unlock 2027 features"), couples who moved in together over the holidays are a key demographic.

| Metric | Value |
|---|---|
| New Downloads | 2,100 |
| New Registered Users | 1,400 |
| Users from Partner Invites | +520 |
| Total Registered (cumulative) | 4,185 |
| MAU | 1,650 |
| New Paying Subscribers | 72 |
| Churn from Existing | 3 |
| Total Paying Subscribers | 142 |
| MRR | $701 |
| Cash Received | ~$1,200 (December is peak annual plan month) |
| Infra Cost | $165 |
| Net | +$1,035 |

**Notes:** December is a pivot month. The holiday bump combined with year-end "fresh start" motivation drives the highest annual plan conversion of the year. Many subscribers lock in $39.99 upfront. Cash position improves substantially even if MRR moves more gradually.

---

### Month 5 — January 2027: New Year Surge

**Activities:** "New Year, New Us" campaign, push notification to all free users on January 1st and January 2nd, sponsored posts on Pinterest (wedding planning boards, home organization), New Year resolutions category in App Store.

| Metric | Value |
|---|---|
| New Downloads | 2,800 |
| New Registered Users | 1,900 |
| Users from Partner Invites | +700 |
| Total Registered (cumulative) | 6,785 |
| MAU | 2,400 |
| New Paying Subscribers | 105 |
| Churn from Existing | 6 |
| Total Paying Subscribers | 241 |
| MRR | $1,190 |
| Cash Received | ~$1,600 |
| Infra Cost | $185 |
| Net | +$1,415 |

**Notes:** MRR crosses $1,000 for the first time. January is the second-best acquisition month of the year. New Year intent is strong: couples wanting to be more organized together, individuals setting wellness habits, families planning budgets. All three hit our feature set directly.

---

### Month 6 — February 2027: Valentine's Day (Peak Acquisition Month)

**Activities:** Valentine's Day campaign — full effort. Content marketing on TikTok and Instagram featuring "Date Ideas" feature and couple dashboard views. Potential PR feature in lifestyle press. Begin $300/month Apple Search Ads spend. App Store featuring submission. Email drip campaign to all free users highlighting romantic/couple features.

| Metric | Value |
|---|---|
| New Downloads | 3,900 |
| New Registered Users | 2,600 |
| Users from Partner Invites | +1,000 |
| Total Registered (cumulative) | 10,385 |
| MAU | 3,400 |
| New Paying Subscribers | 160 |
| Churn from Existing | 10 |
| Total Paying Subscribers | 391 |
| MRR | $1,932 |
| Cash Received | ~$2,400 |
| Infra Cost | $210 + $300 ads = $510 |
| Net | +$1,890 |

**Notes:** February is the defining month for a couples app. Valentine's Day generates 2–3× normal download velocity. We break 10,000 total registered users. MRR nearly doubles month-over-month. This is also when App Store algorithms reward us with improved organic ranking due to download velocity, which compounds into future months.

This is the month to target app review sites, lifestyle journalists, and couples content creators for reviews.

---

### Month 7 — March 2027: Post-Valentine Normalization + Retention Focus

**Activities:** Shift from acquisition to retention. Focus on feature education: push notifications showing users features they haven't tried yet (Baby Tracking, Savings Goals, Meal Planning), in-app tips, "Did you know?" series. Begin A/B testing paywall screens.

| Metric | Value |
|---|---|
| New Downloads | 2,000 |
| New Registered Users | 1,340 |
| Users from Partner Invites | +520 |
| Total Registered (cumulative) | 12,245 |
| MAU | 3,100 |
| New Paying Subscribers | 110 |
| Churn from Existing | 18 |
| Total Paying Subscribers | 483 |
| MRR | $2,386 |
| Cash Received | ~$2,600 |
| Infra Cost | $230 + $300 ads = $530 |
| Net | +$2,070 |

**Notes:** Churn rises as Valentine's Day impulse signups evaluate whether they want to keep paying. Expect 4–6% monthly churn in months 7–9 on subscribers acquired in February. This is normal and modeled in. Net new subscribers still substantially outpace churn.

---

### Month 8 — April 2027: Steady Growth

**Activities:** Spring household mood (spring cleaning, budgeting after Q1, summer planning begins). Targeted content: "How to split expenses fairly with your partner," "Setting savings goals as a couple." Explore integration with wedding planning communities (The Knot, Reddit r/weddingplanning).

| Metric | Value |
|---|---|
| New Downloads | 2,200 |
| New Registered Users | 1,470 |
| Users from Partner Invites | +580 |
| Total Registered (cumulative) | 14,295 |
| MAU | 3,300 |
| New Paying Subscribers | 125 |
| Churn from Existing | 22 |
| Total Paying Subscribers | 586 |
| MRR | $2,895 |
| Cash Received | ~$3,100 |
| Infra Cost | $250 + $400 ads = $650 |
| Net | +$2,450 |

---

### Month 9 — May 2027: Mother's Day + Family Mode Push

**Activities:** Mother's Day campaign — highlight Family Mode and Baby Tracking features. Reach out to parenting bloggers and influencers. Content: "Why new parents need Sivena (and their partners agree)." App Store screenshot updates to highlight family features.

| Metric | Value |
|---|---|
| New Downloads | 2,600 |
| New Registered Users | 1,740 |
| Users from Partner Invites | +690 |
| Total Registered (cumulative) | 16,725 |
| MAU | 3,700 |
| New Paying Subscribers | 150 |
| Churn from Existing | 27 |
| Total Paying Subscribers | 709 |
| MRR | $3,503 |
| Cash Received | ~$3,800 |
| Infra Cost | $270 + $500 ads = $770 |
| Net | +$3,030 |

**Notes:** MRR crosses $3,500. Family plan conversions increase for the first time, diversifying revenue mix. Baby Tracking is a powerful retention tool — users with babies are some of the stickiest because tracking feeds and diapers is a daily life necessity.

---

### Month 10 — June 2027: Summer + Relationship Milestones

**Activities:** Summer content: "Planning your first trip together," "Moving in together checklist," "Joint savings goal for that vacation." Target recently engaged couples (June is peak engagement month). Explore affiliate partnership with 1-2 couples finance bloggers.

| Metric | Value |
|---|---|
| New Downloads | 2,800 |
| New Registered Users | 1,880 |
| Users from Partner Invites | +740 |
| Total Registered (cumulative) | 19,345 |
| MAU | 4,100 |
| New Paying Subscribers | 170 |
| Churn from Existing | 32 |
| Total Paying Subscribers | 847 |
| MRR | $4,184 |
| Cash Received | ~$4,500 |
| Infra Cost | $290 + $500 ads = $790 |
| Net | +$3,710 |

---

### Month 11 — July 2027: Compounding + Scale

**Activities:** Focus on increasing annual plan conversion (run a "Sivena Anniversary" promo — 20% off annual plan to celebrate 10 months since launch). This converts monthly subscribers to annual, boosting cash. Begin planning Year 2 strategy.

| Metric | Value |
|---|---|
| New Downloads | 3,000 |
| New Registered Users | 2,010 |
| Users from Partner Invites | +800 |
| Total Registered (cumulative) | 22,155 |
| MAU | 4,400 |
| New Paying Subscribers | 185 |
| Churn from Existing | 36 |
| Total Paying Subscribers | 996 |
| MRR | $4,921 |
| Cash Received | ~$5,800 (anniversary promo drives annual conversions) |
| Infra Cost | $310 + $500 ads = $810 |
| Net | +$4,990 |

**Notes:** Approaching 1,000 paying subscribers. Monthly churn stabilizes as the base matures — older subscribers churn at lower rates than new ones because they've integrated Sivena into their daily life.

---

### Month 12 — August 2027: Year 1 Close

**Activities:** Year 1 retrospective, prepare investor deck if seeking funding. Back-to-school season drives Family Mode interest. Target app review roundup articles ("Best productivity apps for couples 2027").

| Metric | Value |
|---|---|
| New Downloads | 3,200 |
| New Registered Users | 2,140 |
| Users from Partner Invites | +850 |
| Total Registered (cumulative) | 25,145 |
| MAU | 4,700 |
| New Paying Subscribers | 200 |
| Churn from Existing | 41 |
| Total Paying Subscribers | 1,155 |
| MRR | $5,706 |
| Cash Received | ~$6,200 |
| Infra Cost | $320 + $500 ads = $820 |
| Net | +$5,380 |

---

## Section 5: Annual Summary

### Year 1 Cumulative Totals

| Metric | Year 1 Total |
|---|---|
| Total App Downloads | ~27,150 |
| Total Registered Users | ~25,145 |
| Total Users via Partner Invite | ~6,945 (27% of total) |
| Paying Subscribers (end of year) | 1,155 |
| **Total Gross Revenue** | **~$37,000** |
| Apple/Google Cut (avg 25%) | –$9,250 |
| **Net Revenue to Sivena** | **~$27,750** |
| Total Infrastructure Costs | ~$4,800 |
| Total Paid Acquisition Spend | ~$3,300 |
| **Total Operating Cost** | **~$8,100** |
| **Net Operating Profit** | **~$19,650** |

### Revenue by Month (MRR Growth Curve)

```
Aug 2027  ████████████████████████████████  $5,706
Jul 2027  ████████████████████████████      $4,921
Jun 2027  ████████████████████████          $4,184
May 2027  ████████████████████              $3,503
Apr 2027  █████████████████                 $2,895
Mar 2027  █████████████                     $2,386
Feb 2027  ███████████                       $1,932
Jan 2027  ██████                            $1,190
Dec 2026  ████                              $701
Nov 2026  ██                                $361
Oct 2026  █                                 $168
Sep 2026  ▌                                 $59
```

### ARR Run Rate at End of Year 1
**$5,706/month × 12 = $68,472 ARR**

This positions us well for Year 2 where natural compounding, word of mouth, and a growing base of annual subscribers creates significant revenue momentum even without aggressive spending.

---

## Section 6: Cost Structure

### Infrastructure Costs (Monthly, Scaling)

| Cost Item | Month 1 | Month 12 |
|---|---|---|
| Railway (backend + DB) | $35 | $80 |
| Vercel (landing + admin) | $20 | $20 |
| RevenueCat | $0 (free <$2,500 MRR) | $99 (after crossing $2,500) |
| OpenAI API (AI feature) | $15 | $45 |
| Resend (email) | $20 | $30 |
| AWS S3 (storage) | $10 | $25 |
| Expo EAS (builds) | $15 | $20 |
| Sentry (error tracking) | $0 | $0 |
| Misc (domains, tools) | $5 | $10 |
| **Total Infra** | **~$120** | **~$329** |

Infrastructure scales slowly relative to revenue growth — this is the advantage of a mobile-first SaaS business.

### Paid Acquisition (Starting Month 6)

| Channel | Monthly Budget | Expected CAC |
|---|---|---|
| Apple Search Ads | $200–300 | $2.50–4.00 |
| Meta (Instagram/Facebook) | $100–200 | $3.00–5.00 |
| Total | $300–500 | avg $3.50 |

At $3.50 CAC and 5% conversion to paid at $4.94 ARPPU, payback period is approximately 14–15 months — acceptable for a subscription business with low churn.

---

## Section 7: Key Risks & Mitigations

### Risk 1: Lower-than-expected free-to-paid conversion
**Probability:** Medium. Consumer app free-to-paid conversion averages 2–5%.

**Our edge:** Feature gating is strong (meal planning, savings goals, AI beyond 3/day, unlimited items, unlimited history). A household that uses Sivena daily for 2 weeks hits limits organically.

**Mitigation:** A/B test paywall screens from month 3. Tighten free tier limits if conversion lags. Add a 7-day free trial for Pro (currently not implemented — this alone typically lifts conversion 30–50%).

### Risk 2: High churn from Valentine's Day spike
**Probability:** High. Impulse downloads in February will have higher churn in March–April.

**Mitigation:** Onboarding is critical. Users who complete onboarding with a partner connected churn at significantly lower rates. Focus retention efforts in March on feature discovery. Email drip to subscribers who haven't used 3+ features showing them what they're missing.

### Risk 3: App Store algorithm changes or de-ranking
**Probability:** Low-medium. Platform risk is real.

**Mitigation:** Dual-platform presence (iOS + Android) distributes risk. Growing web presence (landing page SEO, social) creates platform-independent acquisition. Deep linking from web to app is already built.

### Risk 4: OpenAI API costs scale unexpectedly
**Probability:** Low. AI is rate-limited to 3 free messages/day per user. At scale, this cost remains manageable.

**Mitigation:** Already rate-limited at 30 req/min on the backend. Premium AI access is a Pro-only feature, so revenue scales with usage.

### Risk 5: Competitor enters the space with marketing budget
**Probability:** Medium. The couples/family coordination space is real, and larger apps could add these features.

**Mitigation:** Our moat is the Life Mode system — no competitor offers one app that genuinely adapts from Single to Couple to Family to Parenting with distinct UX for each. Building that takes 12–18 months minimum. We need to move fast on brand recognition.

---

## Section 8: Revenue Optimization Levers

These are concrete actions that can move revenue up, ranked by expected impact and ease of implementation:

### High Impact, Low Effort
1. **7-day free trial for Pro** — Industry data shows this lifts paid conversion 30–50%. Single highest ROI change available. One RevenueCat config change.
2. **Upgrade prompt on hitting free tier limit** — Currently gates the feature; adding a contextual paywall at the exact moment of friction doubles conversion intent. Already partially implemented; needs copy optimization.
3. **Annual plan default** — Show annual plan first on paywall screen. Increases LTV per subscriber by ~35% and reduces churn.

### High Impact, Medium Effort
4. **Referral program** — "Give a friend 1 month free, get 1 month free." Viral loops compound. Build a referral code system using the existing invite infrastructure.
5. **Email onboarding sequence** — 5-email series over 14 days educating new users on one feature per email. Users who discover Meal Planning, Savings Goals, or Baby Tracking are dramatically more likely to convert and stay.
6. **Push notification re-engagement for dormant free users** — "You haven't checked in — here's what your household added this week." Reactivation campaigns average 10–15% re-engagement rate.

### Medium Impact, Medium Effort
7. **Family plan annual option** — Currently family plan is monthly only. Adding $69.99/yr family annual increases LTV for family subscribers by 2.5× and reduces churn.
8. **Lifetime plan (one-time fee)** — Controversial but can generate a cash lump sum. $99.99 one-time payment. Typical LTV is ~20 months for consumer subscriptions, so this is margin-positive at current ARPPU. Useful for a launch spike or promo moment.
9. **Corporate/HR wellness package** — Partner with 1–2 companies to offer Sivena as an employee benefit. $7.99/employee/month for bulk. Target HR managers at companies that already offer mental health apps. This is a Year 2 play but worth scoping now.

---

## Section 9: Year 2 Outlook (Preview)

If Year 1 ends at ~1,155 paying subscribers and $5,706 MRR, Year 2 starts from a compounding base. Natural growth assumptions for Year 2:

- **Starting MRR:** $5,706
- **Monthly growth rate (conservative):** 15%
- **MRR at end of Year 2:** $5,706 × (1.15^12) = ~$25,800/month
- **ARR at end of Year 2:** ~$310,000
- **Total Revenue Year 2:** ~$165,000

At this scale, RevenueCat costs $99/month (already accounted), infrastructure scales to ~$600–800/month. Year 2 is where the business becomes meaningfully profitable and investable.

**Fundraising optionality:** At $25K+ MRR by end of Year 2, Sivena has a defensible pitch for a pre-seed or seed round ($500K–$2M range) to fund paid acquisition and team growth. MRR of $5K+ with growing trend by end of Year 1 is sufficient to begin initial investor conversations.

---

## Section 10: Action Items by Priority

### Immediate (Before September Launch)
- [ ] Set up 7-day free trial for Pro plans in RevenueCat
- [ ] Configure email drip sequence via Resend (5 emails, 14 days)
- [ ] Set up Apple Search Ads account and first campaign (keyword: "couples app," "shared todo," "expense tracker")
- [ ] Create ProductHunt page and find 50+ people to support the launch
- [ ] Post 3 pieces of content to TikTok/Instagram featuring a real couple using the app

### Month 1–3
- [ ] Submit to app review sites (AppAdvice, 148Apps, iMore roundups)
- [ ] Pitch to 3 lifestyle/relationship journalists
- [ ] Implement referral code system using existing invite infrastructure
- [ ] A/B test paywall: annual plan default vs. current layout
- [ ] Set up basic analytics dashboard to track funnel: download → register → invite partner → upgrade

### Month 3–6
- [ ] Valentine's Day campaign assets ready by January 31st
- [ ] Launch affiliate/ambassador program with 2–3 couples content creators
- [ ] Add annual option for Family plan
- [ ] Begin corporate wellness outreach (1–2 HR contacts per week)
- [ ] Apply for App Store featuring (submit to apple-app-store-featuring@apple.com)

---

## Closing Statement

Sivena is solving a real problem in a large, underserved market. Couples apps exist but none are comprehensive. Family apps exist but none are beautiful or adaptive. Productivity apps exist but none understand that life is lived in relationships, not in isolation.

The financial projections in this document are conservative by design. They assume no press coverage, no influencer deals, no viral moment, and no paid acquisition for the first 5 months. In reality, one well-timed press feature or a single piece of viral content can pull forward 3–6 months of projected growth into a single week.

What makes this achievable is structural, not speculative:
1. The partner invite mechanic means every user generates more users organically
2. The free tier creates genuine upgrade pressure without being hostile
3. Seasonal demand spikes are predictable and plannable
4. Infrastructure costs are fixed relative to revenue growth
5. The product is already built and the payment infrastructure already works

The path from $0 to $5,700 MRR in 12 months is not a dream scenario — it is the expected outcome of executing the basics well: a great product, a clear value proposition, consistent content, and being present in the App Store when couples search for solutions.

Year 1 is about proving the machine. Year 2 is about scaling it.

---

*Document maintained by: Sales & Finance / Growth*
*Next review: November 1, 2026 (Q1 actuals vs. projections)*
