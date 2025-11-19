#!/usr/bin/env bun

/**
 * Run all Effect-AI examples in parallel using Effect
 *
 * This script demonstrates Effect patterns for:
 * - Parallel execution with concurrency control
 * - Structured error handling
 * - Resource management (file system, processes)
 * - Type-safe results tracking
 */

// TODO: use @effect/platform instead of node.js APIs

import { Effect, Console, Exit } from "effect";
import * as fs from "node:fs";
import * as path from "node:path";
import { spawn } from "node:child_process";

// ============================================================================
// Types
// ============================================================================

interface ExampleResult {
  readonly example: string;
  readonly exitCode: number;
  readonly duration: number;
  readonly success: boolean;
  readonly startTime: Date;
  readonly endTime: Date;
}

// ============================================================================
// Error Types
// ============================================================================

class ExampleNotFoundError {
  readonly _tag = "ExampleNotFoundError";
  constructor(readonly example: string) {}
}

class ExampleExecutionError {
  readonly _tag = "ExampleExecutionError";
  constructor(
    readonly example: string,
    readonly exitCode: number,
    readonly message: string
  ) {}
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Recursively find all .ts files in a directory
 */
const findExamples = (dir: string): Effect.Effect<readonly string[]> =>
  Effect.gen(function* () {
    const entries = yield* Effect.sync(() => fs.readdirSync(dir));
    const files: string[] = [];

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = yield* Effect.sync(() => fs.statSync(fullPath));

      if (stat.isDirectory()) {
        const subFiles = yield* findExamples(fullPath);
        files.push(...subFiles);
      } else if (entry.endsWith('.ts')) {
        files.push(fullPath);
      }
    }

    return files.sort();
  });

/**
 * Check if example file exists
 */
const checkExampleExists = (example: string) =>
  Effect.gen(function* () {
    const exists = yield* Effect.sync(() => fs.existsSync(example));

    if (!exists) {
      return yield* Effect.fail(new ExampleNotFoundError(example));
    }

    return example;
  });

/**
 * Run a single example and capture output
 */
const runExample = (example: string, baseDir: string) =>
  Effect.gen(function* () {
    const startTime = new Date();
    const relativePath = example.replace(baseDir + '/', '');

    // Run the example using bun
    const exitCode = yield* Effect.async<number, ExampleExecutionError>(
      (resume) => {
        const proc = spawn("bun", ["run", example], {
          stdio: ["ignore", "inherit", "inherit"],
          env: process.env,
        });

        proc.on("close", (code) => {
          resume(Effect.succeed(code ?? 0));
        });

        proc.on("error", (err) => {
          resume(
            Effect.fail(
              new ExampleExecutionError(
                example,
                -1,
                `Failed to spawn process: ${err.message}`
              )
            )
          );
        });
      }
    );

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    const result: ExampleResult = {
      example: relativePath,
      exitCode,
      duration,
      success: exitCode === 0,
      startTime,
      endTime,
    };

    return result;
  });

/**
 * Format duration in human-readable format
 */
const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const milliseconds = ms % 1000;

  if (seconds > 0) {
    return `${seconds}.${Math.floor(milliseconds / 100)}s`;
  }
  return `${milliseconds}ms`;
};

// ============================================================================
// Main Program
// ============================================================================

