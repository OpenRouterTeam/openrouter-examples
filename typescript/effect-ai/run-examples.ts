#!/usr/bin/env bun
/**
 * Run all example files in the src/ directory
 * Each example is run in a separate process to handle process.exit() calls
 */

import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { $ } from 'bun';

const srcDir = join(import.meta.dir, 'src');

// Recursively find all .ts files in src/
function findExamples(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...findExamples(fullPath));
    } else if (entry.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  
  return files.sort();
}

const examples = findExamples(srcDir);
console.log(`Found ${examples.length} example(s)\n`);

let failed = 0;
for (const example of examples) {
  const relativePath = example.replace(import.meta.dir + '/', '');
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Running: ${relativePath}`);
  console.log('='.repeat(80));
  
  try {
    await $`bun run ${example}`.quiet();
    console.log(`✅ ${relativePath} completed successfully`);
  } catch (error) {
    console.error(`❌ ${relativePath} failed`);
    failed++;
  }
}

console.log(`\n${'='.repeat(80)}`);
console.log(`Results: ${examples.length - failed}/${examples.length} passed`);
console.log('='.repeat(80));

if (failed > 0) {
  process.exit(1);
}
