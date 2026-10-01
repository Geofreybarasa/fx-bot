/*
  Economic Calendar — fetch, filter, render.

  BACKEND CONTRACT
  ----------------
  GET <main data-endpoint>  (default: /api/economic-calendar)
  Returns a JSON array in the ForexFactory "faireconomy" shape, with
  this week + next week already merged:

    [
      {
        "title":    "Core CPI m/m",
        "country":  "USD",                       // currency code
        "date":     "2026-10-02T12:30:00-04:00", // ISO 8601 with offset
        "impact":   "High",                      // High | Medium | Low | Holiday
        "forecast": "0.3%",                      // may be ""
        "previous": "0.2%"                       // may be ""
      }
    ]

  Why a backend proxy: the public FF JSON feeds send no CORS headers and
  are rate-limited, so calling them straight from the browser fails and
  the page would always show "No upcoming events found". Fetch the two
  feeds server-side, cache them for ~5 minutes, merge, and serve them
  from your own origin.

  SECURITY: every value from the feed is inserted with textContent, never
  innerHTML, so a bad feed cannot inject markup.
*/
(function () {
  "use strict";

  var main = document.getElementById("main");
  var card = document.getElementById("ecCard");
  var body = document.getElementById("ecBody");
  var pill = document.getElementById("ecPill");
  var pillText = document.getElementById("ecPillText");
  if (!main || !card || !body) return;

  var ENDPOINT = main.getAttribute("data-endpoint") || "/api/economic-calendar";
  var REFRESH_MS = 5 * 60 * 1000;

  var events = [];
  var filter = "all";

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function setLive(ok) {
    pill.classList.toggle("is-offline", !ok);
    pillText.textContent = ok ? "LIVE" : "OFFLINE";
  }

  function showMessage(text, withRetry) {
    card.classList.remove("has-events");
    card.setAttribute("aria-busy", "false");
    body.replaceChildren(el("p", "ec-empty", text));
    if (withRetry) {
      var b = el("button", "ec-retry", "Try again");
      b.type = "button";
      b.addEventListener("click", load);
      body.appendChild(b);
    }
  }

  function normalise(raw) {
    if (!Array.isArray(raw)) return [];
    var now = Date.now() - 60 * 60 * 1000; // keep events from the last hour
    return raw
      .map(function (e) {
        return {
          title: String(e.title || ""),
          ccy: String(e.country || "").toUpperCase().slice(0, 3),
          time: new Date(e.date),
          impact: String(e.impact || "").toLowerCase(),
          forecast: String(e.forecast || ""),
          previous: String(e.previous || "")
        };
      })
      .filter(function (e) {
        return e.title && !isNaN(e.time) && e.impact !== "holiday" && e.time.getTime() >= now;
      })
      .sort(function (a, b) { return a.time - b.time; });
  }

  function render() {
    var list = events.filter(function (e) { return filter === "all" || e.impact === "high"; });
    if (!list.length) {
      showMessage(filter === "high" ? "No high-impact events found." : "No upcoming events found.");
      return;
    }

    var dayFmt = new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "short" });
    var timeFmt = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
    var frag = document.createDocumentFragment();
    var lastDay = "";
    var ul = null;

    list.forEach(function (e) {
      var day = dayFmt.format(e.time);
      if (day !== lastDay) {
        lastDay = day;
        frag.appendChild(el("h2", "ec-day", day));
        ul = el("ul", "ec-list");
        frag.appendChild(ul);
      }
      var li = el("li", "ec-event");
      li.appendChild(el("span", "ec-event__time", timeFmt.format(e.time)));
      li.appendChild(el("span", "ec-event__ccy", e.ccy));

      var t = el("span", "ec-event__title");
      var dot = el("span", "ec-impact" + (e.impact === "high" ? " ec-impact--high" : e.impact === "medium" ? " ec-impact--medium" : ""));
      dot.setAttribute("role", "img");
      dot.setAttribute("aria-label", (e.impact || "low") + " impact");
      t.appendChild(dot);
      t.appendChild(el("span", null, e.title));
      li.appendChild(t);

      if (e.forecast || e.previous) {
        var nums = el("span", "ec-event__nums");
        [["Forecast", e.forecast], ["Previous", e.previous]].forEach(function (p) {
          if (!p[1]) return;
          var s = el("span", null, p[0] + " ");
          s.appendChild(el("b", null, p[1]));
          nums.appendChild(s);
        });
        li.appendChild(nums);
      }
      ul.appendChild(li);
    });

    card.classList.add("has-events");
    card.setAttribute("aria-busy", "false");
    body.replaceChildren(frag);
  }

  function load() {
    card.setAttribute("aria-busy", "true");
    fetch(ENDPOINT, { headers: { Accept: "application/json" }, credentials: "same-origin" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        events = normalise(data);
        setLive(true);
        render();
      })
      .catch(function () {
        events = [];
        setLive(false);
        showMessage("Couldn't load the calendar. Check your connection and try again.", true);
      });
  }

  document.querySelectorAll(".ec-chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      filter = chip.getAttribute("data-filter");
      document.querySelectorAll(".ec-chip").forEach(function (c) {
        var on = c === chip;
        c.classList.toggle("is-active", on);
        c.setAttribute("aria-pressed", on ? "true" : "false");
      });
      render();
    });
  });

  load();
  setInterval(load, REFRESH_MS);
})();