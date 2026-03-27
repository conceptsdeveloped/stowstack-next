# Risk Register: StorageAds.com

## Overview

This document identifies every material risk to StorageAds' business, rated by Likelihood (1-5, with 5 being almost certain) and Impact (1-5, with 5 being catastrophic), and provides mitigation strategies for each.

**Color coding:**
- **Red (L×I ≥ 12):** Critical risks requiring immediate action
- **Orange (L×I 8-11):** High-priority risks requiring quarterly attention
- **Yellow (L×I 5-7):** Medium-priority risks requiring annual review
- **Green (L×I ≤ 4):** Low-priority risks to monitor

---

## COMPETITIVE RISKS

### Risk 1: Adverank (A-Funded, 10+ Engineers) Builds Full Attribution

**Description:** Adverank raises Series A, allocates engineering resources to build ad-to-move-in attribution. Captures StorageAds' primary technical moat within 12-18 months.

**Likelihood:** 3 (Medium) — Adverank has funding, engineers, and operator relationships. Building attribution takes 12+ months but is not technically impossible.

**Impact:** 4 (High) — Adverank already has 1,000s of operator relationships through ad management. Upselling attribution to existing customers is lower friction than StorageAds' greenfield sales.

**Risk Score:** 3 × 4 = **12 (RED)**

**Mitigation:**
1. **Speed** — Close 10-15 customers before Adverank announces attribution feature. Lock them in with data lock-in and integrations.
2. **Operator credibility** — Emphasize Blake's founder status and ongoing facility operation. Adverank is a funded company; StorageAds is an operator. Harder to replicate.
3. **Network effects** — Get to 20+ customers generating benchmarking data before Adverank can match it. Competitive advantage shifts from technology to data and community.
4. **Product differentiation** — Don't just match Adverank's attribution. Add strategy layer on top: "Here's the optimal bid strategy for your market and occupancy level, not just what happened."
5. **Switching costs** — Make it expensive to leave through API integrations (PMS, landing page history, performance data).

**Timeline:** Monitor Adverank's engineering hiring and Series A raise. If confirmed, accelerate customer acquisition by 25%.

**Owner:** Blake (strategy), Product (development priorities).

---

### Risk 2: Storable/storEDGE Builds Native Marketing Attribution Into PMS

**Description:** Storable owns storEDGE (PMS) and realizes they can add native marketing attribution as a bundled feature. Every storEDGE user gets attribution without leaving the platform.

**Likelihood:** 2 (Low-Medium) — Storable has the technical capability and data access but has not shown aggressive move into marketing. However, vertical integration is attractive to them.

**Impact:** 5 (Critical) — If Storable bundles attribution with storEDGE, every existing storEDGE customer switches to it. StorageAds loses the primary value prop for storEDGE users (50%+ of addressable market).

**Risk Score:** 2 × 5 = **10 (ORANGE)**

**Mitigation:**
1. **Multi-PMS strategy** — Support storEDGE, SiteLink, Self Storage Manager, Yardi, Cubby. Never be dependent on one PMS. If Storable moves in, operators using other PMS still need StorageAds.
2. **Early partnership** — Approach Storable product team before they build competing product. Position StorageAds as preferred marketing partner for storEDGE customers. Revenue share deal is better than competition.
3. **Build beyond attribution** — Invest in operator community, benchmarking, strategy consulting. If Storable has attribution, StorageAds still has the operator network and data insights.
4. **Switch costs** — Historical performance data, client relationships, content library, case studies. Make leaving StorageAds painful even if another platform has attribution.
5. **Brand positioning** — "Operator-built platform vs. Vendor-built tool." If Storable adds attribution, StorageAds is still the independent operator-focused choice.

**Timeline:** Monitoring ongoing. If Storable hires a marketing/SaaS executive, escalate this risk immediately.

**Owner:** Blake (partnership approach), Product (diversification priorities).

---

### Risk 3: G5 Moves Down-Market to Serve Smaller Operator Portfolios

**Description:** G5, currently focused on REITs and large management companies ($5,000-50,000/mo), decides to build a lower-cost tier targeting 3-15 facility operators at $1,500-3,000/mo. Leverages existing brand and relationships.

