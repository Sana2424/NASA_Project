# Outpost Commander

A browser game for ages 7–12. You run a Moon or Mars outpost for 20 sols, and the space weather is real NASA data.
Every sol you split a limited number of ⚡ power cells between **air**, **greenhouse food**, **radiation shielding**, **science** and the **radio to Earth**. There's never enough power for everything, so every choice costs something.

**Play:** open `index.html` in a browser. You don't need to install anything, make an account or run a build step.
(If your browser blocks local scripts, run `python3 -m http.server` in this folder and open http://localhost:8000.)

## The core trade-offs

| Decision | What it costs | The real constraint it teaches |
|---|---|---|
| Power to the **oxygen maker** | Power that can't go to science or shielding | Oxygen is the #1 consumable (≈0.84 kg/person/day) |
| Power to the **greenhouse** | Food arrives **3 sols later**; if a sol gets 0 power, growing plants wilt | Food production has lag, so you have to plan ahead |
| **Build regolith shielding** | Power today, for protection on every later sol | Passive shielding is an up-front investment |
| **Shelter the crew** when a storm watch comes in | No science, a smaller harvest, and some warnings are false alarms | Forecasts are imperfect, and caution has a price |
| **EVA (go exploring)** | 2× science, but 2× radiation | Suits protect much less than habitat walls |
| **Radio on** (1 ⚡) | Power | No radio means no storm warnings, and data only counts once it's sent home |
| **Unused power → battery** | Battery capacity is small | Storing energy for dust storms or lunar shadows |
| **Cargo packing** (4 slots) | A reactor takes 2 slots; food, oxygen and water walls compete for the rest | Launch mass is the first trade-off of every mission |
| **Ask Mission Control** | On Mars the answer arrives *after* you have to decide | Communication delay means the crew has to work on its own |

Random event cards (clogged filters, sick plants, micrometeorites, ice discoveries, dusty panels) always give two options, and both cost something.

**Moon vs Mars play differently:** the Moon has strong sunlight but about 2× the radiation, with no air to stop storm particles, and its shadow periods are predictable. Mars has weak sunlight (≈43% of Earth's), dust storms, a thin atmosphere that blocks some radiation, and radio delays of several minutes.

## NASA data used (and how)

| Source | What we use | Live or archived |
|---|---|---|
| **DONKI** (NASA CCMC Space Weather Database), `ccmc.gsfc.nasa.gov/DONKI/WS/get/{FLR,SEP}` | Solar flares (class M/X) and Solar Energetic Particle (SEP) events. Each mission sol is one real day. A day with SEP records becomes a radiation storm, and storms with >100 MeV particles are stronger. Flares (or, 70% of the time, rising particles) trigger the "storm watch", so false alarms and surprise storms happen just as they do in real forecasting. | **Live**: the last 20 days, fetched when the page loads. If CCMC is unreachable, the game falls back to `api.nasa.gov/DONKI` with the key in `config.js`. **Archive**: 10 historic windows (2011–2025) downloaded 2026‑11‑14 and stored in `data/donki_archive.js`; full event records with DONKI IDs are in `data/donki_raw_events.json`. The game always labels archived data as archived. |
| **Curiosity RAD** (NASA/JPL, Hassler et al. 2014) | Mars surface ≈0.64 mSv/day, compared with ≈1.37 mSv/day on the Moon (Chang'e‑4 LND, Zhang et al. 2020). This sets the 2.15× Moon:Mars background ratio. Two Mars-only storms from NASA RAD reports (10 Sep 2017; 20 May 2024 far-side event, ~8,100 µGy) are added to those windows. | Embedded |
| **NASA Image Library** (`images.nasa.gov`) | Perseverance Mastcam‑Z Jezero panorama (PIA24264); LRO WAC lunar south pole mosaic (PIA13523) | Downloaded to `assets/` |
| **Planet positions** | Approximate heliocentric longitudes of Earth and Mars (mean orbital elements plus equation of center) on the mission dates. These set the light-time delay, how likely a storm seen at Earth is to also reach Mars, and solar-conjunction radio blackouts (elongation < 3°). | Computed |
| Fact cards | NASA-STD-3001 (600 mSv career limit), Life Support BVAD (O₂ use), MOXIE results, Veggie VEG‑01, Twins Study, OSDR, LCROSS, Artemis I MARE (Helga & Zohar), Opportunity 2018 dust storm, Fission Surface Power / KRUSTY, LRO lighting, Solar Cycle 25 maximum | Cited in-game |

### What's real and what's scaled for play
* **Real:** the dates and sizes of flares and radiation storms, which days had storms, the Moon/Mars radiation ratio, Mars' weaker sunlight, the planet geometry and light delay, and every fact card.
* **Scaled:** the "radiation budget" percentage. The ratios between sites, shielding and sheltering are physically sensible, but the totals are compressed so choices visibly matter within 20 sols. Air, food and power units are also game units, with consumption rates tuned to a crew of 4.

## Files
* `index.html`, `style.css`, `game.js`: the game (vanilla JS, no dependencies)
* `config.js`: optional api.nasa.gov key, used only as a fallback. **It's visible to anyone who loads the page**, so swap in `DEMO_KEY` or your own key before hosting publicly.
* `data/donki_archive.js`: per-day DONKI summaries for the 10 historic windows
* `data/donki_raw_events.json`: the underlying DONKI flare/SEP records with IDs, for verification
* `assets/`: NASA photos (public domain)

## Classroom ideas
* Have half the class play Moon and half play Mars with the same storm window, then compare which storms hurt more and why.
* Replay the same mission (🔁 button: same storms, same events) with a different strategy, such as shelter vs no shelter.
* Pick "LIVE" and talk about what the Sun is doing this week.
* Older students can open `data/donki_raw_events.json` and look up each DONKI event ID on the CCMC website.
