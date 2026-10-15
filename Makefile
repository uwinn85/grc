.PHONY: help dev build preview clean test lint migrate-info

# Default target
help:
	@echo "Available commands:"
	@echo "  make dev          - Run Vite development server with Bun"
	@echo "  make build        - Typecheck and build for production"
	@echo "  make preview      - Preview production build"
	@echo "  make lint         - Run linter (oxlint)"
	@echo "  make clean        - Remove dist and node_modules/.tmp"
	@echo "  make migrate-info - Show instructions for Supabase migration"

dev:
	bun dev

build:
	bun run build

preview:
	bun run preview

lint:
	bunx oxlint

clean:
	rm -rf dist node_modules/.tmp

migrate-info:
	@echo "Open your Supabase SQL Editor: https://supabase.com/dashboard/project/mhdvguqxdfuberlpbxjz/sql"
	@echo "And execute the contents of supabase_schema.sql"
