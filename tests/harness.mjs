import assert from 'node:assert/strict';
let passed = 0, failed = 0;
export async function test(name, fn) {
  try { await fn(); passed++; console.log('  ok  ' + name); } catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + (e && e.stack ? e.stack.split('\n').slice(0, 4).join('\n       ') : e)); }
}
export function done(label) { console.log(`${label}: ${passed} passed, ${failed} failed`); if (failed) process.exit(1); }
export { assert };
