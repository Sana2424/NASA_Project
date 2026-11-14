# Outpost Commander: Story Design v3 (Hybrid)

**Status:** design for review. No game code yet.
**Format:** a branching story (6 chapters, 20 endings) driven by **3 meters** and **real NASA data**, with a **Rulebook** that only gets you to the best endings if you also manage your numbers well.

---

## 1. Why hybrid (how it matches the challenge)

| The challenge asks for… | How we deliver it |
|---|---|
| "Manage an outpost… life support, radiation shielding, power, food, communication delay" | 🫁 Oxygen, ⚡ Power and ☢️ Radiation meters + 🍅 food pantry + 📡 **Ask Earth** delay in every chapter |
| "No choice is free" | Every option, **including the by-the-book one**, shows its cost on the meters before you pick |
| "Trade oxygen reserves for an extra research opportunity" | Chapter 6: the EVA to the ancient-life rock |
| "Reinforce shielding… at the cost of tonight's power supply" | Chapter 3: the regolith wall drains **tonight's** battery |
| "Experience how choices play out over the course of a mission" | Meters and flags carry across 18 sols; mistakes catch up with you later |
| "Ground it in real NASA data… DONKI, OSDR, Mars surface data" | Real data decides outcomes (section 6), not just fact cards |
| "2–3 core resources, not 5–6" | 3 meters (+ a simple food counter) |
| Replayability | Each mission picks a **real 18-day window** of solar weather, so the same choice can play out differently |

**The rulebook is not an answer key.** The rules need judgment with numbers ("keep 30% reserve" means you have to read the meter). Sometimes two rules seem to clash, and the rulebook's **priority order** settles it. The best ending needs **good rules + good management**.

---

## 2. The meters

| Meter | Starts at | Danger | What fills it / drains it |
|---|---|---|---|
| 🫁 **Oxygen** | 70 | **Reserve line 30.** At 0 → early ride home | Air maker (+), crew breathing (−), leaks / EVAs (−) |
| ⚡ **Power (battery)** | 60 | **Reserve line 30.** At 0 → systems shut down | Solar cells + reactor (+), every system and action (−) |
| ☢️ **Radiation dose** | 0 | **Limit 100.** Full → doctors call the crew home | Everyday space radiation (+), storms (+), EVAs (+). Shielding reduces it |
| 🍅 **Food** (pantry, in days) | 12 days | 0 → early ride home | Greenhouse harvest (+, **arrives one round later**), eating (−) |
| 🛡️ Shield *(level)* | 0 | — | Built with power. Each level: −1 everyday radiation per round, −10% storm dose |

Hidden **flags** remember the story: `leo_hurt`, `crew_tired`, `have_reactor`, `mold_risk`, `no_radio_count`.

---

## 3. Two kinds of gameplay

### A. Story chapters (6)
A scene + 3 choices (✅ by the book · ⚠️ risky · ❌ dangerous) + the option to **📡 Ask Earth**.

### B. Sol Planning (4 rounds, between chapters)
A quick power-budget screen covering the next 3–5 sols. You get **⚡ power cells** (how many depends on real weather data) and place them:

| System | 1 cell does… | Rule link |
|---|---|---|
| 🫁 Air maker | +10 oxygen | Rule 2 |
| 🔥 Heat | Crew stays healthy (skip it → `crew_tired`) | Rule 2 |
| 📡 Radio | Daily check-in + **storm and dust warnings** for the next chapter | Rule 6 |
| 🌱 Greenhouse | +3 days of food, **ready next round** | — |
| 🛡️ Shield | +1 shield level (forever) | — |
| 🔋 Unused | +10 battery | Rule 8 |

**Every round, the crew uses:** 🫁 −20 · 🍅 −4 days · ☢️ +6 (minus shield)

**A sunny round gives 6 cells.** Covering air (2) + heat (1) + radio (1) + greenhouse (1) leaves just **1 spare**, so there's never enough for everything.

**Rulebook check each round:** ✅ if oxygen ends ≥ 30, heat is on, the radio is on, and (before Ch4, if warned) battery ≥ 60.

### C. 📡 Ask Earth (every chapter)
- Costs **⚡ −5** (big antenna).
- The round-trip time is real: Earth–Mars distance on the mission date (JPL Horizons), e.g. 14 min each way = **28 min wait**.
- Each chapter has a **time clock**. If the clock is longer than the wait, Earth's advice arrives in time. If not, it arrives **too late** and you must decide alone (**Rule 7**).
- **Teaches judgment:** in Ch1, Ch5 and Ch6 waiting is fine; in Ch3 (a storm arriving in under an hour) it isn't.
- *Moon version (later):* 1.3 s delay, so asking almost always works. A good contrast.

