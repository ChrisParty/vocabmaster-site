# The VocabMaster website (branch `website`)

Not published. This folder is a second working copy of the site repo
(`ChrisParty/vocabmaster-site`) on its own branch, so the live site and
`publish_release.py` (which works in `Desktop\vocabmaster-site` on `main`)
are untouched. Folders starting with `_` are never published by GitHub
Pages — this one holds the notes and tools.

## Look at it

Double-click `index.html`, or, closer to the real thing:

```
cd %USERPROFILE%\Desktop\vocabmaster-website
python -m http.server 8000
```

then open <http://localhost:8000>. The download buttons read the live
`latest.json`, so today they download **1.3.6** (the version that still asks
for an OpenAI key).

## Before it goes live

1. **Release 1.4.0 and the installer first.** The page sells the product as
   it will be: a 7-day trial, Pro, no key. Today's download is still the
   friends' version.
2. **Support e-mail** in `privacy.html` (the amber box under Contact).
3. **Payments**: the app's Settings → Your plan → **Get Pro** opens
   `pro.html?account=VM-…`. When the payment provider exists, fill in the
   bottom of `pro.html`: Lemon Squeezy → its two checkout links in `CHECKOUT`,
   each ending `?checkout[custom][account]={account}`; Paddle → `PADDLE` (the
   client-side token and the two price ids). Either way the account number
   travels with the payment and the server's signed webhook
   (`/v1/billing/lemonsqueezy` or `/v1/billing/paddle`, see the app repo's
   NOW.md) turns that account Pro. Until then the page says payments open
   very soon. No app update needed.
4. **Domain**: if the site moves to its own domain, change the four
   `chrisparty.github.io/vocabmaster-site` addresses in `index.html` (canonical,
   og:url, og:image) and `SITE` at the top of `assets/js/site.js`.
5. **Name**: if the brand changes, search for "VocabMaster" in `index.html`,
   `privacy.html`, `404.html`, and replace `favicon.ico` + `assets/img/icon-*`.
6. **Prices** live in three places: the pricing cards in `index.html`,
   `PLANS` in `assets/js/site.js`, and the JSON-LD block at the top of
   `index.html` (for search engines).

## Publish (only on Mike's go-ahead)

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
| `index.html` | the page: hero with a live flashcard, the forgetting curve, a card writing itself, features, screenshots, languages, levels, pricing, privacy, questions, download |
| `privacy.html` | rewritten for 1.4.0: the account, the server, what passes through to OpenAI, what is never kept |
| `404.html` | "four-oh-four, n." — self-contained, works at any depth |
| `assets/css/site.css`, `assets/js/site.js` | all of it, no libraries, no tracking; animations stop for "reduce motion" |
| `assets/css/fonts.css`, `assets/fonts/` | Fraunces and Inter, served from the site itself (no Google request from a visitor) |
| `assets/img/shots/` | app screenshots of a made-up learner, 1280 and 2560 px WebP |
| `assets/img/og.png` | the picture shown when the link is shared |
| `_tools/app_screenshots.py` | makes the app screenshots again from the app's code: `python _tools/app_screenshots.py ..\VocabMaster\vocabmaster` (needs the 1.4.0 code) |
| `_tools/site_screenshots.mjs` | screenshots of this website through headless Chrome, for checking a change (`node _tools/site_screenshots.mjs 1440x900 hero= pricing=#pricing`, with the local server running on port 8765) |
