# Hardline Shelters

A browser game set in November 1986. Region 7 civil defense has $18M to turn open ground into fallout shelters. You build them, and then you keep the people inside alive through a war.

Open `index.html` in a browser to play. It is a single file with no build step and no server. Fonts load from Google Fonts.

## How it plays

The game currently starts on a hand-made region (the `SCENARIO` in `src/b_main.js`). Six shelters with different strengths are already built and tunnelled together, and the war starts as soon as you take the watch. The building phase described below is still in the code; set `SKIP_BUILD = false` in `src/b_main.js` to play it.

### The starting region

| Shelter | Ground | Character |
|---|---|---|
| S1 Hollow Creek | 31 m of sand by the Harlan lake | Wide and shallow, roomy, weakest shaft, one generator short |
| S2 Iron Ridge | Bare rock on the north ridge | Narrow, 44 m deep, very strong, one water tank |
| S3 Blackwater | Lakeshore sand | Floods |
| S4 Cedar Flats | Sand over rock | Balanced |
| S5 Meridian | Thin soil over rock by Dunmore | Fills first, small fuel bunker |
| S6 Kestrel | Sand past Oswin | Extra stores, sandy tunnels |

Tunnels mix reliable deep-rock routes (to Iron Ridge, Cedar Flats, Meridian) with fragile shallow sand ones (to Hollow Creek, Kestrel, Blackwater).

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
