# Brand artwork

Two files, both COPIED byte for byte out of `packages/design/brand/` in the
Credda monorepo. Nothing here is drawn, resized, recolored or composited in this
repository.

| File | What it is |
| --- | --- |
| `credda-lockup-black.png` | The lockup in black, transparent, 2121x447. **Light backgrounds.** |
| `credda-lockup-white.png` | The lockup in white, transparent, 2121x447. **Dark backgrounds only** — invisible on light ones. |

The identity is achromatic: there is no brand hue. The pair is named for the job
— black-on-light, white-on-dark — not for the theme it happens to sit in, which
is why the README's `<picture>` serves the white file to
`prefers-color-scheme: dark` and the black file as the default `<img>`.

The lockup is the wordmark first and the seal after it, with no rule and no
divider between them. That spacing is baked into the PNG; do not re-compose the
lockup from a separate wordmark and mark. It is the form to reach for anywhere
wide and horizontal, which is what a README header is. The mark never appears on
its own here.

These replace `creddaseallockup{light,dark}transparent.png`, the retired orange
`#C2410C` / blue `#5B9BFF` seal lockups, which carried a brand hue the identity
no longer has.

## Rules

**Never hand-edit these.** They are generated output of the brand folder. To
change them, change the masters there, regenerate, and copy the result across
again.

**Copy the pixels, do not composite them.** Pasting an RGBA image using itself
as a mask blends every partially transparent pixel toward the empty canvas, so
each antialiased edge darkens. The artwork looks identical and is not. Verify a
copy by hashing the file, not by looking at it. Both files here hash equal to
their masters.

**Do not put the white lockup on a light background.** It disappears. That is
what `credda-lockup-black.png` is for.

## Why they are committed here rather than linked from elsewhere

The README is rendered on GitHub and, for the published package, on the registry
page, where a relative image path does not resolve. So the tags use absolute
`raw.githubusercontent.com` URLs, and the files they point at have to live in
this repository for that URL to exist. They are not shipped to any registry:
`package.json`'s `files` list covers `dist` and the changelog only.
