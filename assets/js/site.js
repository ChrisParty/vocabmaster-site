/* SweetVocab — the website. Plain JavaScript, no libraries, no tracking.
   Everything that moves is decoration: with prefers-reduced-motion it stands
   still, and without JavaScript the page still reads top to bottom. */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SITE = "https://sweetvocab.com/";

  /* ================================================================ which computer */

  function platform() {
    const ua = navigator.userAgent || "";
    const p = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || "";
    if (/android|iphone|ipad|ipod/i.test(ua) || (/mac/i.test(p) && navigator.maxTouchPoints > 1)) return "mobile";
    if (/win/i.test(p) || /windows/i.test(ua)) return "windows";
    if (/mac/i.test(p) || /mac os/i.test(ua)) return "mac";
    if (/linux|x11/i.test(p + ua)) return "linux";
    return "windows";
  }
  const OS = platform();

  /* ================================================================ downloads */

  // latest.json is what the app itself reads to find updates: one source of
  // truth for the version and the files. "setup" (the Windows installer)
  // appears once the installer is published; until then Windows gets the zip.
  const download = { version: "", windows: "", mac: "", windowsKind: "zip" };

  async function loadLatest() {
    for (const url of ["latest.json", SITE + "latest.json"]) {
      try {
        const response = await fetch(url, { cache: "no-cache" });
        if (!response.ok) continue;
        const data = await response.json();
        if (data && data.url) return data;
      } catch (err) { /* offline, or opened from disk: try the next */ }
    }
    return null;
  }

  const STEPS = {
    setup: [
      "<b>Open SweetVocab-Setup</b> from your downloads.",
      "If Windows says <b>“Windows protected your PC”</b>, choose <b>More info → Run anyway</b>.<small>SweetVocab is new, so Windows doesn't know it yet.</small>",
      "<b>SweetVocab opens.</b> Pick the language you want to learn — your 7 free days start now.",
    ],
    zip: [
      "<b>Unzip it:</b> right-click the downloaded file → <b>Extract All</b>.",
      "In the new folder, double-click <b>setup-windows</b>.<small>If Windows says “Windows protected your PC”: More info → Run anyway. It sets up everything it needs in about a minute.</small>",
      "<b>SweetVocab opens</b> and puts an icon on your Desktop. Pick the language you want to learn — your 7 free days start now.",
    ],
    mac: [
      "<b>Double-click the download</b> to unpack it.",
      "Right-click <b>setup-mac.command</b> → <b>Open</b> (only the first time).<small>It needs Python 3.11 or newer, free from python.org — the setup tells you if it's missing.</small>",
      "<b>SweetVocab appears on your Desktop.</b> Open it and pick your language — your 7 free days start now.",
    ],
  };

  const dialog = $("[data-install]");

  function showSteps(os) {
    const steps = os === "mac" ? STEPS.mac : STEPS[download.windowsKind];
    $("[data-steps]").innerHTML = steps.map((s) => `<li>${s}</li>`).join("");
    $$("[data-os-tab]").forEach((tab) => tab.setAttribute("aria-selected", String(tab.dataset.osTab === os)));
    const url = download[os];
    const file = url ? decodeURIComponent(url.split("/").pop()) : "";
    $("[data-install-file]").textContent = file ? `${file}${download.version ? " · version " + download.version : ""}` : "";
    $("[data-retry]").dataset.os = os;
  }

  function startDownload(os) {
    if (OS === "mobile") {
      document.getElementById("download").scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
      return;
    }
    const url = download[os];
    showSteps(os);
    $("[data-install-title]").textContent = url ? "Your download has started" : "Almost there";
    if (dialog && typeof dialog.showModal === "function" && !dialog.open) dialog.showModal();
    if (url) {
      const link = document.createElement("a");
      link.href = url;
      link.download = "";
      document.body.append(link);
      link.click();
      link.remove();
    } else {
      window.open(SITE + "#download", "_blank", "noopener");
    }
  }

  function setupDownloads() {
    const primary = OS === "mac" ? "mac" : "windows";
    const other = primary === "mac" ? "windows" : "mac";
    const label = $("[data-os-label]");
    const otherLabel = $("[data-other-label]");
    if (OS === "mobile") {
      label.textContent = "Get it for your computer";
      $("[data-os-icon] use").setAttribute("href", "#i-download");
      $("[data-download-other]").hidden = true;
      $("[data-mobile-note]").hidden = false;
      $(".download-grid").hidden = true;
    } else {
      label.textContent = primary === "mac" ? "Download for Mac" : "Download for Windows";
      $("[data-os-icon] use").setAttribute("href", primary === "mac" ? "#i-apple" : "#i-windows");
      otherLabel.textContent = other === "mac" ? "Also for Mac" : "Also for Windows";
      $("[data-other-icon] use").setAttribute("href", other === "mac" ? "#i-apple" : "#i-windows");
      const mine = $(`[data-dl="${primary}"]`);
      if (mine) mine.classList.add("yours");
    }
    document.addEventListener("click", (event) => {
      const a = event.target.closest("[data-download], [data-download-other], [data-dl], [data-retry]");
      if (!a || OS === "mobile") return;
      event.preventDefault();
      const os = a.matches("[data-dl]") ? a.dataset.dl
        : a.matches("[data-retry]") ? a.dataset.os || primary
        : a.matches("[data-download-other]") ? other : primary;
      startDownload(os);
    });
    $$("[data-os-tab]").forEach((tab) => tab.addEventListener("click", () => showSteps(tab.dataset.osTab)));
    if (dialog) dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });

    const share = $("[data-share]");
    if (share) share.addEventListener("click", async () => {
      const url = location.href.split("#")[0];
      try {
        if (navigator.share) await navigator.share({ title: "SweetVocab", url });
        else { await navigator.clipboard.writeText(url); share.textContent = "Link copied ✓"; }
      } catch (err) { /* the person closed the share sheet */ }
    });

    loadLatest().then((latest) => {
      if (!latest) {
        $$("[data-version]").forEach((el) => { el.textContent = "Windows & Mac"; });
        return;
      }
      // A "preview" is offered here before installed copies get it: they read
      // only the top level (publish_release.py --preview).
      const data = latest.preview && latest.preview.url ? latest.preview : latest;
      download.version = data.version || "";
      download.mac = data.url;
      download.windows = (data.setup && data.setup.url) || data.url;
      download.windowsKind = data.setup && data.setup.url ? "setup" : "zip";
      $$("[data-version]").forEach((el) => { el.textContent = `Version ${download.version}`; });
    });
  }

  /* ================================================================ navigation, progress */

  function setupNav() {
    const nav = $("[data-nav]");
    const toggle = $("[data-nav-toggle]");
    const bar = $(".scroll-progress");
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - innerHeight;
        bar.style.setProperty("--p", max > 0 ? (scrollY / max).toFixed(4) : 0);
        nav.classList.toggle("scrolled", scrollY > 12);
        ticking = false;
      });
    };
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    toggle.addEventListener("click", () => {
      const open = !nav.classList.contains("open");
      nav.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close the menu" : "Open the menu");
    });
    $$("[data-nav-links] a").forEach((a) => a.addEventListener("click", () => {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }));
    // the link of the section in view
    const links = new Map($$("[data-nav-links] a").map((a) => [a.getAttribute("href").slice(1), a]));
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const link = links.get(entry.target.id);
        if (link && entry.isIntersecting) {
          links.forEach((l) => l.classList.remove("active"));
          link.classList.add("active");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    links.forEach((_, id) => { const section = document.getElementById(id); if (section) spy.observe(section); });
  }

  /* ================================================================ things appear as you scroll */

  const onShow = new Map();          // element -> callback, run once it is in view

  function setupReveal() {
    // a gentle stagger among siblings
    const groups = new Map();
    $$(".reveal").forEach((el) => {
      const list = groups.get(el.parentElement) || [];
      list.push(el);
      groups.set(el.parentElement, list);
    });
    groups.forEach((list) => list.forEach((el, i) => el.style.setProperty("--d", `${Math.min(i, 6) * 0.08}s`)));
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in");
        observer.unobserve(entry.target);
        const callback = onShow.get(entry.target);
        if (callback) callback();
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -6% 0px" });
    $$(".reveal").forEach((el) => observer.observe(el));
  }

  // true while an element is (partly) on screen — loops pause when it is not
  function watchVisible(el) {
    const state = { visible: false };
    new IntersectionObserver(([entry]) => { state.visible = entry.isIntersecting; }, { threshold: 0.05 }).observe(el);
    return state;
  }
  async function whenVisible(state) { while (!state.visible) await sleep(400); }

  /* ================================================================ letters drifting in the background */

  function setupGlyphs() {
    if (reduce) return;
    const canvas = $(".glyphs");
    const ctx = canvas.getContext("2d");
    const SET = "ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅎ가나다한글말물あいうえおかきくけこさしすアイウカキクαβγδλμπσφωΩΣΔΨåäöéñçüßæ";
    const font = '"Malgun Gothic", "Apple SD Gothic Neo", "Yu Gothic", "Hiragino Sans", "Inter", serif';
    let width = 0, height = 0, dpr = 1, glyphs = [];
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const resize = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      width = innerWidth; height = innerHeight;
      canvas.width = width * dpr; canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(46, Math.max(16, (width * height) / 36000)));
      glyphs = Array.from({ length: count }, () => spawn(true));
    };
    const spawn = (anywhere) => {
      const depth = Math.random();
      return {
        ch: SET[Math.floor(Math.random() * SET.length)],
        x: Math.random() * width,
        y: anywhere ? Math.random() * height : height + 40,
        size: 14 + depth * 34,
        depth,
        speed: 0.08 + depth * 0.22,
        sway: Math.random() * Math.PI * 2,
        rot: (Math.random() - 0.5) * 0.5,
        alpha: 0.03 + depth * 0.06,
        hue: Math.random() < 0.7 ? "96,165,250" : Math.random() < 0.5 ? "167,139,250" : "240,246,252",
      };
    };
    let last = 0;
    const frame = (time) => {
      requestAnimationFrame(frame);
      if (document.hidden || time - last < 33) return;          // ~30 frames a second is plenty
      last = time;
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;
      ctx.clearRect(0, 0, width, height);
      canvas.style.opacity = String(1 - Math.min(scrollY / height, 1) * 0.55);
      const scrollShift = scrollY * 0.05;
      for (let i = 0; i < glyphs.length; i++) {
        const g = glyphs[i];
        g.y -= g.speed;
        g.sway += 0.006;
        if (g.y < -60) glyphs[i] = spawn(false);
        const x = g.x + Math.sin(g.sway) * 18 + mouse.x * g.depth * 26;
        const y = ((g.y - scrollShift * g.depth) % (height + 120) + height + 120) % (height + 120) - 60 + mouse.y * g.depth * 18;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(g.rot + Math.sin(g.sway) * 0.08);
        ctx.font = `600 ${g.size}px ${font}`;
        ctx.fillStyle = `rgba(${g.hue},${g.alpha})`;
        ctx.fillText(g.ch, 0, 0);
        ctx.restore();
      }
    };
    addEventListener("resize", resize);
    addEventListener("pointermove", (e) => {
      mouse.tx = e.clientX / innerWidth - 0.5;
      mouse.ty = e.clientY / innerHeight - 0.5;
    }, { passive: true });
    resize();
    requestAnimationFrame(frame);
  }

  /* ================================================================ "words" in other languages */

  function setupMorph() {
    const box = $("[data-morph]");
    if (!box) return;
    const word = $(".morph-word", box);
    const reading = $(".morph-reading", box);
    const WORDS = [
      ["words", ""],
      ["단어", "Korean · daneo"],
      ["単語", "Japanese · tango"],
      ["λέξεις", "Greek · léxeis"],
      ["ord", "Swedish · ord"],
    ];
    const measure = document.createElement("span");
    measure.className = "morph-word";
    measure.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap;left:-9999px";
    box.append(measure);
    const widthOf = (text) => { measure.textContent = text; return measure.getBoundingClientRect().width; };
    let i = 0;
    const fit = () => { box.style.width = `${widthOf(WORDS[i][0])}px`; };
    if (document.fonts) document.fonts.ready.then(fit); else fit();
    addEventListener("resize", fit);
    if (reduce) return;
    setInterval(async () => {
      if (document.hidden) return;
      i = (i + 1) % WORDS.length;
      word.classList.remove("in");
      word.classList.add("out");
      reading.style.opacity = "0";
      await sleep(420);
      word.textContent = WORDS[i][0];
      reading.textContent = WORDS[i][1] || " ";
      fit();
      word.classList.remove("out");
      void word.offsetWidth;
      word.classList.add("in");
      reading.style.opacity = "1";
    }, 2800);
  }

  /* ================================================================ confetti */

  function confetti(x, y, count = 140) {
    if (reduce) return;
    const canvas = document.createElement("canvas");
    canvas.className = "confetti";
    document.body.append(canvas);
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    const colors = ["#60a5fa", "#22c55e", "#f59e0b", "#a78bfa", "#f472b6", "#ef4444", "#facc15"];
    const parts = Array.from({ length: count }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 9;
      return {
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 6,
        w: 5 + Math.random() * 6, h: 8 + Math.random() * 8, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
        c: colors[Math.floor(Math.random() * colors.length)], round: Math.random() < 0.3,
      };
    });
    const start = performance.now();
    const tick = (now) => {
      const t = now - start;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      parts.forEach((p) => {
        p.vy += 0.28; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - t / 2600);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.c;
        if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2); ctx.fill(); }
        else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r)));
        ctx.restore();
      });
      if (t < 2700) requestAnimationFrame(tick); else canvas.remove();
    };
    requestAnimationFrame(tick);
  }

  /* ================================================================ the flashcard demo */

  // Real cards: the Korean and Japanese ones are from the app's own sample
  // decks (written by its card writer); the others in the same shape.
  const CARDS = [
    { flag: "ko", lang: "Korean", word: "친구", reading: "chingu", type: "noun",
      meaning: "A person you know well and like spending time with.",
      translation: "friend, companion", trFlag: "en",
      example: "친구가 오늘 우리 집에 와요.", exReading: "", exTr: "My friend is coming to our house today.",
      trick: "親 (close) + 舊 (old): picture an old, close companion." },
    { flag: "ja", lang: "Japanese", word: "みず", reading: "水 · mizu", type: "noun",
      meaning: "The clear liquid that people drink and use for washing, cooking, and cleaning.",
      translation: "water", trFlag: "en",
      example: "私は水を毎朝飲みます。", exReading: "watashi wa mizu o maiasa nomimasu", exTr: "I drink water every morning.",
      trick: "A glass tips over, and a clear blue splash runs across a sunlit table." },
    { flag: "el", lang: "Greek", word: "θάλασσα", reading: "thálassa", type: "noun",
      meaning: "The large body of salt water that covers most of the Earth.",
      translation: "sea", trFlag: "en",
      example: "Το καλοκαίρι πάμε στη θάλασσα.", exReading: "", exTr: "In summer we go to the sea.",
      trick: "Sounds like “the lasso”: a cowboy throws his lasso far out into the sea." },
    { flag: "sv", lang: "Swedish", word: "fika", reading: "", type: "noun",
      meaning: "A break with coffee or tea and something sweet, usually with other people.",
      translation: "coffee break", trFlag: "en",
      example: "Ska vi ta en fika?", exReading: "", exTr: "Shall we have a fika?",
      trick: "Old slang turned around: kaf-fi (coffee) → fi-ka." },
    { flag: "en", lang: "English", word: "serendipity", reading: "/ˌser.ənˈdɪp.ə.ti/", type: "noun",
      meaning: "Finding something good by chance, without looking for it.",
      translation: "ευτυχής σύμπτωση", trFlag: "el",
      example: "Meeting her on that train was pure serendipity.", exReading: "", exTr: "",
      trick: "Serendip, an old name for Sri Lanka: three princes from there kept finding lucky things they weren't looking for." },
  ];
  const WHEN = ["later in this round", "in 3 days", "in 1 week", "in 2 weeks"];

  function setupDemo() {
    const stage = $("[data-demo]");
    if (!stage) return;
    const card = $("[data-card]", stage);
    const inner = $(".flashcard-inner", card);
    const rateRow = $("[data-rate]");
    const toast = $("[data-toast]", stage);
    const done = $("[data-done]", stage);
    const cat = $("[data-cat]", stage);
    const hop = () => {
      if (!cat || reduce) return;
      cat.classList.remove("hop");
      void cat.offsetWidth;
      cat.classList.add("hop");
    };
    if (cat) {
      cat.addEventListener("click", hop);
      cat.addEventListener("animationend", (e) => { if (e.animationName === "cat-hop") cat.classList.remove("hop"); });
    }
    const field = (name) => $(`[data-f="${name}"]`, card);
    let queue = [], current = null, flipped = false, busy = false, againOnce = new Set(), shown = 0, total = 0;
    const visible = watchVisible(stage);

    const render = (c) => {
      const flagSvg = `<svg viewBox="0 0 30 20"><use href="#flag-${c.flag}"/></svg>`;
      field("lang").innerHTML = `${flagSvg}${c.lang}`;
      field("count").textContent = `${shown} / ${total}`;
      field("word").textContent = c.word;
      field("word").style.fontSize = c.word.length > 8 ? "clamp(40px, 6vw, 56px)" : "";
      field("reading").textContent = c.reading;
      field("word2").textContent = c.word;
      field("reading2").textContent = c.reading;
      field("type").textContent = c.type;
      field("meaning").textContent = c.meaning;
      field("trflag").setAttribute("href", `#flag-${c.trFlag}`);
      field("translation").textContent = c.translation;
      field("example").textContent = c.example;
      field("exReading").textContent = c.exReading;
      field("exTr").textContent = c.exTr;
      field("trick").textContent = c.trick;
      card.setAttribute("aria-label", `Flashcard: ${c.lang} word ${c.word}. Press to show the answer.`);
    };

    const setFlipped = (value, animate = true) => {
      flipped = value;
      if (!animate) inner.style.transition = "none";
      card.classList.toggle("flipped", value);
      if (!animate) { void inner.offsetWidth; inner.style.transition = ""; }
      rateRow.classList.toggle("waiting", !value);
      card.setAttribute("aria-label", value ? `Answer: ${current.meaning} Rate how well you knew it.` : `Flashcard: ${current.lang} word ${current.word}. Press to show the answer.`);
    };

    const next = () => {
      current = queue.shift();
      if (!current) { finish(); return; }
      shown += 1;
      render(current);
      setFlipped(false, false);
      card.classList.remove("leave-0", "leave-1", "leave-2", "leave-3");
      card.classList.remove("entering");
      void card.offsetWidth;
      card.classList.add("entering");
    };

    const say = (html) => {
      toast.innerHTML = html;
      toast.classList.add("show");
      clearTimeout(say.timer);
      say.timer = setTimeout(() => toast.classList.remove("show"), 1900);
    };

    const rate = async (r) => {
      if (busy || !current) return;
      if (!flipped) { setFlipped(true); return; }
      busy = true;
      say(`<b>${current.word}</b> comes back ${WHEN[r]}${r === 3 ? " ✨" : ""}`);
      if (r >= 2) hop();
      if (r === 0 && !againOnce.has(current.word)) { againOnce.add(current.word); queue.push(current); total += 1; }
      card.classList.add(`leave-${r}`);
      await sleep(reduce ? 50 : 560);
      busy = false;
      next();
    };

    const finish = () => {
      card.hidden = true;
      rateRow.classList.add("waiting");
      $$(".demo-shadow", stage).forEach((s) => { s.style.opacity = "0"; });
      done.hidden = false;
      hop();
      const box = stage.getBoundingClientRect();
      confetti(box.left + box.width / 2, box.top + box.height * 0.32);
    };

    const restart = () => {
      queue = CARDS.slice();
      shown = 0;
      total = CARDS.length;
      againOnce = new Set();
      done.hidden = true;
      card.hidden = false;
      $$(".demo-shadow", stage).forEach((s) => { s.style.opacity = ""; });
      next();
    };

    card.addEventListener("click", () => { if (!busy) setFlipped(!flipped); });
    $$("[data-r]", rateRow).forEach((b) => b.addEventListener("click", () => rate(Number(b.dataset.r))));
    $("[data-restart]", stage).addEventListener("click", restart);
    document.addEventListener("keydown", (e) => {
      if (!visible.visible || e.altKey || e.ctrlKey || e.metaKey || (dialog && dialog.open)) return;
      if (/^(input|textarea|select)$/i.test(document.activeElement.tagName)) return;
      if ((e.key === " " || e.key === "Enter") && (document.activeElement === document.body || document.activeElement === card)) {
        e.preventDefault();
        if (!card.hidden && !busy) setFlipped(!flipped);
      } else if (/^[1-4]$/.test(e.key) && !card.hidden) {
        rate(Number(e.key) - 1);
      }
    });

    // tilt and gloss under the pointer
    if (!reduce && matchMedia("(hover: hover)").matches) {
      stage.addEventListener("pointermove", (e) => {
        const box = stage.getBoundingClientRect();
        const x = (e.clientX - box.left) / box.width, y = (e.clientY - box.top) / box.height;
        card.style.setProperty("--rx", `${(0.5 - y) * 10}deg`);
        card.style.setProperty("--ry", `${(x - 0.5) * (flipped ? -14 : 14)}deg`);
        card.style.setProperty("--gx", `${(flipped ? 1 - x : x) * 100}%`);
        card.style.setProperty("--gy", `${y * 100}%`);
      });
      stage.addEventListener("pointerleave", () => {
        card.style.setProperty("--rx", "0deg");
        card.style.setProperty("--ry", "0deg");
      });
    }
    restart();
  }

  /* ================================================================ the forgetting curve */

  function setupCurve() {
    const fig = $("[data-curve]");
    if (!fig) return;
    const X = (t) => 60 + Math.sqrt(t / 30) * 720;
    const Y = (r) => 320 - r * 280;
    const forget = [];
    const between = (a, b, n = 90) => Array.from({ length: n + 1 }, (_, i) => {
      const u = Math.sqrt(a) + (Math.sqrt(b) - Math.sqrt(a)) * (i / n);
      return u * u;
    });
    between(0, 30, 160).forEach((t) => forget.push(`${X(t).toFixed(1)},${Y(Math.exp(-t / 1.6)).toFixed(1)}`));
    $("[data-forget]", fig).setAttribute("d", `M${forget.join("L")}`);

    const reviews = [1, 4, 11, 25];
    const strength = [1.6, 3.8, 9, 22, 60];
    const labels = ["tomorrow", "in 3 days", "in 1 week", "in 2 weeks"];
    const points = [];
    let start = 0;
    for (let k = 0; k <= reviews.length; k++) {
      const end = k < reviews.length ? reviews[k] : 30;
      between(start, end).forEach((t) => points.push([X(t), Y(Math.exp(-(t - start) / strength[k]))]));
      if (k < reviews.length) points.push([X(end), Y(1)]);
      start = end;
    }
    const d = `M${points.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("L")}`;
    const memory = $("[data-memory]", fig);
    memory.setAttribute("d", d);
    $("[data-area]", fig).setAttribute("d", `${d}L${X(30)},320L${X(0)},320Z`);
    const marks = $("[data-marks]", fig);
    marks.innerHTML = reviews.map((t, i) => `<g class="mark"><circle cx="${X(t)}" cy="${Y(1)}" r="6"/>`
      + `<text x="${X(t)}" y="${Y(1) - 14}" text-anchor="middle">${labels[i]}</text></g>`).join("");

    const draw = (path, ms, delay) => {
      const length = path.getTotalLength();
      path.style.strokeDasharray = path.classList.contains("c-forget") ? "7 7" : `${length}`;
      if (path.classList.contains("c-forget")) {
        path.style.clipPath = "inset(0 100% 0 0)";
        path.style.transition = `clip-path ${ms}ms ${delay}ms cubic-bezier(.4,0,.2,1)`;
        requestAnimationFrame(() => requestAnimationFrame(() => { path.style.clipPath = "inset(0 0 0 0)"; }));
      } else {
        path.style.strokeDashoffset = `${length}`;
        path.style.transition = `stroke-dashoffset ${ms}ms ${delay}ms cubic-bezier(.45,0,.25,1)`;
        requestAnimationFrame(() => requestAnimationFrame(() => { path.style.strokeDashoffset = "0"; }));
      }
    };
    const play = () => {
      if (reduce) { $$(".mark", marks).forEach((m) => m.classList.add("on")); return; }
      draw($("[data-forget]", fig), 1300, 200);
      draw(memory, 3200, 700);
      $$(".mark", marks).forEach((m, i) => setTimeout(() => m.classList.add("on"), 700 + 3200 * Math.sqrt(reviews[i] / 30)));
    };
    if (!reduce) {                                // hidden until it is drawn
      const length = memory.getTotalLength();
      memory.style.strokeDasharray = `${length}`;
      memory.style.strokeDashoffset = `${length}`;
      $("[data-forget]", fig).style.clipPath = "inset(0 100% 0 0)";
    }
    onShow.set(fig, play);
  }

  /* ================================================================ a card writes itself */

  const MADE = [
    { word: "사랑", reading: "sarang", type: "noun", meaning: "A deep feeling of caring for someone.",
      translation: "love", example: "사랑해요.", exTr: "I love you.", similar: "애정 (aejeong) · affection",
      trick: "Picture a heart-shaped bell that rang — sa-RANG — each time you think of someone you love." },
    { word: "ねこ", reading: "猫 · neko", type: "noun", meaning: "A small furry animal often kept as a pet.",
      translation: "cat", example: "猫が窓のそばで寝ています。", exTr: "The cat is sleeping by the window.",
      similar: "子猫 (koneko) · kitten", trick: "Ne-ko → “neck-o”: a cat curls around your neck like a warm scarf." },
    { word: "φως", reading: "fos", type: "noun", meaning: "What lets us see; it comes from the sun or a lamp.",
      translation: "light", example: "Άνοιξε το φως, σε παρακαλώ.", exTr: "Turn on the light, please.",
      similar: "φωτεινός (fotinós) · bright", trick: "φως → photo-: a photograph is “writing with light”." },
  ];

  function setupMaker() {
    const box = $("[data-maker]");
    if (!box) return;
    const typed = $("[data-typed]", box);
    const button = $("[data-maker-btn]", box);
    const buttonText = $("[data-maker-btn-text]", box);
    const rows = $$(".mk-row", box);
    const put = (name, value) => { $(`[data-mk="${name}"]`, box).textContent = value; };
    const visible = watchVisible(box);
    const fill = (c) => {
      put("word", c.word); put("reading", c.reading); put("type", c.type); put("meaning", c.meaning);
      put("translation", c.translation); put("example", c.example); put("exTr", c.exTr);
      put("similar", c.similar); put("trick", c.trick);
    };
    if (reduce) { typed.textContent = MADE[0].word; fill(MADE[0]); rows.forEach((r) => r.classList.add("show")); return; }
    onShow.set(box, async () => {
      for (let n = 0; ; n = (n + 1) % MADE.length) {
        await whenVisible(visible);
        const c = MADE[n];
        rows.forEach((r) => r.classList.remove("show"));
        typed.textContent = "";
        await sleep(500);
        for (const ch of c.word) { typed.textContent += ch; await sleep(170); }
        await sleep(350);
        button.classList.add("press", "busy");
        buttonText.textContent = "Writing…";
        await sleep(160);
        button.classList.remove("press");
        await sleep(1100);
        button.classList.remove("busy");
        buttonText.textContent = "Write the card";
        fill(c);
        for (const row of rows) { row.classList.add("show"); await sleep(230); }
        await sleep(5200);
      }
    });
  }

  /* ================================================================ the feature tiles */

  const KANA = [
    { label: "a", strokes: ["M31.01,33c0.88,0.88,2.75,1.82,5.25,1.75c8.62-0.25,20-2.12,29.5-4.25c1.51-0.34,4.62-0.88,6.62-0.5",
      "M49.76,17.62c0.88,1,1.82,3.26,1.38,5.25c-3.75,16.75-6.25,38.13-5.13,53.63c0.41,5.7,1.88,10.88,3.38,13.62",
      "M65.63,44.12c0.75,1.12,1.16,4.39,0.5,6.12c-4.62,12.26-11.24,23.76-25.37,35.76c-6.86,5.83-15.88,3.75-16.25-8.38c-0.34-10.87,13.38-23.12,32.38-26.74c12.42-2.37,27,1.38,30.5,12.75c4.05,13.18-3.76,26.37-20.88,30.49"] },
    { label: "ka", strokes: ["M24.62,38.62c1.88,1.62,4.65,2.33,8.62,1c25.5-8.5,29.5-4.13,29.5,7.62c0,9.38-1.24,17.46-4.25,25.25c-7.62,19.76-10.87,17.39-16.12,10.89",
      "M48.5,17.5c1,1.38,1.29,4.7,0.5,7.12c-5,15.25-18.02,40.93-19.62,43.88c-3.12,5.75-6.38,11.88-9.38,16.25",
      "M77.37,31.62c7.5,6.88,13.25,15.75,15,24.88"] },
    { label: "na", strokes: ["M22.88,28.96c1.18,0.58,3.3,1.1,5.47,1.05c5.53-0.13,10.9-0.98,16.52-2.42c4.82-1.23,9.13-3.12,11.38-4.22",
      "M42.99,14c0.63,0.89,0.56,2.52,0.31,3.72c-2.96,14.16-7.95,26.56-14.25,37.87c-2.05,3.69-4.25,7.24-6.55,10.65",
      "M72.26,23.25c6.88,2.5,12.62,5.62,14.75,9.5c4.06,7.41-0.25,3.38-3.5,3.88",
      "M68.88,44.62c-1,1.88-2.14,5.24-1.88,8.25c0.62,7,1.5,13.12,1.5,20.62c0,20-27.88,19.75-27.88,9.38c0-5.62,8.25-8.25,13.88-8.25c8.75,0,21.5,3.25,29.75,11.5"] },
  ];
  const HANGUL = [["ㅎ", "ㅏ", "ㄴ", "한", "han"], ["ㅁ", "ㅜ", "ㄹ", "물", "mul"], ["ㄱ", "ㅡ", "ㄹ", "글", "geul"]];

  function setupTiles() {
    // the light under the pointer
    $$("[data-spot]").forEach((tile) => tile.addEventListener("pointermove", (e) => {
      const box = tile.getBoundingClientRect();
      tile.style.setProperty("--mx", `${e.clientX - box.left}px`);
      tile.style.setProperty("--my", `${e.clientY - box.top}px`);
    }));

    // Hangul: letters stack into a syllable block
    const hangul = $("[data-hangul]");
    const alphaTile = $(".t-alpha");
    const alphaVisible = watchVisible(alphaTile);
    const hangulLoop = async () => {
      if (reduce) { hangul.classList.add("play"); return; }
      for (let n = 0; ; n = (n + 1) % HANGUL.length) {
        await whenVisible(alphaVisible);
        const [a, b, c, block, read] = HANGUL[n];
        $(".j1", hangul).textContent = a; $(".j2", hangul).textContent = b; $(".j3", hangul).textContent = c;
        $(".block", hangul).textContent = block; $(".block-read", hangul).textContent = read;
        hangul.classList.remove("play"); void hangul.offsetWidth; hangul.classList.add("play");
        await sleep(5200);
      }
    };

    // kana: drawn stroke by stroke, in the right order
    const kanaSvg = $("[data-kana]");
    const kanaLabel = $("[data-kana-label]");
    const drawKana = async (kana) => {
      kanaSvg.innerHTML = kana.strokes.map((d) => `<path d="${d}"/>`).join("");
      kanaLabel.textContent = "";
      const paths = $$("path", kanaSvg);
      paths.forEach((p) => {
        const length = p.getTotalLength();
        p.style.strokeDasharray = `${length}`;
        p.style.strokeDashoffset = reduce ? "0" : `${length}`;
      });
      if (reduce) { kanaLabel.textContent = kana.label; return; }
      for (const p of paths) {
        p.classList.add("drawing");
        p.style.transition = "stroke-dashoffset .75s cubic-bezier(.5,0,.3,1)";
        void p.getBoundingClientRect();
        p.style.strokeDashoffset = "0";
        await sleep(820);
        p.classList.remove("drawing");
      }
      kanaLabel.textContent = kana.label;
    };
    const kanaLoop = async () => {
      for (let n = 0; ; n = (n + 1) % KANA.length) {
        await whenVisible(alphaVisible);
        await drawKana(KANA[n]);
        if (reduce) return;
        await sleep(2200);
      }
    };
    onShow.set(alphaTile, () => { hangulLoop(); kanaLoop(); });

    // a conversation, again and again
    const chat = $("[data-chat]");
    const talkTile = $(".t-talk");
    const talkVisible = watchVisible(talkTile);
    onShow.set(talkTile, async () => {
      chat.classList.add("play");
      if (reduce) return;
      for (;;) {
        await sleep(7000);
        await whenVisible(talkVisible);
        chat.classList.remove("play"); void chat.offsetWidth; chat.classList.add("play");
      }
    });

    // a voice
    const wave = $("[data-wave]");
    if (wave) {
      wave.innerHTML = Array.from({ length: 28 }, (_, i) => {
        const h = 25 + Math.round(70 * Math.abs(Math.sin(i * 0.7) * Math.cos(i * 0.23)) + Math.random() * 10);
        return `<i style="--h:${Math.min(h, 100)}%;--t:${(0.45 + Math.random() * 0.5).toFixed(2)}s;--dl:${(-Math.random()).toFixed(2)}s"></i>`;
      }).join("");
    }

    // quiz: the right answer lights up
    const quiz = $("[data-quiz]");
    const QUIZ = [["θάλασσα", "thálassa", ["mountain", "sea", "bread"], 1],
                  ["友達", "tomodachi", ["friend", "teacher", "river"], 0],
                  ["kaffe", "", ["tea", "milk", "coffee"], 2]];
    const quizTile = $(".t-quiz");
    const quizVisible = watchVisible(quizTile);
    onShow.set(quizTile, async () => {
      for (let n = 0; ; n = (n + 1) % QUIZ.length) {
        const [word, read, options, right] = QUIZ[n];
        $(".q", quiz).innerHTML = `${word}${read ? ` <small>${read}</small>` : ""}`;
        $(".opts", quiz).innerHTML = options.map((o, i) => `<span class="opt${i === right ? " right" : ""}">${o}</span>`).join("");
        quiz.classList.remove("play"); void quiz.offsetWidth; quiz.classList.add("play");
        if (reduce) return;
        await sleep(3800);
        await whenVisible(quizVisible);
      }
    });

    // streak and a calendar that fills in
    const badgeTile = $(".t-badges");
    const heat = $("[data-heat]");
    const levels = "0123332312333302333313233323333".split("").concat(["3", "3", "3", "2"]);
    heat.innerHTML = levels.map(() => "<i></i>").join("");
    onShow.set(badgeTile, () => {
      const count = $("[data-count]", badgeTile);
      const target = Number(count.dataset.count);
      const t0 = performance.now();
      const step = (now) => {
        const k = Math.min(1, (now - t0) / 1400);
        count.textContent = String(Math.round(target * (1 - (1 - k) ** 3)));
        if (k < 1) requestAnimationFrame(step);
      };
      if (reduce) count.textContent = String(target); else requestAnimationFrame(step);
      $$("i", heat).forEach((cell, i) => setTimeout(() => { if (levels[i] !== "0") cell.className = `l${levels[i]}`; }, reduce ? 0 : 40 * i));
    });

    // a sentence, then what it means
    const sentence = $("[data-sentence]");
    const SENTENCES = [["Hur mycket kostar det?", "How much does it cost?"],
                       ["화장실이 어디예요?", "Where is the bathroom?"],
                       ["お会計お願いします。", "The bill, please."],
                       ["Πόσο κάνει αυτό;", "How much is this?"]];
    const sentTile = $(".t-sentences");
    const sentVisible = watchVisible(sentTile);
    onShow.set(sentTile, async () => {
      if (reduce) return;
      for (let n = 0; ; n = (n + 1) % SENTENCES.length) {
        await whenVisible(sentVisible);
        $(".sent-t", sentence).textContent = SENTENCES[n][0];
        $(".sent-m", sentence).textContent = SENTENCES[n][1];
        sentence.classList.remove("flip", "away");
        await sleep(1600);
        sentence.classList.add("flip");
        await sleep(2600);
        sentence.classList.add("away");
        await sleep(650);
      }
    });
  }

  /* ================================================================ the screenshots */

  const SHOTS = {
    "study-back": ["The study screen: the Korean word 친구 (chingu) with its meaning, an example and a memory trick",
      "Every card: the word, how it's read, what it means, a real example and a memory trick."],
    story: ["Today's story: six Korean sentences with the learner's own words highlighted, readings and translations",
      "Today's story is written from your own words — highlighted, read out, translated."],
    talk: ["A conversation at a café in Korean, with a gentle correction and ideas to answer with",
      "Talk at a café: it answers, nudges you toward the natural way to say it, and offers ideas."],
    alphabet: ["The Hangul alphabet: a new letter introduced, and the chart of letters already known",
      "Learn to read first: one new letter at a time, with the ones you know outlined in green."],
    stats: ["Your progress: a 27-day streak, 72 words mastered and a shelf of badges",
      "Your progress in sentences and medals — not spreadsheets."],
    celebration: ["A new badge, 100 words studied, celebrated with confetti",
      "Small wins are celebrated. Missing a day never is punished."],
  };

  function setupScreens() {
    const tabs = $$("[data-tabs] [data-shot]");
    const img = $("[data-shot-img]");
    const caption = $("[data-shot-caption]");
    const bar = $("[data-shot-progress]");
    const win = $("[data-window]");
    if (!img) return;
    const keys = tabs.map((t) => t.dataset.shot);
    let index = 0, timer = null;
    const visible = watchVisible(win);
    const DURATION = 7000;
    const src = (key) => [`assets/img/shots/${key}-1280.webp`, `assets/img/shots/${key}-1280.webp 1280w, assets/img/shots/${key}.webp 2560w`];
    const preload = (key) => { const i = new Image(); i.sizes = img.sizes; [i.src, i.srcset] = src(key); };

    const show = (n, user) => {
      index = (n + keys.length) % keys.length;
      const key = keys[index];
      tabs.forEach((t, i) => t.setAttribute("aria-selected", String(i === index)));
      img.classList.add("fade");
      caption.style.opacity = "0";
      setTimeout(() => {
        const [s, set] = src(key);
        img.srcset = set; img.src = s; img.alt = SHOTS[key][0];
        caption.textContent = SHOTS[key][1];
        caption.style.opacity = "1";
        const done = () => img.classList.remove("fade");
        if (img.complete) done(); else img.addEventListener("load", done, { once: true });
      }, reduce ? 0 : 260);
      preload(keys[(index + 1) % keys.length]);
      schedule(user);
    };
    const schedule = () => {
      clearTimeout(timer);
      bar.classList.remove("run"); void bar.offsetWidth;
      if (reduce) return;
      bar.style.setProperty("--dur", `${DURATION}ms`);
      bar.classList.add("run");
      timer = setTimeout(async () => { await whenVisible(visible); show(index + 1); }, DURATION);
    };
    tabs.forEach((t, i) => t.addEventListener("click", () => show(i, true)));
    $("[data-tabs]").addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        show(index + (e.key === "ArrowRight" ? 1 : -1), true);
        tabs[index].focus();
      }
    });
    onShow.set(win, () => schedule());

    // the window leans back, then straightens as it comes up
    if (!reduce) {
      let ticking = false;
      const lean = () => {
        ticking = false;
        const box = win.getBoundingClientRect();
        const k = Math.min(1, Math.max(0, (innerHeight - box.top) / (innerHeight * 0.75)));
        win.style.setProperty("--tilt", `${(1 - k) * 18}deg`);
        win.style.setProperty("--scale", `${0.92 + 0.08 * k}`);
      };
      addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(lean); } }, { passive: true });
      lean();
    }
  }

  /* ================================================================ levels */

  const LEVELS = [
    [["water", "what we drink"], ["friend", "someone you like and trust"], ["tomorrow", "the day after today"],
     ["kitchen", "where food is made"], ["happy", "feeling good"], ["borrow", "take it for a while"]],
    [["reliable", "you can count on it"], ["improve", "make it better"], ["opinion", "what you think"],
     ["ancient", "very, very old"], ["generous", "glad to give"], ["schedule", "a plan of times"]],
    [["disparity", "a big difference"], ["stringent", "very strict"], ["ostensibly", "on the surface"],
     ["ramification", "a knock-on effect"], ["meticulous", "careful with every detail"], ["candid", "honest and direct"]],
    [["vicissitude", "a change of fortune"], ["specious", "convincing, but false"], ["belie", "give a false idea of"],
     ["equivocate", "stay vague on purpose"], ["provenance", "where it comes from"], ["perfunctory", "done without care"]],
  ];

  function setupLevels() {
    const box = $("[data-levels]");
    const words = $("[data-level-words]");
    if (!box) return;
    const buttons = $$("[data-level]", box);
    const thumb = $(".level-thumb", box);
    const place = (button) => {
      thumb.style.left = `${button.offsetLeft}px`;
      thumb.style.width = `${button.offsetWidth}px`;
      thumb.style.top = `${button.offsetTop}px`;
      thumb.style.height = `${button.offsetHeight}px`;
      thumb.style.bottom = "auto";
    };
    const choose = (n) => {
      buttons.forEach((b, i) => b.setAttribute("aria-selected", String(i === n)));
      place(buttons[n]);
      words.innerHTML = LEVELS[n].map(([w, m], i) => `<span class="lw" style="--d:${i * 0.06}s"><b>${w}</b><small>${m}</small></span>`).join("");
    };
    buttons.forEach((b, i) => b.addEventListener("click", () => choose(i)));
    addEventListener("resize", () => place(buttons.find((b) => b.getAttribute("aria-selected") === "true")));
    if (document.fonts) document.fonts.ready.then(() => choose(0)); else choose(0);
  }

  /* ================================================================ pricing */

  function setupPricing() {
    const box = $("[data-billing]");
    if (!box) return;
    const buttons = $$("[data-bill]", box);
    const thumb = $(".billing-thumb", box);
    const price = $("[data-price]");
    const per = $("[data-per]");
    const note = $("[data-price-note]");
    const PLANS = {
      month: ["99 kr", "a month", "Cancel any time. Your words stay yours."],
      year: ["799 kr", "a year", "About 67 kr a month, paid once a year."],
    };
    const choose = (key, animate = true) => {
      const button = buttons.find((b) => b.dataset.bill === key);
      buttons.forEach((b) => b.setAttribute("aria-checked", String(b === button)));
      thumb.style.left = `${button.offsetLeft}px`;
      thumb.style.width = `${button.offsetWidth}px`;
      const apply = () => {
        [price.textContent, per.textContent, note.textContent] = PLANS[key];
        price.classList.remove("swap");
      };
      if (animate && !reduce) { price.classList.add("swap"); setTimeout(apply, 180); } else apply();
    };
    buttons.forEach((b) => b.addEventListener("click", () => choose(b.dataset.bill)));
    addEventListener("resize", () => choose(buttons.find((b) => b.getAttribute("aria-checked") === "true").dataset.bill, false));
    if (document.fonts) document.fonts.ready.then(() => choose("year", false)); else choose("year", false);
  }

  /* ================================================================ small things */

  function setupMarquee() {
    const track = $("[data-marquee]");
    if (!track) return;
    const copy = track.innerHTML;
    track.insertAdjacentHTML("beforeend", copy.replace(/<span>/g, '<span aria-hidden="true">'));
  }

  function init() {
    $$("[data-year]").forEach((el) => { el.textContent = String(new Date().getFullYear()); });
    setupNav();
    setupMarquee();
    setupDownloads();
    setupGlyphs();
    setupMorph();
    setupDemo();
    setupCurve();
    setupMaker();
    setupTiles();
    setupScreens();
    setupLevels();
    setupPricing();
    setupReveal();                   // last: it runs the callbacks registered above
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