**Likelihood:** 2 (Low-Medium) — G5 has shown little interest in down-market, but financial incentives exist (TAM expansion). Execution risk is moderate (G5's product is enterprise-focused; downmarket requires different go-to-market).

**Impact:** 3 (Medium) — G5 has brand recognition and relationships with larger operators. Down-market move would be competitive but not necessarily fatal (G5's cost structure is too high to be truly competitive at $1,500/mo).

**Risk Score:** 2 × 3 = **6 (YELLOW)**

**Mitigation:**
1. **Owner positioning** — StorageAds is operator-built, G5 is enterprise-built. Blake's personal involvement and ongoing facility operation are differentiated. G5 hires vendors; StorageAds is run by an operator.
2. **Simplicity** — Keep StorageAds simple and nimble. G5's infrastructure is designed for complex multi-entity operations. StorageAds is designed for one operator running 3-15 facilities. Easier to use.
3. **Speed** — Capture market share and lock in customers before G5 allocates resources.
4. **Pricing discipline** — Keep StorageAds at $750-1,500/mo and don't add features that drive costs up. Stay lean.

**Timeline:** Low immediate threat. Monitor G5's hiring and product announcements annually.

**Owner:** Blake (competitive positioning), Product (cost discipline).

---

### Risk 4: New Funded Startup Enters Self-Storage Marketing Space

**Description:** Venture-backed startup (or existing ad-tech company pivoting) raises $5-10M, aggressively targets self-storage marketing. Builds attribution, hires storage industry experts, undercuts StorageAds on pricing or outbound.

**Likelihood:** 3 (Medium) — Self-storage is attractive to VCs (recession-resistant, growing SaaS TAM). However, self-storage is niche enough that most VCs miss it initially.

**Impact:** 3 (Medium) — New funded competitor has resources but must still build from zero. First-mover advantage and operator credibility provide defense.

**Risk Score:** 3 × 3 = **9 (ORANGE)**

**Mitigation:**
1. **First-mover advantage** — Get to 50+ customers, $1M+ ARR by end of year 1. Hard to catch up to if StorageAds is already entrenched.
2. **Operator network** — Build relationships with operators, brokers, lenders, SSA chapters. Network effects create switching costs.
3. **Data network effects** — Proprietary benchmarking database. New competitor starts with zero data.
4. **Product depth** — Invest in features and integrations that take time to build (PMS integrations, call tracking, sophisticated attribution).
5. **Brand building** — Blake's personal brand and content. Blake's following and operator network take time to build.

**Timeline:** Monitor industry news. If a Series A is announced in self-storage marketing, escalate immediately.

**Owner:** Blake (brand), Product (differentiation).

---

## PLATFORM RISKS

### Risk 5: Meta Policy Changes Break Pixel Tracking or Targeting

**Description:** Meta restricts pixel-based tracking (e.g., iOS privacy changes, new regulatory requirements), breaks ability to track ad-driven move-ins. Alternatively, Meta tightens ad targeting for storage industry (like it did for real estate/financial services).

**Likelihood:** 2 (Low-Medium) — Meta has already made tracking harder (iOS 14+). Further restrictions are possible but uncertain.

**Impact:** 4 (High) — Meta is 30-40% of StorageAds' channel mix. If tracking breaks, operators lose the attribution story and ROI becomes unclear.

**Risk Score:** 2 × 4 = **8 (ORANGE)**

**Mitigation:**
1. **Server-side tracking** — Implement Conversions API and server-side pixel firing. Less reliant on client-side cookies and browser pixels.
2. **Multi-channel approach** — Ensure Google, organic, SMS, and email are strong channels so Meta breakage doesn't kill the business.
3. **First-party data strategy** — Rely on PMS integrations and direct database queries to track move-ins, not pixel-based data. Operators own their PMS data.
4. **Privacy-safe targeting** — Shift toward contextual and lookalike audiences (requires less granular targeting) as privacy regulations tighten.
5. **Customer communication** — If Meta tracking degrades, proactively communicate what's happening and how StorageAds is adapting. Transparency builds trust.

**Timeline:** Ongoing monitoring of Meta policy updates. Quarterly review of tracking effectiveness.

**Owner:** Product (implementation), Customer success (communication).

---

### Risk 6: Google Policy Changes Affect PPC Tracking or Bidding

**Description:** Google deprecates Enhanced Conversions or changes smart bidding behavior. StorageAds' Google PPC optimization and attribution become less effective.

**Likelihood:** 2 (Low-Medium) — Google changes policies regularly but usually with warning. Google is less aggressive on privacy than Meta.

**Impact:** 3 (Medium) — Google is 20-30% of StorageAds' channel mix. Loss of effective PPC is painful but not catastrophic if other channels are strong.

**Risk Score:** 2 × 3 = **6 (YELLOW)**

**Mitigation:**
1. **API integrations** — Direct integration with Google Ads API for bid adjustments and reporting, less reliant on UI changes.
2. **Conversion API** — Google Conversions API for server-side tracking, more stable than pixel-based.
3. **Diversification** — Maintain strong Meta and organic channels so Google breakage doesn't tank customer results.
4. **Monitoring** — Weekly review of Google policy changes and early testing of new policies before rolling out to customers.

**Timeline:** Quarterly review of Google updates. Immediate escalation if major policy change announced.

**Owner:** Product (implementation).

---

### Risk 7: storEDGE/SiteLink Changes Embed API or Restricts Access

**Description:** Storable changes storEDGE API, deprecates embed capabilities, or restricts third-party integration access. StorageAds' landing page embeds or lead-sync features break.

**Likelihood:** 2 (Low-Medium) — API changes happen, but Storable has incentive to support integrations. However, Storable could tighten access if they decide to compete with StorageAds.

**Impact:** 5 (Critical) — storEDGE integration is core to StorageAds' value prop. If it breaks and can't be fixed quickly, operators lose the ability to see lead status in context.

**Risk Score:** 2 × 5 = **10 (ORANGE)**

**Mitigation:**
1. **Relationship with Storable** — Build strategic relationship with Storable product team. Regular communication, joint roadmap planning. Make Storable see StorageAds as a partner, not a threat.
2. **Multi-PMS support** — Ensure 50%+ of customers are on platforms other than storEDGE (SiteLink, Self Storage Manager, Cubby, etc.). If storEDGE breaks, business doesn't collapse.
3. **Dedicated integration engineer** — Hire engineer responsible for PMS integrations. Can respond quickly if Storable changes their API.
4. **Alternative solutions** — If Storable restricts embed, develop workaround (e.g., iframe solution, data sync via nightly API pull, hybrid approach).
5. **Legal/contractual** — If critical enough, negotiate formal integration agreement with Storable. Reduces unilateral risk.

**Timeline:** Immediately establish relationship with Storable product team. Quarterly check-ins.

**Owner:** Product (integration ownership), Blake (partnership).

---

### Risk 8: Third-Party Cookie Deprecation Impacts Attribution Tracking

**Description:** Chrome and other browsers deprecate third-party cookies (in progress). Ability to track user behavior across sites and connect it to move-ins degrades.

**Likelihood:** 3 (Medium-High) — Cookie deprecation is actively in progress. Timeline is 2-3 years but is certain.

**Impact:** 3 (Medium) — Third-party cookies are used for retargeting and some attribution. Losing them is painful but not fatal if first-party data and server-side tracking are strong.

**Risk Score:** 3 × 3 = **9 (ORANGE)**

**Mitigation:**
1. **Server-side tracking** — Shift to Conversions API and server-side pixel firing. Less reliant on cookies.
2. **First-party data strategy** — Build PMS integrations that give you direct access to lead/move-in data. Don't rely on pixel-based tracking.
3. **Contextual targeting** — Shift from behavior-based targeting (requires cookies) to contextual targeting (content/channel-based). Requires product changes but is viable.
4. **Privacy-safe audiences** — Focus on lookalike and custom audiences based on first-party data (operators' own customer lists).
5. **Messaging API / SMS** — Invest in SMS and email retargeting as alternatives to cookie-based retargeting.

**Timeline:** Begin server-side tracking implementation immediately. Complete transition before major cookie deprecation (2-3 years).

**Owner:** Product (technical implementation), Customer success (operator education).

---

## MARKET RISKS

### Risk 9: Self-Storage Market Softens, Operators Cut Marketing Budgets

**Description:** Recession, market oversupply, declining occupancy. Operators cut marketing spend to preserve cash. StorageAds' target customers can no longer afford $750-1,500/mo.

**Likelihood:** 3 (Medium) — Self-storage is counter-cyclical but not immune to severe recessions. Market oversupply is already happening in some regions.

**Impact:** 4 (High) — If customers cut budgets, revenue declines and customer acquisition slows.

**Risk Score:** 3 × 4 = **12 (RED)**

**Mitigation:**
1. **ROI messaging** — Emphasize attribution story: "In a soft market, you can't afford NOT to know what's working. StorageAds cuts your waste and finds the best channels." This message is stronger in downturns.
2. **Flexible pricing** — Offer lower-tier plans or performance-based pricing during downturns. "Pay based on move-ins you generate" is appealing when budgets are tight.
3. **Churn monitoring** — Watch customer metrics closely. First sign of churn (mid-contract cancellations) is indicator of broader market softening.
4. **Diversification** — Build white-label products for management companies. REITs have bigger budgets and are more recession-resistant than independents.
5. **Customer success** — Obsess over helping customers improve ROI. Customers who are profitable are less likely to cut budgets.
6. **Tier expansion** — Add higher-priced consulting tier ("Let's rebuild your entire marketing strategy") that converts down-market churn into up-market expansion.

**Timeline:** Monitor storage occupancy trends and operator confidence indices quarterly. If occupancy drops below 85% in target markets, escalate.

**Owner:** Blake (customer relationships), Product (pricing flexibility).

---

### Risk 10: REIT Consolidation Shrinks Addressable Market

**Description:** Large REITs (Public Storage, CubeSmart, Extra Space) continue acquiring independent operators. Addressable market of "independent operators" shrinks. Remaining independents are smaller and less able to afford marketing.

**Likelihood:** 2 (Low-Medium) — REIT consolidation is ongoing but not accelerating. Independents still represent significant portion of market.

**Impact:** 3 (Medium) — Consolidation reduces total addressable market (TAM), but doesn't eliminate it. Still 1,000s of independents.

**Risk Score:** 2 × 3 = **6 (YELLOW)**

**Mitigation:**
1. **REIT positioning** — Approach REITs (CubeSmart, Extra Space, Public Storage, Sovran) with white-label offering. "Your operators need marketing tools. Let us build it for you."
2. **Management company angle** — Position toward management companies, not just owner-operators. Management companies are consolidating and can use white-label StorageAds for all their operator customers.
3. **Broker channel** — Build referral relationships with brokers and advisors who help independents. They can recommend StorageAds as competitive tool.
4. **Geographic expansion** — If US market consolidates, expand to Canada, Europe, Australia. Self-storage is global.

**Timeline:** Monitor M&A activity in self-storage annually. If consolidation accelerates, shift positioning to REITs/management companies.

**Owner:** Blake (strategic partnerships), Product (white-label features).

---

### Risk 11: Operators DIY Marketing with AI Tools

**Description:** Operators use AI (Claude, ChatGPT, Perplexity) to write ad copy, design landing pages, manage ad bidding. DIY costs approach zero, operators feel less need for StorageAds.

**Likelihood:** 2 (Low) — AI is improving but can't replicate full StorageAds solution yet. Attribution and PMS integration are non-trivial. Most operators will still prefer managed solution.

**Impact:** 2 (Low) — Even if DIY gets better, StorageAds is still cheaper than hiring an employee and more effective than DIY.

**Risk Score:** 2 × 2 = **4 (GREEN)**

**Mitigation:**
1. **Positioning** — "We don't sell AI. We sell the platform that tells you what's working. Attribution is the hard part, not ad copy."
2. **Complexity** — Lean into the complexity. Make StorageAds do the things AI can't: multi-channel attribution, PMS integration, benchmarking, call tracking.
3. **Managed service** — Offer managed ad service ($1,500-2,500/mo) where StorageAds team manages ads + optimization + strategy. Premium pricing for those who don't want DIY.

**Timeline:** Monitor AI capabilities quarterly. This is lower-priority risk.

**Owner:** Product (positioning).

---

## EXECUTION RISKS

### Risk 12: Can't Scale Beyond X Customers Without Hiring

**Description:** Blake and maybe one contractor can't handle 20+ customers. Onboarding, customer success, support fall apart. Churn increases. Blake burns out.

**Likelihood:** 4 (High) — Early stage SaaS requires founder bandwidth. Blake is currently doing sales, product, and some operations. Scaling without hiring is nearly impossible.

**Impact:** 4 (High) — If customer success fails, churn spikes and reputation damage spreads. Can't acquire customers faster than they churn.

**Risk Score:** 4 × 4 = **16 (RED)**

**Mitigation:**
1. **Hire ops person early** — By customer 10-15, hire a Customer Success Manager to handle onboarding, training, and day-to-day support. This costs $50-80k/year but saves 20 hours/week of Blake's time.
2. **Productize onboarding** — Build self-serve onboarding wizard that walks operators through setup. Video walkthroughs, documentation, templates. Reduce manual handholding from 4 hours to 1 hour per customer.
3. **Document everything** — Create runbooks for onboarding, training, support, and troubleshooting. New hires can follow the runbook without Blake's input.
4. **Automation** — Automate initial setup (PMS connection, pixel installation, email integration) so customer doesn't have to wait for Blake to do it.
5. **First AE by customer 15** — Hire first Account Executive to handle sales. Blake stays involved in strategy and early customer calls but doesn't close every deal.
6. **Help content** — Build knowledge base and FAQ so customers answer their own questions before reaching out to support.

**Timeline:** Start recruiting for ops person now. Hire by customer 10-15. Hire first AE by customer 20.

**Owner:** Blake (hiring decisions), Ops lead (process documentation).

---

### Risk 13: Over-Dependent on Blake for Sales, Strategy, and Operations

**Description:** Customers want to work with Blake, not a sales team. If Blake gets sick, leaves the business, or is unavailable, customer acquisition slows or stops. Business is not sellable.

**Likelihood:** 4 (High) — This is the nature of founder-led sales in early stage. Every founder faces this risk.

**Impact:** 5 (Critical) — If Blake is unavailable and sales stop, business stalls. If Blake leaves, business may collapse.

**Risk Score:** 4 × 5 = **20 (RED)**

**Mitigation:**
1. **Document Blake's approach** — Record sales calls (with permission), document closing techniques, write sales playbook. Make Blake's knowledge repeatable.
2. **Hire strong AE early** — By customer 15, hire Account Executive who can build relationships with operators. Bring them to customer calls, have them lead some demos.
3. **Product-led growth** — Make the free audit tool do more of the selling. Operator sees their own data, schedules demo themselves. Less dependent on Blake's charisma.
4. **Co-founder or operator-in-residence** — Bring on another operator as co-founder or advisor who can fill some of the relationship-building role.
5. **Build company, not a lifestyle business** — Institutionalize processes, hire strong team, build transferable culture. Not just "Blake's SaaS," but "StorageAds is the platform operators use."
6. **Personal brand is an asset, not a liability** — Blake's personal brand is valuable. Invest in it (podcast, LinkedIn, conference speaking) but also make it clear StorageAds works because of the platform, not just Blake.

**Timeline:** Start on this immediately. Hire first AE by customer 15. Build sales playbook by month 6.

**Owner:** Blake (mindset), Product (productization).

---

### Risk 14: PMS Integration Breaks or Changes Unexpectedly

**Description:** storEDGE, SiteLink, or another critical PMS updates their API. Integration breaks. Customers can't sync lead data. Takes 1-2 weeks to fix.

**Likelihood:** 3 (Medium) — API changes happen regularly. Most vendors give warning but some don't.

**Impact:** 4 (High) — If critical integration breaks for 1-2 weeks, customers lose visibility into leads and move-ins. Churn risk is high.

**Risk Score:** 3 × 4 = **12 (RED)**

**Mitigation:**
1. **Dedicated integration engineer** — Hire engineer responsible for all PMS integrations. Can respond to changes quickly and maintain documentation.
2. **Monitoring** — Automated monitoring that alerts team if PMS sync fails. Catch problems in minutes, not days.
3. **Redundancy** — For critical integrations (storEDGE, SiteLink), maintain two methods of syncing data (API + nightly backup). If API fails, fall back to backup.
4. **Customer communication** — If integration breaks, immediately communicate to affected customers. "We're aware of issue, here's the workaround, here's ETA to fix."
5. **Fallback UI** — If PMS data can't sync automatically, let customers manually enter lead data in StorageAds for continuity.
6. **Vendor relationships** — Maintain active relationships with Storable, SiteLink, and other PMS vendors. Early warning about changes.

**Timeline:** Hire integration engineer by customer 10. Build monitoring system immediately. Document all integrations in wiki.

**Owner:** Product/Engineering (technical ownership), Blake (vendor relationships).

---

## PRICING RISKS

### Risk 15: Market Won't Pay $750-1,500/mo Pricing

**Description:** Operators balk at pricing. "I can get Google ads managed for $500/mo." "Adverank is $29/mo." StorageAds can't close deals due to price sensitivity.

**Likelihood:** 2 (Low) — Early conversations with operators suggest they understand ROI. "If you save me $X per move-in, the fee is worth it." However, price resistance is always possible.

**Impact:** 4 (High) — If market doesn't accept pricing, business model breaks. Can't achieve gross margins or profitability.

**Risk Score:** 2 × 4 = **8 (ORANGE)**

**Mitigation:**
1. **Lead with ROI** — Never lead with "$750/mo." Lead with "If we generate 10 move-ins at $50 each, that's $1,500 in rent revenue per tenant. Your marketing cost drops from $300 to $75 per move-in. That pays for StorageAds and saves you money."
2. **Tiered pricing** — Offer lower-cost tier ($500/mo with limited features) and premium tier ($1,500+/mo with concierge). Gives customers choice.
3. **Performance-based pricing** — "Pay $500 base + $50 per move-in above 10/month." Shares risk with customer. Appealing if you're confident in results.
4. **Free trial** — Let customers run free 30-day trial. If they see results, pricing becomes less of an objection.
5. **Case studies and benchmarks** — Show customers exactly what other operators are paying and what results they get. Justifies pricing.

**Timeline:** Monitor pricing feedback from first 5-10 customers. If consistent resistance, adjust pricing model.

**Owner:** Blake (sales strategy), Product (pricing tiers).

---

### Risk 16: Race to the Bottom (Adverank at $29/mo or Aggregator Undercuts)

**Description:** Adverank launches ad management at $29/mo (loss leader). A competitor launches a freemium attribution tool. StorageAds' $750+/mo pricing looks expensive by comparison.

**Likelihood:** 2 (Low-Medium) — Adverank's $29 is for ad management only, not attribution. Direct price comparison is unfair. However, "cheaper" competitor could emerge.

**Impact:** 2 (Low) — StorageAds is competing on outcomes (ROI, attribution, operator credibility), not price. Different market segments.

**Risk Score:** 2 × 2 = **4 (GREEN)**

**Mitigation:**
1. **Differentiation** — StorageAds: full-service, operator-built, attribution. Competitor: DIY tool or ad management only. Not the same product.
2. **Messaging** — "You can buy a hammer for $5 or hire a carpenter for $1,000. Here's what you get for $1,000." Position as premium service, not commodity tool.
3. **Lock-in** — Operator data, performance history, benchmarks, integrations. Make switching costly.
4. **Network effects** — More customers = better benchmarks = better optimization = better pitch. Competitor can't match this early.

**Timeline:** Monitor competitor pricing quarterly. Adjust messaging if needed but don't race to the bottom.

**Owner:** Blake (positioning).

---

## TECHNOLOGY RISKS

### Risk 17: Privacy Regulations Limit Tracking, Targeting, or Data Usage

**Description:** GDPR, CCPA, state privacy laws, or new storage-specific regulations limit ability to track users, retarget, share data, or build custom audiences. Tracking and targeting become restricted.

**Likelihood:** 3 (Medium) — Privacy regulations are tightening globally. GDPR and CCPA are already in effect. More states will follow.

**Impact:** 3 (Medium) — Privacy restrictions make targeting and tracking harder but not impossible. First-party data and server-side tracking mitigate most risk.

**Risk Score:** 3 × 3 = **9 (ORANGE)**

**Mitigation:**
1. **Privacy-first design** — Build first-party data and server-side tracking as core. Don't rely on third-party pixels or cookies.
2. **Consent management** — Implement clear consent workflows. Operators get customer consent for tracking, StorageAds uses data responsibly.
3. **Data minimization** — Only collect data necessary for attribution. Don't build unnecessary customer profiles or sell data.
4. **Contextual targeting** — Shift from behavior-based targeting to contextual targeting (content/channel-based). Requires less PII.
5. **Legal review** — Have lawyer review StorageAds' data practices quarterly. Ensure compliance with GDPR, CCPA, and state laws.
6. **Customer responsibility** — Make clear to operators that they are responsible for getting customer consent. StorageAds is a tool; operator is the data controller.

**Timeline:** Legal review by month 3. Implement privacy-first design by month 6. Ongoing compliance monitoring.

**Owner:** Product (technical implementation), Legal/Blake (compliance).

---

### Risk 18: AI Disruption of Ad Management and Optimization

**Description:** AI (Claude, GPT-5, specialized ad-tech AI) becomes capable of automatically optimizing ad spend, writing copy, and managing campaigns. StorageAds' ad optimization features become commoditized.

**Likelihood:** 2 (Low-Medium) — AI is improving but can't do full optimization yet. Multi-channel attribution and strategy are still hard. But this could change in 2-3 years.

**Impact:** 2 (Low) — Even if AI automates ad optimization, StorageAds' attribution and strategy layers are harder to automate. And operators prefer managed service anyway.

**Risk Score:** 2 × 2 = **4 (GREEN)**

**Mitigation:**
1. **Strategic layer** — Invest in strategy consultation: "Here's the optimal marketing strategy for your market, occupancy level, and growth goals." AI can optimize within a strategy, but setting strategy is still valuable.
2. **Operator community** — Build value beyond technology: peer network, benchmarking, content, education. Community can't be automated.
3. **Managed service** — Offer "hands-on management" tier where StorageAds team (possibly AI-augmented) manages campaigns. Premium pricing for managed service.
4. **Embrace AI** — If AI gets better, use it to make StorageAds better. Don't fight it.

**Timeline:** Monitor AI capabilities. Not an immediate risk but flag for year 2-3 review.

**Owner:** Product (positioning).

---

## SUMMARY TABLE

| Risk | L | I | Score | Priority |
|------|---|---|-------|----------|
| Adverank builds attribution | 3 | 4 | 12 | RED |
| Storable builds native attribution | 2 | 5 | 10 | ORANGE |
| G5 moves down-market | 2 | 3 | 6 | YELLOW |
| New funded startup enters space | 3 | 3 | 9 | ORANGE |
| Meta policy breaks tracking | 2 | 4 | 8 | ORANGE |
| Google policy breaks tracking | 2 | 3 | 6 | YELLOW |
| storEDGE API breaks | 2 | 5 | 10 | ORANGE |
| Cookie deprecation | 3 | 3 | 9 | ORANGE |
| Market softens, budgets cut | 3 | 4 | 12 | RED |
| REIT consolidation | 2 | 3 | 6 | YELLOW |
| Operators DIY with AI | 2 | 2 | 4 | GREEN |
| Can't scale without hiring | 4 | 4 | 16 | RED |
| Over-dependent on Blake | 4 | 5 | 20 | RED |
| PMS integration breaks | 3 | 4 | 12 | RED |
| Market won't pay pricing | 2 | 4 | 8 | ORANGE |
| Race to the bottom | 2 | 2 | 4 | GREEN |
| Privacy regulations | 3 | 3 | 9 | ORANGE |
| AI disruption | 2 | 2 | 4 | GREEN |

---

## ACTION ITEMS (Next 90 Days)

### Immediate (This Month)

1. **Establish Storable relationship** — Schedule call with storEDGE/SiteLink product team. Discuss partnership, integration, competitive risk.
2. **Document PMS integrations** — Create runbook for each critical PMS. Assign one engineer as owner. Set up monitoring alerts.
3. **Monitor Adverank** — Track job postings, Series A announcements, product releases. Escalate if they announce attribution roadmap.
4. **Legal review** — Get lawyer to review data practices, privacy compliance, terms of service.
5. **Build first scalability solution** — Automate customer onboarding. Reduce setup time to <1 hour.

### This Quarter

1. **Hire ops person** — By customer 15, bring on CS manager. Offload onboarding and support.
2. **Pricing strategy** — Validate pricing with first 10 customers. Adjust if needed.
3. **Multi-PMS roadmap** — Commit to supporting 4+ PMS platforms by end of year.
4. **Blake's personal brand** — LinkedIn content, podcast appearances, conference speaking. Build founder brand as moat.
5. **Monitoring and alerting** — Build dashboards for integration health, customer success metrics, competitive monitoring.

### This Year

1. **Hire first AE** — By customer 20, bring on sales person. Blake transitions to strategy/partnerships.
2. **Server-side tracking** — Complete migration away from third-party pixel dependency.
3. **White-label offering** — Build white-label features for management companies and REITs.
4. **Strategic partnerships** — Formal partnerships with 1-2 PMS platforms, 1-2 brokers, 1-2 lenders.

---

## Quarterly Review Process

Every quarter, review this risk register:
1. Update Likelihood and Impact based on new information
2. Flag any risks that have escalated
3. Review mitigation progress
4. Add new risks discovered
5. Document lessons learned

Responsible: Blake + Leadership team. Due: Last week of every quarter.