---

## 4. 📕 The Junior Astronaut Rulebook (open anytime)

**Priority order:** if two rules clash, the lower number wins.

| # | Rule | Real NASA basis |
|---|---|---|
| 1 | **Stay with your shelter** when something goes wrong far from base | Apollo "walkback limit"; survival training |
| 2 | **Air → Heat → Talk → Food → Science**, in that order | Life-support priorities |
| 3 | **Never go outside alone** | Spacewalk buddy system |
| 4 | **Keep a reserve:** never plan to drop below 30 oxygen or 30 power | EVA consumable turnaround limits |
| 5 | **Radiation warning → shelter.** No exceptions | ISS / Orion solar-storm shelter procedures |
| 6 | **Check in with Earth every sol** | Daily communication passes |
| 7 | **Emergency? Do the checklist first, then tell Earth** | ISS emergency response (fire, leak, toxic air) |
| 8 | **Charge up before the dark** (night or dust storm) | Rover power planning; Opportunity, 2018 |
| 9 | **Quarantine sick plants** | NASA Veggie experiments (OSDR) |
| 10 | **Science never beats safety** | NASA safety culture |

**Rulebook score:** 10 checks per mission (6 chapter decisions + 4 planning rounds).

---

## 5. The chapters

### Chapter 1: Hard Landing · Sol 1 · ⏱️ clock: 2½ h until sunset
> *BANG.* The lander thumps down **6 km from base**. Leo twisted his knee. Tonight: **−78 °C** *(real Curiosity reading for this date)*. The suits hold 6 hours of air. The rover is jammed in the cargo bay. The lander's battery can keep you warm for **one night**.

| Choice | Tag | Cost / effect |
|---|---|---|
| Stay in the lander tonight, splint Leo's knee, walk at sunrise | ✅ R1 | ⚡ −15 (heater) · 🫁 −5 · 🍅 −1 day (one sol lost). Leo is fine. |
| Dig out the rover, drive in the dark | ⚠️ R4 | 🫁 −15 (suits dip below reserve while digging) · ⚡ −10 · arrive tonight |
| Walk 6 km now, carrying Leo | ❌ R1, R4 | 🫁 −25 · ☢️ +3 · `leo_hurt` |
| 📡 Ask Earth | — | ⚡ −5. **Arrives in time** (28 min < 2½ h): *"Stay with the lander. Rule 1."* |

### Chapter 2: Waking the Base · Sol 2 · ⏱️ clock: tonight
> The base has slept for a year. The battery can run only **2 of 4 systems** tonight (⚡ −10 each).

| Choice | Tag | Cost / effect |
|---|---|---|
| 🫁 Air + 🔥 Heat | ✅ R2 (Air & Heat outrank Talk) | ⚡ −20 · 🫁 +10 · Earth doesn't hear from you tonight (no penalty: R2 outranks R6) |
| 🫁 Air + 📡 Radio | ⚠️ R2 | ⚡ −20 · 🫁 +10 · `crew_tired` |
| 🫁 Air + 🌱 Greenhouse | ⚠️ R2 | ⚡ −20 · 🫁 +10 · 🍅 +3 next round · `crew_tired` |
| 🔥 Heat + 📡 Radio | ❌ R2 | ⚡ −20 · 🫁 −15 overnight. If 🫁 < 30 → **Ending 8** |
| 📡 Ask Earth | — | ⚡ −5. Arrives in time: *"Air and heat first. Rule 2."* |

### 🗓️ Sol Planning: Round 1 (Sols 2–5) · ☀️ 6 cells (clear skies)

### Chapter 3: Storm Warning · Sol 5 · ⏱️ clock: under 1 hour
> **Only if the radio was on in Round 1:** Earth relays a NASA alert about a solar flare *(real DONKI flare for this mission date, e.g. X8.2, Sept 10, 2017)*. You're halfway through hauling supplies, and the **spare reactor** is still at the cargo drop 2 km away.
>
> **If the radio was off:** no warning. The crew is out on the supply run. If the DONKI date has a real storm, it hits them: ☢️ + full storm dose. *(Lesson: Rule 6.)*

**Storm dose** comes from the real DONKI record for this date: small storm 15 · strong 25 · extreme 35. Shielding reduces it by 10% per level. Some flares cause **no storm at all** (a real false alarm).

