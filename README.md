# Feline Brothers 🐱🐯

A two-player co-op side-scrolling platformer, freely adapted from **[The Story of the Amulet](https://www.gutenberg.org/ebooks/search/?query=story+of+the+amulet)** by E. Nesbit (1906, public domain).

**Play:** https://korjavin.github.io/brothersgame/

One `index.html`. No build step, no dependencies, no assets — everything is drawn with canvas paths.

## The story

Two brothers — a cat and a tiger — buy half a red amulet in a London junk shop, along with an
extremely rude sand-fairy called the Psammead. The other half was lost four thousand years ago.
Put the halves together and they grant the heart's desire, so: six times through the arch.

| # | Where | When | The twist |
|---|-------|------|-----------|
| 1 | Fitzroy Street, London | 1906 | learn the ropes on the rooftops |
| 2 | The Nile, Egypt | ~6000 BC | crocodiles, then a climb up the great stair |
| 3 | Babylon | ~600 BC | the Queen's guards, and a wall only one brother can pass |
| 4 | Atlantis | the last morning | **the sea comes in** — a vertical climb against a rising flood |
| 5 | Caesar's camp, Britain | 55 BC | **night** — you see only as far as your torchlight |
| 6 | The bright city | a long way ahead | **low gravity**, and nothing left to fight |

Each era opens with a card: what the place is, and one true thing about it or about Nesbit.

Five of the six eras end with a boss standing in front of the arch — the Rag-and-Bone Man, the
Great Crocodile of the Nile, the Captain of the Queen's Guard, the Last Priest of Atlantis, the
Centurion. Land on his head three to five times; the arch stays shut until he goes down. The
bright city has none, which is rather the point of it.

## Controls

| | Cat | Tiger |
|---|---|---|
| move | `A` `D` | `←` `→` |
| jump | `W` (twice) | `↑` (once, but higher) |
| drop through a plank | `S` | `↓` |

`Q` — the Psammead grants **one wish per level**: for 8 seconds each brother gets the other's
talent (the cat can shoulder through crates, the tiger gets a second jump).

A black bar over each brother's head shows his jumps: **green = he can jump, red = spent**. One slot
for the tiger, two for the cat, three under a wish. Walking off a ledge does not cost anything — the
jump is yours until you use it, and the slot goes red only when you do.

**The tiger is heavy.** Every time he lands from a jump he needs to get his breath back — a random
**1 to 5 seconds** — and cannot jump again until he has. His slot refills green from the left as he
recovers, so you can see when he is ready. The cat is never winded.
`P` pauses — the music stops with it · `R` restarts the level · `Enter` turns a story card.

## Playing on your own

`1` puts the cat on autopilot, `2` the tiger. The autopilot walks a step or two behind his brother
and jumps when he does — nothing clever, just company. **Touch any of that brother's keys and you
have him back for as long as you hold them**, then the bot picks up again; the mode stays on.

That is the whole design: the bot handles the walking, you step in for the moments that need him —
smashing a crate barrier with the tiger, or standing still to be climbed on.

Neither brother gets through an arch without the other. The cat is fast and jumps twice; the
tiger is slow and smashes crates. Either can stand on the other's shoulders — and gets carried.

## Editing levels

Maps are run-specs, not ASCII art, so columns line up by construction:

```js
12: [['X', 22, 23], ['E', 38], ['P', 35], ['D', 73]],   // crates at 22-23, an enemy, a lamp, the arch
13: [['#', 0, 14], ['#', 18, 29]],                      // ground with a pit at 15-17
```

`#` ground · `X` crate (tiger only) · `=` plank (jump up through) · `^` spikes · `*` shard ·
`E` enemy · `B` boss · `P` checkpoint · `C`/`T` spawns · `D` arch.

Open the console to see the collision self-check run on load.

## Reporting a bug

Press **B** in the game. You get a text box and the exact frame you were looking at. "Copy shot &
open GitHub issue" puts the screenshot on your clipboard and opens a
[prefilled issue](https://github.com/korjavin/brothersgame/issues/new?labels=bug) — paste the image
in with Ctrl+V and submit. Level, positions, hearts, shards, flood height, sound state and browser
are filled in for you, so "it broke in Atlantis" arrives reproducible.

No server is involved: a static page can prefill an issue URL but cannot upload an image, hence the
clipboard step. "Save the screenshot" is the fallback when a browser refuses clipboard access.

## Tests

```
node test.js
```

No dependencies — it fakes a canvas and Web Audio, then runs the real game: a bot walks all six
levels to their arch, Atlantis's climb is proved reachable ledge by ledge, the sequencer is checked
for tempo and mute, every boss is stomped down and the arch proved shut until he falls, and
the bug-report link is checked for shape and length. Run it after editing a
level; that is what catches an unjumpable gap.

MIT.
