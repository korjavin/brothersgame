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

## Controls

| | Cat | Tiger |
|---|---|---|
| move | `A` `D` | `←` `→` |
| jump | `W` (twice) | `↑` (once, but higher) |
| drop through a plank | `S` | `↓` |

`Q` — the Psammead grants **one wish per level**: for 8 seconds each brother gets the other's
talent (the cat can shoulder through crates, the tiger gets a second jump).
`R` restarts the level · `Enter` turns a story card.

Neither brother gets through an arch without the other. The cat is fast and jumps twice; the
tiger is slow and smashes crates. Either can stand on the other's shoulders — and gets carried.

## Editing levels

Maps are run-specs, not ASCII art, so columns line up by construction:

```js
12: [['X', 22, 23], ['E', 38], ['P', 35], ['D', 73]],   // crates at 22-23, an enemy, a lamp, the arch
13: [['#', 0, 14], ['#', 18, 29]],                      // ground with a pit at 15-17
```

`#` ground · `X` crate (tiger only) · `=` plank (jump up through) · `^` spikes · `*` shard ·
`E` enemy · `P` checkpoint · `C`/`T` spawns · `D` arch.

Open the console to see the collision self-check run on load.

MIT.