| Choice | Tag | Cost / effect |
|---|---|---|
| Everyone into the water-walled shelter now | ✅ R5 | ⚡ −5 · no reactor · ☢️ +storm × 0.2 |
| Pile regolith on the walls first, then shelter | ⚠️ R5 | **⚡ −20 tonight** (rover charges from the base) · 🛡️ +2 forever · ☢️ +storm × 0.5 |
| Finish the supply run, grab the reactor | ❌ R5, R10 | Get `have_reactor` (+2 cells every round) · ☢️ +full storm. Real storm + already ☢️ ≥ 60 or `leo_hurt` → **Ending 16** |
| 📡 Ask Earth | — | ⚡ −5. **Arrives too late** (28 min wait; the particles are already here). *"Rule 7: you had to decide."* |

### 🗓️ Sol Planning: Round 2 (Sols 5–9) · ☀️ 6 cells (+2 with reactor)
If the radio is on: *"Mars Reconnaissance Orbiter sees a dust storm coming."* Rule 8 check: battery ≥ 60 before Ch4.

### Chapter 4: The Dust · Sol 9 · ⏱️ clock: days
> The sky turns orange. Solar power falls to a trickle *(real Curiosity data from the 2018 storm)*. Opportunity, 2018, comes up in the story.

| Choice | Tag | Cost / effect |
|---|---|---|
| Power down: air + night heat only, greenhouse on minimum | ✅ R8, R2 | ⚡ −10 · no harvest next round |
| Keep the greenhouse lights on | ⚠️ R2, R8 | ⚡ −30 · harvest continues |
| Run everything as normal | ❌ R8 | ⚡ −50. If ⚡ hits 0 → **Ending 14** (or **20** if Ch2 was ❌). With the reactor: ⚡ −30 instead |
| 📡 Ask Earth | — | ⚡ −5 (expensive when power is scarce!). Arrives in time: *"Power down. Rule 8."* |

### 🗓️ Sol Planning: Round 3 (Sols 9–14) · 🌫️ 2 cells (+2 with reactor)
The hardest round: air alone needs 2 cells. Everything else comes from the battery you saved.

### Chapter 5: Garden Trouble · Sol 14 · ⏱️ clock: 1 sol
> Mei finds fuzzy mold on the lettuce. *Real event: in 2016, fungus attacked NASA's Veggie garden on the ISS, and astronaut Scott Kelly saved the zinnias. Fungus genomes: OSDR study OSD‑177.*

