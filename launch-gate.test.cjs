"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const script = fs.readFileSync(path.join(__dirname, "script.js"), "utf8");

function render(config) {
  const attributes = {};
  const listeners = {};
  const action = {
    setAttribute(key, value) { attributes[key] = value; },
    addEventListener(key, fn) { listeners[key] = fn; }
  };
  const banner = { hidden: false };
  const stagingNote = { hidden: false };
  const notice = { hidden: true };
  const noticeText = { textContent: "" };
  const noticeClose = { focus() {}, addEventListener() {} };
  const robots = { setAttribute(key, value) { this[key] = value; } };
  const classes = {};
  const elements = {
    "staging-banner": banner,
    "robots-meta": robots,
    "site-notice": notice,
    "notice-text": noticeText,
    "notice-close": noticeClose
  };
  const document = {
    activeElement: null,
    documentElement: { classList: { toggle(key, value) { classes[key] = value; } } },
    getElementById(id) { return elements[id] || null; },
    querySelectorAll(selector) {
      if (selector === ".registration-action") return [action];
      if (selector === ".staging-note") return [stagingNote];
      return [];
    },
    addEventListener() {}
  };
  vm.runInNewContext(script, { window: { HEARTBEATS_SITE: config }, document, URL },
    { filename: "script.js", timeout: 1000 });
  return { attributes, listeners, banner, stagingNote, notice, noticeText, robots, classes };
}

const registrationUrl = "https://example.test/registration";
const cases = [
  ["verification missing", { launchReady: true, registrationUrl }, false],
  ["verification false", { launchReady: true, bookingFlowVerified: false, registrationUrl }, false],
  ["launch not approved", { launchReady: false, bookingFlowVerified: true, registrationUrl }, false],
  ["both approvals true", { launchReady: true, bookingFlowVerified: true, registrationUrl }, true],
  ["string launch approval rejected", { launchReady: "true", bookingFlowVerified: true, registrationUrl }, false],
  ["string booking verification rejected", { launchReady: true, bookingFlowVerified: "true", registrationUrl }, false],
  ["null configuration rejected", null, false],
  ["numeric approval rejected", { launchReady: 1, bookingFlowVerified: 1, registrationUrl }, false]
];

for (const [name, config, expectedReady] of cases) {
  test("enrollment gate: " + name, () => {
    const page = render(config);
    assert.equal(page.classes["launch-ready"], expectedReady);
    assert.equal(page.robots.content, expectedReady ? "index,follow" : "noindex,nofollow");
    assert.equal(page.banner.hidden, expectedReady);
    assert.equal(page.stagingNote.hidden, expectedReady);
    assert.equal(page.attributes.href, expectedReady ? registrationUrl : "#lessons");
    if (expectedReady) {
      assert.equal(page.listeners.click, undefined);
    } else {
      assert.equal(typeof page.listeners.click, "function");
      let prevented = false;
      page.listeners.click({ preventDefault() { prevented = true; } });
      assert.equal(prevented, true);
      assert.equal(page.notice.hidden, false);
      assert.equal(page.noticeText.textContent, "Registration opens after final launch approval.");
    }
  });
}
