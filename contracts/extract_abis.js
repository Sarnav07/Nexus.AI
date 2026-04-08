#!/usr/bin/env node

/**
 * extract_abis.js
 * ───────────────────────────────────────────────────────
 * Extracts ABIs from Foundry's `out/` directory and copies
 * them to the shared locations that agents and frontend use.
 *
 * Run:  node extract_abis.js
 * (after `forge build`)
 */

const fs = require("fs");
const path = require("path");

const CONTRACTS = ["NexusVault", "SignalRegistry", "AgentLeaderboard"];

const FOUNDRY_OUT = path.resolve(__dirname, "out");

const DESTINATIONS = [
  path.resolve(__dirname, "..", "frontend", "lib", "abis"),
  path.resolve(__dirname, "..", "agents", "shared", "abis"),
];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`  📁 Created directory: ${dir}`);
  }
}

function extractAbis() {
  console.log("═══════════════════════════════════════");
  console.log("  NEXUS ABI EXTRACTION");
  console.log("═══════════════════════════════════════\n");

  // Ensure all destination dirs exist
  for (const dest of DESTINATIONS) {
    ensureDir(dest);
  }

  let extracted = 0;

  for (const contractName of CONTRACTS) {
    const artifactPath = path.join(
      FOUNDRY_OUT,
      `${contractName}.sol`,
      `${contractName}.json`
    );

    if (!fs.existsSync(artifactPath)) {
      console.error(
        `  ❌ Artifact not found: ${artifactPath}\n` +
          `     Run 'forge build' first.`
      );
      continue;
    }

    // Read the full Foundry artifact and extract .abi
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
    const abi = artifact.abi;

    if (!abi) {
      console.error(`  ❌ No ABI found in artifact: ${artifactPath}`);
      continue;
    }

    const abiJson = JSON.stringify(abi, null, 2);
    const fileName = `${contractName}.json`;

    // Write to each destination
    for (const dest of DESTINATIONS) {
      const outPath = path.join(dest, fileName);
      fs.writeFileSync(outPath, abiJson);
      console.log(`  ✅ ${contractName} → ${path.relative(process.cwd(), outPath)}`);
    }

    extracted++;
  }

  console.log(
    `\n═══════════════════════════════════════`
  );
  console.log(`  Extracted ${extracted}/${CONTRACTS.length} ABIs`);
  console.log("═══════════════════════════════════════\n");

  if (extracted < CONTRACTS.length) {
    process.exit(1);
  }
}

extractAbis();
