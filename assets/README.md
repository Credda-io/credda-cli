# Brand artwork

Three files, all COPIED byte for byte out of `packages/design/brand/` in the
Credda monorepo. Nothing here is drawn, resized, recolored or composited in this
repository.

| File | What it is |
| --- | --- |
| `credda-mark-spectrum.png` | The Seal alone, swept in the six brand colours, transparent, 830x830. **The header, and the only referenced file.** |
| `credda-lockup-black.png` | The lockup in black, transparent, 2121x447. Retired here; still served. |
| `credda-lockup-white.png` | The lockup in white, transparent, 2121x447. Retired here; still served. |

## The identity is no longer achromatic

This file used to say it was, in bold, and the README's `<picture>` served the
white lockup to `prefers-color-scheme: dark` and the black one to everything
else. Since `870d264` in `web`, `components/brand/Seal.tsx` makes `spectrum` the
**default** tone and records that the older rule — the sweep reserved for four
named large marks — is superseded. Every mark on credda.io carries it,
api.credda.io was moved to match on 2026-08-29, and this page was one of three
public front pages still showing a stranger the retired mark.

**What the sweep may say did not widen.** It is legal as a continuous six-stop
field across an identity asset and for no other reason — never a swatch, never
ink, never a verdict. Every outcome still comes from the state families
(ADR 0011), and nothing on this page states one next to the mark.

## One file, and no `<picture>`

The lockups were a pair because each is invisible on the other's ground. The
spectrum mark is not, so the pair collapses to one file and the header needs no
media query at all — which matters in a README, where the renderer is somebody
else's. GitHub honours `prefers-color-scheme`; the npm registry page renders
this same file and may not, and a themed pair whose media query is ignored puts
the wrong ground on the page. A transparent mark has no wrong ground.

Measured here against the two canvases a README actually lands on, sampling
every fully opaque pixel of the master: the weakest stop holds **1.81:1** on
white and **4.53:1** on GitHub's dark `#0d1117`, medians 3.28:1 and 5.77:1. The
yellow does not read on white, which is the same fact that made the design
package drop yellow from the wordmark sweep. That is under the 3:1 a non-text
graphic would owe if it owed one; a brand mark does not, because WCAG 1.4.11
exempts a logo. Recorded rather than discovered later. The pair it replaced
measured 19.13:1 and 19.80:1.

## The mark is the header now, and the wordmark is text

The lockup was the wide horizontal form and a README header is wide, which was
the old argument for it. What ended it is that **a spectrum lockup does not
exist** — `credda-lockup-mesh.png` is the older social-card-only mesh treatment,
not this set — so keeping the lockup form meant drawing one, and drawing one is
image editing that no diff can review. api.credda.io hit the same wall hours
earlier and composed instead: the spectrum tile beside a text wordmark. The
composition here is the mark above the `# @credda/cli` heading, which names the
brand in text a reader can select, resize and have read aloud. The mark's `alt`
is `Credda`.

Below 32px the five notches stop resolving and the ring reads as a plain circle,
which is the one wrong reading; `BrandMark.tsx` substitutes the square icon
there. The header renders at 96px and is nowhere near it.

## The lockups are not deleted

Nothing references them and they stay on disk. An unreferenced published asset
is still somebody's downloaded asset — their `raw.githubusercontent.com` URLs
have been live on this branch — and a 404 breaks their page rather than ours.
The same reasoning is recorded in `credda-backend/src/public/router.ts` for the
ink icons.

## Rules

**Never hand-edit these.** They are generated output of the brand folder. To
change them, change the masters there, regenerate, and copy the result across
again.

**Do not recolour or redraw the mark**, and do not add, remove, respace or
balance a notch. Five down the lower-left rim, the sixth position left clean.
That absence is the meaning.

**Copy the pixels, do not composite them.** Pasting an RGBA image using itself
as a mask blends every partially transparent pixel toward the empty canvas, so
each antialiased edge darkens. The artwork looks identical and is not. Verify a
copy by hashing the file, not by looking at it. All three here hash equal to
their masters:

```
be33c109f9c375959239a07ac8f03bbef3372692531fdb2b647745cbd742ef04  credda-mark-spectrum.png
3633802f84abf8e694230f91d782e6c60f5d99f88d88f5dc5ba7d0db2ce10f56  credda-lockup-black.png
18b61c8c5563e46cd3acac07124d60f93f3898fbba919cc04fd02968470c175f  credda-lockup-white.png
```

## Why they are committed here rather than linked from elsewhere

The README is rendered on GitHub and, for the published package, on the registry
page, where a relative image path does not resolve. So the header uses an
absolute `raw.githubusercontent.com` URL, and the file it points at has to live
in this repository for that URL to exist. They are not shipped to any registry:
`package.json`'s `files` list covers `dist` and the changelog only.
