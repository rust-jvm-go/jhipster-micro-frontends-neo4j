#!/usr/bin/env node
/**
 * Post-generation script: apply Docker service name prefixing.
 *
 * Run after `jhipster jdl reactive-mf.jdl --monorepository --workspaces` to
 * replace default Docker Compose service names with a custom prefix.
 *
 * Usage:
 *   node scripts/customize-docker-names.js --prefix=jhi-mf-
 *   node scripts/customize-docker-names.js --prefix=jhi-mf- --dry-run
 */

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION — edit these values for your project
// ═══════════════════════════════════════════════════════════════════════════════
const APPS = [
  { baseName: 'gateway', dbSuffix: 'postgresql' },
  { baseName: 'blog',    dbSuffix: 'neo4j' },
  { baseName: 'store',   dbSuffix: 'mongodb' },
];

const SHARED_SERVICES = ['consul', 'keycloak'];

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════
const ROOT = process.cwd();

// All service names that will be prefixed in docker-compose.yml
function getServiceNames() {
  const names = [];
  for (const app of APPS) {
    names.push(app.baseName);              // e.g. gateway
    names.push(`${app.baseName}-${app.dbSuffix}`); // e.g. gateway-postgresql
  }
  for (const svc of SHARED_SERVICES) {
    names.push(svc);                       // e.g. consul, keycloak
  }
  // Sort longest first so "gateway-postgresql" is replaced before "gateway"
  return names.sort((a, b) => b.length - a.length);
}

const ALL_SERVICES = getServiceNames();

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

function prefixed(name, prefix) {
  return `${prefix}${name}`;
}

function log(msg) {
  console.log(`  ${msg}`);
}

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. docker-compose/docker-compose.yml
// ═══════════════════════════════════════════════════════════════════════════════

