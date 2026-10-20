#!/usr/bin/env node
'use strict';

// Read-only, fail-closed preflight. It does not change the site or its configuration.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

function assess(source) {
  const launch = [...source.matchAll(/^\s*launchReady\s*:\s*(true|false)\s*,?\s*$/gm)];
  const approval = [...source.matchAll(/^\s*releaseApproved\s*:\s*(true|false)\s*,?\s*$/gm)];
  if (launch.length !== 1) return { safe: false, reason: 'Expected exactly one literal launchReady setting.' };
  if (approval.length > 1) return { safe: false, reason: 'Duplicate releaseApproved settings.' };
  if (launch[0][1] !== 'false') return { safe: false, reason: 'launchReady is not false; enrollment may be enabled.' };
  if (approval.length === 1 && approval[0][1] === 'true') return { safe: false, reason: 'releaseApproved is true; approval must remain withheld.' };
  return { safe: true, reason: 'Source configuration explicitly holds enrollment.' };
}

function selfTest() {
  const cases = [
    ['launchReady: false,', true],
    ['launchReady: false,\nreleaseApproved: false,', true],
    ['launchReady: true,', false],
    ['launchReady: false,\nreleaseApproved: true,', false],
    ['otherSetting: true,', false],
    ['launchReady: false,\nlaunchReady: true,', false],
    ['launchReady: false,\nreleaseApproved: false,\nreleaseApproved: true,', false],
    ['launchReady: "false",', false]
  ];
  for (const [source, expected] of cases) assert.equal(assess(source).safe, expected, source);
  console.log(`PASS: ${cases.length} enrollment-hold preflight cases`);
}

if (require.main === module) {
  if (process.argv[2] === '--self-test') {
    selfTest();
  } else {
    const filename = path.resolve(process.argv[2] || path.join(__dirname, '..', 'site-config.js'));
    let result;
    try {
      result = assess(fs.readFileSync(filename, 'utf8'));
    } catch (error) {
      result = { safe: false, reason: `Cannot read config: ${error.code || error.message}` };
    }
    console.log(`${result.safe ? 'PASS' : 'BLOCK'}: ${result.reason}`);
    if (!result.safe) process.exitCode = 1;
  }
}

module.exports = { assess };
