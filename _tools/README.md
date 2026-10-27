# The SweetVocab website (branch `website`)

Not published. This folder is a second working copy of the site repo
(`ChrisParty/vocabmaster-site`, which keeps its first name) on its own
branch, so the live site and `publish_release.py` (which works in
`Desktop\vocabmaster-site` on `main`) are untouched. Folders starting with `_`
are never published by GitHub Pages — this one holds the notes and tools.

## Look at it

Double-click `index.html`, or, closer to the real thing:

```
cd %USERPROFILE%\Desktop\vocabmaster-website
python -m http.server 8000
```

then open <http://localhost:8000>. The download buttons read the live
`latest.json`, so until 1.4.0 is published they download **1.3.6** (the
version that still asks for an OpenAI key).

## Going live, in this order (only on Mike's go-ahead)

1. **The domain in Cloudflare** (Mike): Cloudflare → Add a site →
   sweetvocab.com → the free plan → change the name servers at the domain
   seller to the two Cloudflare shows. Wait until Cloudflare says "Active".
2. **The website on sweetvocab.com** — DNS first, then GitHub, never the other
   way round (GitHub forwards the old github.io address to the domain the
   moment it is set, and installed apps read updates there):
   - Cloudflare → DNS: four `A` records for `sweetvocab.com` →
     185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153, and a
     `CNAME` `www` → `chrisparty.github.io`, all **DNS only** (grey cloud).
   - Then GitHub → the site repo → Settings → Pages → Custom domain →
     `sweetvocab.com` → Save; tick **Enforce HTTPS** once it is offered.
   - Check https://sweetvocab.com/latest.json opens before anything else.
3. **The server's address** (api.sweetvocab.com): uncomment the `routes` line
   in the app repo's `server/wrangler.toml`, deploy. The app falls back to the
   workers.dev address by itself until then.
4. **Support e-mail**: Cloudflare → Email → Email Routing →
   support@sweetvocab.com → Mike's own address (free). Then fill it in:
   `privacy.html` and `terms.html` (the amber boxes under Contact), plus
   **who sells it** ("Who we are" in `terms.html`) and **the payment
   provider's name** (`terms.html` → Payment, `privacy.html` → Paying for Pro).
   The terms promise a full refund within 14 days of any payment and Swedish
   law — read them; payment providers check that terms and a refund policy
   are on the site.
5. **Release 1.4.0 and the installer**, then merge this branch (below). The
   page sells the product as it is from 1.4.0: a 7-day trial, Pro, no key.
6. **Payments**: the app's Settings → Your plan → **Get Pro** opens
   `pro.html?account=VM-…`. When the payment provider exists, fill in the
   bottom of `pro.html`: Lemon Squeezy → its two checkout links in `CHECKOUT`,
   each ending `?checkout[custom][account]={account}`; Paddle → `PADDLE` (the
   client-side token and the two price ids). Either way the account number
   travels with the payment and the server's signed webhook
   (`/v1/billing/lemonsqueezy` or `/v1/billing/paddle`, see the app repo's
   NOW.md) turns that account Pro. Until then the page says payments open
   very soon. No app update needed.

Prices live in three places: the pricing cards in `index.html`, `PLANS` in
`assets/js/site.js`, and the JSON-LD block at the top of `index.html`.

## Publish

Merge `website` into `main` of the site repo and push; GitHub Pages serves
`main`. `latest.json` and `releases/` are not touched by the website, and
`publish_release.py` keeps working as before.

```
cd %USERPROFILE%\Desktop\vocabmaster-site
git merge website
git push
```

Then remove the second working copy: `git worktree remove ..\vocabmaster-website`.

## What is where

| | |
|---|---|
| `index.html` | the page: hero with a live flashcard (the cat peeks over it and hops for a good answer), the forgetting curve, a card writing itself, features, screenshots, languages, levels, pricing, privacy, questions, download |
| `privacy.html` | for 1.4.0: the account, the server, what passes through to OpenAI, what is never kept, paying for Pro |
| `terms.html` | terms and refunds (`#refunds`): trial, Pro, payment through the reseller, cancelling, 14-day money back, fair use, the app itself |
| `pro.html` | Get Pro, opened from the app with the account number |
| `404.html` | "four-oh-four, n." — self-contained, works at any depth |
| `assets/css/site.css`, `assets/js/site.js` | all of it, no libraries, no tracking; animations stop for "reduce motion" |
| `assets/css/fonts.css`, `assets/fonts/` | Fraunces and Inter, served from the site itself (no Google request from a visitor) |
| `assets/img/` | icons, favicon and the sharing picture (`og.png`) from the approved art: `python tools/brand_assets.py <art kit> <this folder>` in the app repo |
| `assets/img/shots/` | app screenshots of a made-up learner, 1280 and 2560 px WebP |
| `_tools/app_screenshots.py` | makes the app screenshots again from the app's code: `python _tools/app_screenshots.py ..\VocabMaster-release\vocabmaster` |
| `_tools/site_screenshots.mjs` | screenshots of this website through headless Chrome, for checking a change (`node _tools/site_screenshots.mjs 1440x900 hero= pricing=#pricing`, with a local server running; `SITE_URL` picks the page) |