function updateDockerCompose(dryRun, prefix) {
  const filePath = path.join(ROOT, 'docker-compose', 'docker-compose.yml');
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Skipping (not found): ${filePath}`);
    return;
  }

  const original = readFile(filePath);
  const lines = original.split('\n');
  let modified = false;

  const newLines = lines.map((line) => {
    let newLine = line;

    for (const svc of ALL_SERVICES) {
      const p = prefixed(svc, prefix);

      // 1a. Top-level service definition: "  gateway:"  (2-space indent)
      if (newLine === `  ${svc}:`) {
        newLine = `  ${p}:`;
        modified = true;
        continue;
      }

      // 1b. Image tag: "    image: gateway"  (4-space indent)
      if (newLine === `    image: ${svc}`) {
        newLine = `    image: ${p}`;
        modified = true;
        continue;
      }

      // 1c. depends_on reference: "      gateway-postgresql:"  (6-space indent)
      if (newLine === `      ${svc}:`) {
        newLine = `      ${p}:`;
        modified = true;
        continue;
      }

      // 1d. Bare hostname references in env vars (e.g. SPRING_CLOUD_CONSUL_HOST=consul)
      // Only match _HOST=svc at end of line to avoid false positives like POSTGRES_USER=gateway
      if (newLine.includes('_HOST=') && newLine.endsWith(`=${svc}`)) {
        newLine = newLine.replace(new RegExp(`=${svc}$`), `=${p}`);
        modified = true;
        continue;
      }

      // 1e. URL host references  (://name:)
      const urlRegex = new RegExp(`://${svc}:`, 'g');
      if (urlRegex.test(newLine)) {
        newLine = newLine.replace(urlRegex, `://${p}:`);
        modified = true;
      }
    }

    return newLine;
  });

  if (modified) {
    if (dryRun) {
      log(`[dry-run] Would update ${filePath}`);
    } else {
      writeFile(filePath, newLines.join('\n'));
      log(`✅ Updated ${filePath}`);
    }
  } else {
    log(`⏭  No changes needed: ${filePath}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. {app}/src/main/docker/*.yml  — prefix the top-level "name:" only
// ═══════════════════════════════════════════════════════════════════════════════

function updateAppDockerYmls(dryRun, prefix) {
  for (const app of APPS) {
    const dir = path.join(ROOT, app.baseName, 'src', 'main', 'docker');
    if (!fs.existsSync(dir)) {
      console.log(`⚠️  Skipping (not found): ${dir}`);
      continue;
    }

    const ymlFiles = fs.readdirSync(dir).filter((f) => f.endsWith('.yml'));

    for (const ymlFile of ymlFiles) {
      const filePath = path.join(dir, ymlFile);
      const original = readFile(filePath);
      const lines = original.split('\n');
      let modified = false;

      const newLines = lines.map((line) => {
        // Only replace the top-level "name: appName" line
        if (line === `name: ${app.baseName}`) {
          modified = true;
          return `name: ${prefixed(app.baseName, prefix)}`;
        }
        return line;
      });

      if (modified) {
        if (dryRun) {
          log(`[dry-run] Would update ${filePath}`);
        } else {
          writeFile(filePath, newLines.join('\n'));
          log(`✅ Updated ${filePath}`);
        }
      } else {
        log(`⏭  No changes needed: ${filePath}`);
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. {app}/buildSrc/.../jhipster.docker-conventions.gradle — Jib image name
// ═══════════════════════════════════════════════════════════════════════════════

function updateDockerConventionsGradle(dryRun, prefix) {
  for (const app of APPS) {
    const filePath = path.join(
      ROOT,
      app.baseName,
      'buildSrc',
      'src',
      'main',
      'groovy',
      'jhipster.docker-conventions.gradle'
    );
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Skipping (not found): ${filePath}`);
      continue;
    }

    const original = readFile(filePath);
    const lines = original.split('\n');
    let modified = false;

    const newLines = lines.map((line) => {
      // Replace: image = "gateway:latest"
      if (line.trim() === `image = "${app.baseName}:latest"`) {
        modified = true;
        return line.replace(
          `"${app.baseName}:latest"`,
          `"${prefixed(app.baseName, prefix)}:latest"`
        );
      }
      return line;
    });

    if (modified) {
      if (dryRun) {
        log(`[dry-run] Would update ${filePath}`);
      } else {
        writeFile(filePath, newLines.join('\n'));
        log(`✅ Updated ${filePath}`);
      }
    } else {
      log(`⏭  No changes needed: ${filePath}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

function main() {
  const dryRun = process.argv.includes('--dry-run');
  const force = process.argv.includes('--force');

  const prefixArg = process.argv.find((arg) => arg.startsWith('--prefix='));
  if (!prefixArg) {
    console.error('Error: --prefix=<value> is required.');
    console.error('Example: node scripts/customize-docker-names.js --prefix=jhi-mf-');
    console.error('         node scripts/customize-docker-names.js --prefix=jhi-mf- --dry-run');
    process.exit(1);
  }
  const prefix = prefixArg.replace('--prefix=', '');

  console.log('');
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║  Docker Service Name Customization                    ║');
  console.log('╠═══════════════════════════════════════════════════════╣');
  console.log(`║  Prefix: "${prefix}"${' '.repeat(43 - prefix.length)}║`);
  console.log(`║  Dry-run: ${dryRun ? 'YES' : 'NO'}${' '.repeat(44 - (dryRun ? 'YES' : 'NO').length)}║`);
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log('');

  if (!force && !dryRun) {
    console.log('This will modify generated files. Run with --dry-run first to preview.');
    console.log('Or use --force to skip this warning.\n');
    // Not blocking, just warning
  }

  console.log('Step 1/3 — docker-compose/docker-compose.yml');
  updateDockerCompose(dryRun, prefix);

  console.log('');
  console.log('Step 2/3 — {app}/src/main/docker/*.yml');
  updateAppDockerYmls(dryRun, prefix);

  console.log('');
  console.log('Step 3/3 — jhipster.docker-conventions.gradle');
  updateDockerConventionsGradle(dryRun, prefix);

  console.log('');
  console.log(dryRun ? '📋 Dry-run complete. No files were modified.' : '🎉 Done!');
  console.log('');
}

main();
