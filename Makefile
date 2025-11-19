# Makefile - Root orchestration for openrouter-examples

.PHONY: help examples typescript install clean

help:
	@echo "OpenRouter Examples - Available commands:"
	@echo ""
	@echo "  make examples         - Run all examples"
	@echo "  make typescript       - Run TypeScript monorepo examples"
	@echo "  make install          - Install TypeScript dependencies"
	@echo "  make clean            - Clean node_modules and lockfiles"
	@echo ""

# Run all examples
examples: typescript

# Run TypeScript monorepo examples
typescript:
	@echo "=== Running TypeScript examples ==="
	@cd typescript && bun examples

# Install TypeScript dependencies
install:
	@echo "=== Installing TypeScript dependencies ==="
	@cd typescript && bun install

# Clean build artifacts
clean:
	@echo "=== Cleaning TypeScript artifacts ==="
	@rm -rf typescript/node_modules
	@rm -rf typescript/*/node_modules
	@rm -rf typescript/bun.lock
	@echo "Clean complete"
