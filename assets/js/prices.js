/* Prices in the visitor's currency.
   The numbers are what Paddle charges in those countries (country prices on
   the two live prices — set by `tools/paddle_live.py prices` in the app repo;
   the two tables must stay the same). Everyone else sees US dollars, and the
   checkout shows the exact price in their own currency before they pay.
   Without JavaScript the page keeps its Swedish kronor. */
(function () {
  "use strict";
  var PRICES = {
    SEK: { month: "99 kr", year: "799 kr", zero: "0 kr", name: "Swedish kronor" },
    USD: { month: "$9.99", year: "$79.99", zero: "$0", name: "US dollars" },
    EUR: { month: "€8.99", year: "€69.99", zero: "€0", name: "euros" },
    GBP: { month: "£7.99", year: "£59.99", zero: "£0", name: "British pounds" }
  };
  var EURO = "AT BE BG HR CY EE FI FR DE GR IE IT LV LT LU MT NL PT SK SI ES MC SM AD".split(" ");
  var COUNTRY = { SE: "SEK", US: "USD", GB: "GBP" };
  EURO.forEach(function (c) { COUNTRY[c] = "EUR"; });
  // Where the computer's clock says it is, for the countries above.
  var ZONES = {
    "Europe/Stockholm": "SE",
    "Europe/London": "GB", "Europe/Belfast": "GB", "Europe/Jersey": "GB", "Europe/Guernsey": "GB", "Europe/Isle_of_Man": "GB",
    "Europe/Vienna": "AT", "Europe/Brussels": "BE", "Europe/Sofia": "BG", "Europe/Zagreb": "HR",
    "Asia/Nicosia": "CY", "Europe/Nicosia": "CY", "Asia/Famagusta": "CY", "Europe/Tallinn": "EE",
    "Europe/Helsinki": "FI", "Europe/Paris": "FR", "Europe/Berlin": "DE", "Europe/Busingen": "DE",
    "Europe/Athens": "GR", "Europe/Dublin": "IE", "Europe/Rome": "IT", "Europe/Riga": "LV",
    "Europe/Vilnius": "LT", "Europe/Luxembourg": "LU", "Europe/Malta": "MT", "Europe/Amsterdam": "NL",
    "Europe/Lisbon": "PT", "Atlantic/Azores": "PT", "Atlantic/Madeira": "PT", "Europe/Bratislava": "SK",
    "Europe/Ljubljana": "SI", "Europe/Madrid": "ES", "Atlantic/Canary": "ES", "Africa/Ceuta": "ES",
    "Europe/Monaco": "MC", "Europe/San_Marino": "SM", "Europe/Andorra": "AD"
  };
  ("America/New_York America/Detroit America/Kentucky/Louisville America/Kentucky/Monticello " +
   "America/Indiana/Indianapolis America/Indiana/Vincennes America/Indiana/Winamac America/Indiana/Marengo " +
   "America/Indiana/Petersburg America/Indiana/Vevay America/Chicago America/Indiana/Tell_City " +
   "America/Indiana/Knox America/Menominee America/North_Dakota/Center America/North_Dakota/New_Salem " +
   "America/North_Dakota/Beulah America/Denver America/Boise America/Phoenix America/Los_Angeles " +
   "America/Anchorage America/Juneau America/Sitka America/Metlakatla America/Yakutat America/Nome " +
   "America/Adak Pacific/Honolulu").split(" ").forEach(function (z) { ZONES[z] = "US"; });
  // A browser language on its own: the country it points to (not English —
  // "en" says nothing about where someone is).
  var LANGUAGE = { sv: "SE", el: "GR", de: "DE", fr: "FR", it: "IT", es: "ES", pt: "PT", nl: "NL", fi: "FI",
    et: "EE", lv: "LV", lt: "LT", sk: "SK", sl: "SI", hr: "HR", mt: "MT", ga: "IE", bg: "BG" };

  // The browser's languages first: "sv-SE" is Sweden, and a Swede with an
  // English browser still lists "sv". "en-US" is the default everywhere, so it
  // counts only after the clock's time zone — which itself cannot tell Sweden
  // from Germany on Windows (both come back as Europe/Berlin).
  function country() {
    var tags = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || ""];
    var i, m, american = false;
    for (i = 0; i < tags.length; i++) {
      m = /^[a-z]{2,3}(?:-[a-z]{4})?-([a-z]{2})(?:-|$)/i.exec(tags[i] || "");
      if (!m) continue;
      if (m[1].toUpperCase() === "US") american = true; else return m[1].toUpperCase();
    }
    for (i = 0; i < tags.length; i++) {
      var found = LANGUAGE[(tags[i] || "").slice(0, 2).toLowerCase()];
      if (found) return found;
    }
    try {
      var zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      if (ZONES[zone]) return ZONES[zone];
    } catch (e) { /* no Intl */ }
    return american ? "US" : "";
  }

  var code = COUNTRY[country()] || "USD";
  var p = PRICES[code];
  window.SweetPrices = {
    currency: code, month: p.month, year: p.year, zero: p.zero,
    note: "Prices in " + p.name + ". The exact price in your currency is shown before you pay, through our reseller Paddle.com."
  };

  function fill() {
    var set = function (selector, text) {
      var el = document.querySelector(selector);
      if (el) el.textContent = text;
    };
    set("[data-money='month']", p.month);
    set("[data-money='zero']", p.zero);
    set("[data-money-lede]", "Or " + p.year + " a year — a third less. Cancel any time.");
    set("[data-money-note]", window.SweetPrices.note);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fill); else fill();
})();