const program = Effect.gen(function* () {
  const baseDir = import.meta.dir;
  const srcDir = path.join(baseDir, 'src');

  // Print header
  yield* Console.log("=".repeat(80));
  yield* Console.log("Effect-AI Examples Runner");
  yield* Console.log("=".repeat(80));
  yield* Console.log("");

  // Find all examples
  yield* Console.log("🔍 Searching for examples...");
  const examples = yield* findExamples(srcDir);
  yield* Console.log(`✓ Found ${examples.length} example(s)`);
  yield* Console.log("");

  // Check all examples exist
  yield* Effect.all(
    examples.map((example) => checkExampleExists(example)),
    { concurrency: "unbounded" }
  );

  // Launch all examples
  yield* Console.log(`🚀 Launching ${examples.length} examples in parallel...`);
  yield* Console.log("");

  // Print all examples being launched
  for (const example of examples) {
    const relativePath = example.replace(baseDir + '/', '');
    yield* Console.log(`⏳ Launching: ${relativePath}`);
  }

  yield* Console.log("");
  yield* Console.log(`📊 All ${examples.length} examples launched!`);
  yield* Console.log("   Waiting for completion...");
  yield* Console.log("");

  // Create tasks to run
  const exampleTasks = examples.map((example) => runExample(example, baseDir));

  // Run all examples in parallel and collect results
  const results = yield* Effect.all(
    exampleTasks.map((task) => Effect.exit(task)),
    { concurrency: "unbounded" }
  );

  // Process results
  const successfulResults: ExampleResult[] = [];
  const failedResults: Array<{ example: string; error: unknown }> = [];

  for (let index = 0; index < results.length; index++) {
    const exit = results[index];
    const example = examples[index];

    if (!exit || !example) continue;

    if (Exit.isSuccess(exit)) {
      const result = exit.value;
      successfulResults.push(result);

      yield* Console.log(
        `✅ Success: ${result.example} (${formatDuration(result.duration)})`
      );
    } else if (Exit.isFailure(exit)) {
      const cause = exit.cause;
      const relativePath = example.replace(baseDir + '/', '');
      failedResults.push({ example: relativePath, error: cause });

      yield* Console.log(`❌ Failed: ${relativePath}`);
    }
  }

  // Print summary
  yield* Console.log("");
  yield* Console.log("=".repeat(80));
  yield* Console.log("Summary");
  yield* Console.log("=".repeat(80));
  yield* Console.log(`Total examples: ${examples.length}`);
  yield* Console.log(`✅ Successful: ${successfulResults.length}`);
  yield* Console.log(`❌ Failed: ${failedResults.length}`);
  yield* Console.log("");

  // Show successful examples with details
  if (successfulResults.length > 0) {
    yield* Console.log("✅ Successful examples:");
    for (const result of successfulResults) {
      yield* Console.log(
        `   ${result.example} - ${formatDuration(result.duration)}`
      );
    }
    yield* Console.log("");
  }

  // Show failed examples with details
  if (failedResults.length > 0) {
    yield* Console.log("❌ Failed examples:");
    for (const failure of failedResults) {
      yield* Console.log(`   ${failure.example}`);

      // Try to extract error message
      const errorMsg = failure.error instanceof Error
        ? failure.error.message
        : String(failure.error);

      if (errorMsg) {
        yield* Console.log(`      Error: ${errorMsg}`);
      }
    }
    yield* Console.log("");
  }

  // Final status
  yield* Console.log("=".repeat(80));
  if (failedResults.length > 0) {
    yield* Console.log(`Results: ${successfulResults.length}/${examples.length} passed`);
    yield* Console.log("=".repeat(80));

    return { success: false, results: successfulResults, failures: failedResults };
  } else {
    yield* Console.log("All examples completed successfully! ✓");
    yield* Console.log("=".repeat(80));

    return { success: true, results: successfulResults, failures: [] };
  }
});

// ============================================================================
// Error Handling
// ============================================================================

const handleError = (error: unknown) => {
  if (error instanceof ExampleNotFoundError) {
    console.error(`\n❌ Example not found: ${error.example}\n`);
    process.exit(1);
  }

  console.error("\n❌ Unexpected error:", error);
  process.exit(1);
};

// ============================================================================
// Main Execution
// ============================================================================

const main = async () => {
  const exit = await Effect.runPromiseExit(program);

  if (Exit.isSuccess(exit)) {
    const { success } = exit.value;
    process.exit(success ? 0 : 1);
  } else {
    const cause = exit.cause;

    // Extract the first failure from the cause
    const failure = cause._tag === "Fail" ? cause.error : cause;

    handleError(failure);
  }
};

// Run the program
main().catch((error) => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});
