# Hardline Shelters

A browser game set in November 1986. Region 7 civil defense has $18M to turn open ground into fallout shelters. You build them, and then you keep the people inside alive through a war.

Open `index.html` in a browser to play. It is a single file with no build step and no server. Fonts load from Google Fonts.

## How it plays

### Campaign

The main menu opens a six-mission campaign on one hand-made region (`SCENARIO` and `MISSIONS` in `src/b_main.js`). Each mission is one war: keep enough people alive until the relief convoy arrives. Passing a mission unlocks the next. Best results are saved in the browser.

| # | Mission | Shelters | Relief after (shifts) | To pass | New trouble |
|---|---|---|---|---|---|
| 1 | First Watch | Meridian | 8-10 | 80% | Leaks, fires, scrubber faults; births, rats, a machinist |
| 2 | Two Doors | Cedar Flats, Meridian | 12-15 | 80% | Aftershocks, generator damage, people at the hatch, crowds from town |
| 3 | The Lake | Hollow Creek, Blackwater, Kestrel | 15-18 | 75% | Floods, bad diesel, door seal failures, exhaust leaks, tunnel collapse |
| 4 | North Ridge | Hollow Creek, Iron Ridge, Cedar Flats, Meridian | 18-22 | 70% | Dysentery, staff fever, spoiled rations, crushes on the stairs |
| 5 | Five Lights | All but Kestrel | 20-25 | 65% | Fallout plumes, convoy delays |
| 6 | Region 7 | All six | 22-30 | 60% | Everything |

Later missions also wear equipment faster and draw more events per shift. Free build (a random region and the building phase) is on the main menu.

**Moving people.** Open a transfer between two shelters and use the People row. People walk through tunnel crawlways, up to 80 per tunnel per shift. Severed and collapsed tunnels cannot be walked.

**Tunnel collapse.** A collapsed tunnel never carries people again and cannot be repaired. Each of its water, air and power lines has an even chance of surviving inside the rubble.

### The region

| Shelter | Ground | Character |
|---|---|---|
| S1 Hollow Creek | 31 m of sand by the Harlan lake | Wide and shallow, roomy, weakest shaft, one generator short |
| S2 Iron Ridge | Bare rock on the north ridge | Narrow, 44 m deep, very strong, one water tank |
| S3 Blackwater | Lakeshore sand | Floods |
| S4 Cedar Flats | Sand over rock | Balanced |
| S5 Meridian | Thin soil over rock by Dunmore | Fills first, small fuel bunker |
| S6 Kestrel | Sand past Oswin | Extra stores, sandy tunnels |

### Full game

**1. Build.** Each game generates a new region with towns, lakes, forest and hills. Under every spot there is a layer of sand on top of rock.

- Place up to six shelters on the map. Roads to them are laid automatically.
- Design each silo shaft in cross-section. You pick the top diameter, and each 4 m floor can stay the same width or get narrower, never wider.
- Sand is cheap to dig but needs heavy lining and gives poor blast protection. Rock costs more to blast but holds.
- Fill the floor bays with living quarters, storage, air scrubbers, water tanks, water filtration, fuel tanks and generators.
- Dig tunnels between shelters and to Shelter Control. Each tunnel carries water, air and/or power lines. Its depth and how much of it runs through rock decide whether it survives the shocks.

**2. Commission.** Tanks and stores are filled, the screen fades to black, and the sirens sound.

**3. Survive.** Each shift is six hours. People arrive, the first strike lands, and random events follow: aftershocks, fires, leaks, flooding, bad diesel, sickness, people at the hatch and convoy delays.

- Drag between shelters to set up standing flows of water, air and power. Tunnel lines have limited capacity.
- Overhaul equipment, open LiOH canisters, repair cut lines and answer the wardens' mail.
- Relief arrives after 10 to 14 shifts.

## Source

`index.html` is generated from the files in `src/`. To rebuild it after editing them:

```bash
python3 src/build.py
```

| File | Contents |
|---|---|
| `b_template.html` | Page shell and the builder-specific CSS |
| `px_css.txt` | Base pixel-art UI styles |
| `b_core.js` | Terrain generation, roads, construction costs, silo and tunnel models |
| `b_build.js` | Canvas rendering helpers, the build-phase map, the silo designer and the tunnel dialog |
| `b_ops.js` | War simulation (power, air, water, food, flows), mail, the event deck and the operations UI |
| `b_main.js` | Input routing, the top bar and the game lifecycle |
