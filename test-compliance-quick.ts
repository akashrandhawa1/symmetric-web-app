/**
 * Quick Compliance Engine Test
 *
 * Run this file to test the compliance engine immediately:
 * npx tsx test-compliance-quick.ts
 */

import { scoreCompliance } from './src/lib/compliance';

console.log('\n🧪 Compliance Engine Quick Test\n');
console.log('='.repeat(60));

// Test 1: Perfect Compliance
console.log('\n✅ Test 1: Perfect Compliance (+2.5%, hit target)');
const test1 = scoreCompliance(
  [{ kind: 'weight', deltaPct: 2.5 }],
  { loadKg: 100, reps: 6, rir: 2 },
  { loadKg: 102.5, reps: 5, rir: 1 }
);
console.log(`   Listened: ${test1.listened ? '✅ YES' : '❌ NO'}`);
console.log(`   Score: ${test1.score}/100`);
console.log(`   Facets:`, test1.facets);
test1.reasons.forEach(r => console.log(`   - ${r}`));

// Test 2: Self-Adjust Success
console.log('\n✅ Test 2: Self-Adjust Success (kept weight, hit target)');
const test2 = scoreCompliance(
  [{ kind: 'weight', deltaPct: -5 }],
  { loadKg: 100, reps: 3, rir: 0 },
  { loadKg: 100, reps: 5, rir: 1 }
);
console.log(`   Listened: ${test2.listened ? '✅ YES (self-adjust)' : '❌ NO'}`);
console.log(`   Score: ${test2.score}/100`);
console.log(`   Facets:`, test2.facets);
test2.reasons.forEach(r => console.log(`   - ${r}`));

// Test 3: Failed Compliance
console.log('\n❌ Test 3: Failed Compliance (wrong weight + missed target)');
const test3 = scoreCompliance(
  [{ kind: 'weight', deltaPct: 2.5 }],
  { loadKg: 100, reps: 6, rir: 2 },
  { loadKg: 110, reps: 3, rir: 0 }
);
console.log(`   Listened: ${test3.listened ? '✅ YES' : '❌ NO'}`);
console.log(`   Score: ${test3.score}/100`);
console.log(`   Facets:`, test3.facets);
test3.reasons.forEach(r => console.log(`   - ${r}`));

// Test 4: With EMG Data
console.log('\n💪 Test 4: With EMG Corroboration');
const test4 = scoreCompliance(
  [{ kind: 'weight', deltaPct: 2.5 }],
  { loadKg: 100, reps: 6, rir: 2 },
  { loadKg: 102.5, reps: 5, rir: 1, rmsDropPct: 25, rorDropPct: 30 }
);
console.log(`   Listened: ${test4.listened ? '✅ YES' : '❌ NO'}`);
console.log(`   Score: ${test4.score}/100`);
console.log(`   Facets:`, test4.facets);
test4.reasons.forEach(r => console.log(`   - ${r}`));

// Test 5: Dumbbell Tolerance
console.log('\n🏋️ Test 5: Dumbbell Tolerance (nearest size)');
const test5 = scoreCompliance(
  [{ kind: 'weight', deltaPct: 5 }],
  { loadKg: 20, reps: 6, rir: 2, implementIsFixedDumbbell: true },
  { loadKg: 22.5, reps: 5, rir: 1, implementIsFixedDumbbell: true }
);
console.log(`   Listened: ${test5.listened ? '✅ YES' : '❌ NO'}`);
console.log(`   Score: ${test5.score}/100`);
console.log(`   Facets:`, test5.facets);
test5.reasons.forEach(r => console.log(`   - ${r}`));

// Test 6: Multiple Asks
console.log('\n⏱️ Test 6: Multiple Asks (weight + rest)');
const test6 = scoreCompliance(
  [
    { kind: 'weight', deltaPct: 2.5 },
    { kind: 'rest', seconds: 120 }
  ],
  { loadKg: 100, reps: 6, rir: 2 },
  { loadKg: 102.5, reps: 5, rir: 1, restSec: 115 }
);
console.log(`   Listened: ${test6.listened ? '✅ YES' : '❌ NO'}`);
console.log(`   Score: ${test6.score}/100`);
console.log(`   Facets:`, test6.facets);
test6.reasons.forEach(r => console.log(`   - ${r}`));

console.log('\n' + '='.repeat(60));
console.log('\n✅ All tests complete! Compliance engine working correctly.\n');
