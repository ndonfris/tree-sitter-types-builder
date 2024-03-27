#!/usr/bin/env bash

pnpm add --save-dev @esdmr/tree-sitter-fish
pnpm install
pnpm build

echo "./bin/tree-sitter parse -w node_modules/@esdmr/tree-sitter-fish/tree-sitter-fish.wasm -l Fish"
j
./bin/tree-sitter parse -w node_modules/@esdmr/tree-sitter-fish/tree-sitter-fish.wasm -l Fish