| Choice | Tag | Cost / effect |
|---|---|---|
| Quarantine the sick plants in sealed bags, clean the tray | ✅ R9 | 🍅 −2 days of harvest · ⚡ −5 |
| Treat them in place (fans + trimming) | ⚠️ R9 | ⚡ −10 · 50% chance the mold returns: 🍅 −4, `mold_risk` |
| Ignore it | ❌ R9 | Mold reaches the air filters: 🫁 −30. If 🫁 < 30 → **Ending 19** |
| 📡 Ask Earth | — | ⚡ −5. **Arrives in time** with the real OSDR advice. *(Lesson: when there's time, asking is smart.)* |

### 🗓️ Sol Planning: Round 4 (Sols 14–18) · ⛅ 4 cells (dust clearing)

### Chapter 6: The Big Choice · Sol 18 · ⏱️ clock: half a sol
> The rover spots rock with **"leopard spots" 12 km away**, like the rock Perseverance found in 2024 that *might* hold signs of ancient life.
> **A trip costs 🫁 −20 · ⚡ −15 · ☢️ +8.**

| Choice | Tag | Cost / effect |
|---|---|---|
| Buddy EVA with a turnaround time | ✅ **only if** 🫁 and ⚡ stay ≥ 30 after the costs, otherwise ⚠️ R4 | 🫁 −20 · ⚡ −15 · ☢️ +8 · 🔬 **big discovery** |
| Send photos to Earth, mark the spot for the next crew | ✅ R10 | ⚡ −5 · 🔬 small discovery |
| Go alone to save oxygen | ⚠️ R3 | 🫁 −12 · ⚡ −15 · ☢️ +8 · 🔬 big |
| Keep driving past the turnaround for a better sample | ❌ R4, R10 | 🫁 −35 · ⚡ −25 · ☢️ +12. If 🫁 < 10 → **Ending 18** |
| 📡 Ask Earth | — | ⚡ −5. Arrives in time: *"Check your reserves first. Rule 4."* |

> **Why this matters:** the rule-following EVA is only possible if you managed well earlier. That's how **good management** separates 🏆 Ending 2 from 🏆 Ending 1.

---

## 6. Real NASA data → what it changes

| Game variable | Dataset | Status |
|---|---|---|
| Storm warning, storm yes/no, storm strength (Ch3, every round) | **DONKI** FLR + SEP (CCMC, live or archived window) | ✅ Tested, works in browser |
| Whether a CME reaches Mars | **DONKI WSA-ENLIL simulations** (Mars arrival predictions) | ✅ Tested, needs parsing |
| Night temperature, sunrise and sunset (Ch1), sunny vs dusty | **Curiosity REMS weather** (4,745 sols) | ✅ Tested; using its UV/dust fields for the 2018 storm still needs checking |
| Radio delay, whether Earth's reply arrives in time | **JPL Horizons** Earth–Mars distance | ✅ Tested; pre-compute (no browser access) |
| Everyday radiation, storm scale | **Curiosity RAD** published values (0.64 mSv/day; May 2024 spike) | Embedded (papers) |
| Plant mold (Ch5), greenhouse lighting | **OSDR** OSD‑177 (Veggie fungus), OSD‑766 (Veggie tomatoes / lighting) | ✅ Tested; pre-download (no browser access) |
| Leopard-spot rock (Ch6), scenery | **Perseverance raw images** + NASA Image Library | ✅ Tested, works in browser |
| Oxygen use, food | NASA Life Support Baseline Values (BVAD) | Embedded (document) |

The game always labels data as **LIVE** or **ARCHIVE**.

---

## 7. The 20 endings

**Order the game checks them in:** a ❌ trigger ends the game immediately → at the end of each round, check: 🫁 0 / 🍅 0 / ☢️ 100 / ⚡ 0 / radio off 2 rounds in a row → at the end of Ch6, final evaluation.

### 🏆 Best (2): Rulebook 10/10
| # | Ending | Trigger |
|---|---|---|
| 1 | **By the Book** | 10/10 + photos only in Ch6 |
| 2 | **By the Book + Discovery** | 10/10 + buddy EVA with reserves intact *(needs great management)* |

### ⭐ Mission complete, with a lesson (5): survived, 6–9/10
| # | Ending | Trigger |
|---|---|---|
| 3 | **Almost by the Book** | 8–9/10, no other ⭐ condition |
| 4 | **Cold Crew** | Finished with `crew_tired` |
| 5 | **Radiation Souvenir** | Finished with ☢️ ≥ 60: the crew can't fly again |
| 6 | **Hungry Heroes** | Finished with 🍅 ≤ 2 days |
| 7 | **Science Over Safety** | Got the sample with a ⚠️/❌ EVA: Mission Control grounds you |

### 🚀 Mission cut short, crew safe (7)
| # | Ending | Trigger |
|---|---|---|
| 8 | **Early Ride Home: Oxygen** | 🫁 < 10 at a check, or Ch2 ❌ with 🫁 < 30 |
| 9 | **Early Ride Home: Radiation** | ☢️ ≥ 100 (not from Ch3 ❌) |
| 10 | **Early Ride Home: Power** | ⚡ hits 0 in a planning round |
| 11 | **Early Ride Home: Food** | 🍅 hits 0 |
| 12 | **Medical Evacuation** | `leo_hurt` + any later EVA |
| 13 | **Lost Contact** | Radio off 2 planning rounds in a row (R6) |
| 14 | **Greenhouse Fire** | Ch4 ❌ drains ⚡ to 0 (the crew follows the fire checklist) |

### ❌ Mission failure, crew rescued, base lost (6)
| # | Ending | Trigger |
|---|---|---|
| 15 | **Stranded in the Dark** | Ch1 ❌ + any second ❌ |
| 16 | **Caught in the Storm** | Ch3 ❌ + a real storm + (☢️ ≥ 60 or `leo_hurt`) |
| 17 | **Frozen Base** | ⚡ 0 in Round 3 (dust) while `crew_tired` |
| 18 | **Past the Turnaround** | Ch6 ❌ leaves 🫁 < 10 |
| 19 | **Moldy Air** | Ch5 ❌ drops 🫁 below 30 |
| 20 | **Silent Base** | Ch2 ❌ + Ch4 ❌ |

**Every ending screen shows:** your path (✅ ⚠️ ❌ for each decision, and which rule), the rulebook score, a meter chart over the 18 sols, the real dates and data behind your storm and dust, and **"Try again"**.

---

## 8. Defaults chosen (tell me if you want them changed)
- **Nobody dies.** The worst endings are "crew rescued, base lost", which suits ages 7–12.
- **The rulebook is open anytime.** Reading the rules is part of the skill; real astronauts use checklists.
- **Mars first.** A Moon version can reuse the same structure later, with a 1.3 s delay, no dust, and stronger radiation.
- **Balance numbers are first guesses.** We'll tune them by playtesting, and I'll run a bot through every path to make sure all 20 endings can be reached and only 2 are best.
