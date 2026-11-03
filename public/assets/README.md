# Member UI assets

Drop generated PNGs here (see member UI plan):

- `branding/tvpays logo.png` — **source of truth** for the brand lockup (edit this, then run `python scripts/build-brand-assets.py`)
- `branding/tvpays-brand.png` — canonical full logo (login + member header)
- `branding/tvpays-mark-brand.png` — square TV mark (compact header / HQ)
- `wallet/deposit.png`, `spending.png`, `withdrawal.png`
- `plans/{slug}.png` — subscription hero badges (9 paid tiers)
- `stats/play.png`, `coins.png`, `chart.png`, `moneybag.png`
- `income/*.png` — wallet history row icons
- `ui/ambient-glow.png` — optional PhoneFrame overlay

Plan hero PNGs live in `plans/` (AI-generated from client mockups). Optional Blender script: `scripts/blender_render_plan_badges.py` (not used for production assets).
