#!/bin/bash
# start-cinepro.sh - Build and run CinePro Core in development mode

# Resolve project directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CORE_DIR="$PROJECT_ROOT/core"

echo "=== Starting CinePro Core Setup ==="
cd "$CORE_DIR" || exit 1

if [ ! -d "node_modules" ]; then
    echo "node_modules not found. Installing dependencies..."
    npm install
else
    echo "Dependencies already installed."
fi

echo "Starting CinePro Core in development watch mode..."
npm run dev
