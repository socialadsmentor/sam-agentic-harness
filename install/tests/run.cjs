#!/usr/bin/env node
'use strict';
// Runnable end-to-end test for harness-install. No frameworks: assert + process.exitCode.
// node tests/run.cjs
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const INSTALL_DIR = path.resolve(__dirname, '..');
const NODE = process.execPath;

function run(script, args, opts) {
  return execFileSync(NODE, [path.join(INSTALL_DIR, script), ...args], { encoding: 'utf8', ...opts });
}

function snapshot(dir) {
  const out = {};
  if (!fs.existsSync(dir)) return out;
  const walk = (d) => {
    for (const name of fs.readdirSync(d)) {
      const abs = path.join(d, name);
      const stat = fs.statSync(abs);
      if (stat.isDirectory()) walk(abs);
      else out[path.relative(dir, abs).replace(/\\/g, '/')] = crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
    }
  };
  walk(dir);
  return out;
}

function step(name, fn) {
  process.stdout.write(`- ${name} ... `);
  fn();
  console.log('ok');
}

function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sam-agentic-harness-test-'));
  const tmpOut = fs.mkdtempSync(path.join(os.tmpdir(), 'sam-agentic-harness-out-'));

  // Seed a pre-existing CLAUDE.md and a colliding rule file to exercise backup + restore.
  fs.writeFileSync(path.join(tmp, 'CLAUDE.md'), '# My existing project rules\n\nDo not touch this.\n');
  fs.mkdirSync(path.join(tmp, 'rules'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'rules', 'test.expectations.md'), '# my own pre-existing version\n');

  const before = snapshot(tmp);

  step('fit-analysis runs read-only and exits clean on a fresh dir', () => {
    const out = run('fit-analysis.cjs', ['--config', tmp, '--out', path.join(tmpOut, 'fit-report.json')]);
    assert.ok(/Verdict:/.test(out), 'human report printed a verdict');
    assert.ok(fs.existsSync(path.join(tmpOut, 'fit-report.json')), 'fit-report.json written');
    const after = snapshot(tmp);
    assert.deepStrictEqual(after, before, 'fit-analysis must not touch the config dir');
  });

  step('install --dry-run writes a plan and touches nothing', () => {
    const out = run('install.cjs', ['--dry-run', '--config', tmp, '--out', path.join(tmpOut, 'install-plan.json')]);
    assert.ok(/No files were written into the config directory/.test(out));
    assert.ok(fs.existsSync(path.join(tmpOut, 'install-plan.json')));
    const after = snapshot(tmp);
    assert.deepStrictEqual(after, before, 'dry run must not touch the config dir');
  });

  step('install --apply without stdin confirmation refuses', () => {
    let threw = false;
    try {
      execFileSync(NODE, [path.join(INSTALL_DIR, 'install.cjs'), '--apply', '--config', tmp], { encoding: 'utf8', input: '' });
    } catch (e) {
      threw = true;
      assert.strictEqual(e.status, 1);
    }
    assert.ok(threw, 'apply with no stdin confirmation must fail');
    const after = snapshot(tmp);
    assert.deepStrictEqual(after, before, 'refused apply must not touch the config dir');
  });

  step('install --apply with wrong stdin text refuses and writes nothing', () => {
    let threw = false;
    try {
      execFileSync(NODE, [path.join(INSTALL_DIR, 'install.cjs'), '--apply', '--no-human-confirmed', '--config', tmp], {
        encoding: 'utf8', input: 'nope\n',
      });
    } catch (e) {
      threw = true;
      assert.strictEqual(e.status, 1);
    }
    assert.ok(threw, 'apply with wrong stdin text must fail');
    const after = snapshot(tmp);
    assert.deepStrictEqual(after, before, 'wrong-text apply must not touch the config dir');
  });

  step('install --apply --no-human-confirmed with piped INSTALL writes files + manifest', () => {
    const out = run('install.cjs', ['--apply', '--no-human-confirmed', '--config', tmp], { input: 'INSTALL\n' });
    assert.ok(/Readback PASSED/.test(out), 'install ran its own readback');
    assert.ok(fs.existsSync(path.join(tmp, 'install-manifest.json')), 'manifest written');
    const claudeMd = fs.readFileSync(path.join(tmp, 'CLAUDE.md'), 'utf8');
    assert.ok(claudeMd.includes('Do not touch this.'), 'original CLAUDE.md content preserved');
    assert.ok(claudeMd.includes('SAM-HARNESS:START'), 'SAM Agentic Harness block appended');
    const backupDirs = fs.readdirSync(tmp).filter((n) => n.startsWith('sam-agentic-harness-backup-'));
    assert.strictEqual(backupDirs.length, 1, 'exactly one backup dir created');
    const backedUp = fs.readFileSync(path.join(tmp, backupDirs[0], 'rules', 'test.expectations.md'), 'utf8');
    assert.ok(backedUp.includes('my own pre-existing version'), 'colliding file backed up before overwrite');
  });

  step('.agents/behaviors installs alongside rules/skills/scripts/self-harness', () => {
    assert.ok(
      fs.existsSync(path.join(tmp, '.agents', 'behaviors', 'readback-before-claim', 'BEHAVIOR.md')),
      '.agents/behaviors/readback-before-claim/BEHAVIOR.md present after apply'
    );
  });

  step('readback.cjs standalone PASSes on the applied install', () => {
    const out = run('readback.cjs', ['--config', tmp]);
    assert.ok(/PASS/.test(out));
  });

  step('rollback.cjs refuses a manifest whose backupDir points at a real subdirectory (crafted-manifest guard)', () => {
    const tmp2 = fs.mkdtempSync(path.join(os.tmpdir(), 'sam-agentic-harness-test2-'));
    const tmpOut2 = fs.mkdtempSync(path.join(os.tmpdir(), 'sam-agentic-harness-out2-'));
    run('install.cjs', ['--apply', '--no-human-confirmed', '--config', tmp2], { input: 'INSTALL\n' });
    const manifestPath = path.join(tmp2, 'install-manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert.ok(fs.existsSync(path.join(tmp2, 'skills')), 'skills tree installed');
    const skillsBefore = snapshot(path.join(tmp2, 'skills'));
    manifest.backupDir = path.join(tmp2, 'skills'); // crafted: real subdirectory, not a backup dir
    fs.writeFileSync(manifestPath, JSON.stringify(manifest));
    let threw = false;
    try {
      execFileSync(NODE, [path.join(INSTALL_DIR, 'rollback.cjs'), '--config', tmp2], { encoding: 'utf8' });
    } catch (e) {
      threw = true;
      assert.strictEqual(e.status, 1);
    }
    assert.ok(threw, 'rollback must refuse a crafted backupDir, not guess');
    assert.deepStrictEqual(snapshot(path.join(tmp2, 'skills')), skillsBefore, 'skills tree must survive the refused rollback');
    fs.rmSync(tmp2, { recursive: true, force: true });
    fs.rmSync(tmpOut2, { recursive: true, force: true });
  });

  step('rollback.cjs restores the directory to its pre-install state', () => {
    const out = run('rollback.cjs', ['--config', tmp]);
    assert.ok(/Rollback complete/.test(out));
    assert.ok(
      !fs.existsSync(path.join(tmp, '.agents', 'behaviors', 'readback-before-claim', 'BEHAVIOR.md')),
      '.agents/behaviors/readback-before-claim/BEHAVIOR.md removed after rollback'
    );
    const after = snapshot(tmp);
    assert.deepStrictEqual(after, before, 'config dir must be byte-identical to its pre-install state');
  });

  step('rollback.cjs refuses when no manifest is present', () => {
    let threw = false;
    try {
      execFileSync(NODE, [path.join(INSTALL_DIR, 'rollback.cjs'), '--config', tmp], { encoding: 'utf8' });
    } catch (e) {
      threw = true;
      assert.strictEqual(e.status, 1);
    }
    assert.ok(threw, 'rollback without a manifest must refuse, not guess');
  });

  fs.rmSync(tmp, { recursive: true, force: true });
  fs.rmSync(tmpOut, { recursive: true, force: true });

  step('no em-dashes anywhere in rules/, skills/, scripts/, self-harness/, install/', () => {
    const REPO_ROOT = path.resolve(INSTALL_DIR, '..');
    const dirsToScan = ['rules', 'skills', 'scripts', 'self-harness', 'install'];
    const offenders = [];
    const walk = (d) => {
      for (const name of fs.readdirSync(d)) {
        const abs = path.join(d, name);
        const stat = fs.statSync(abs);
        if (stat.isDirectory()) walk(abs);
        else {
          // self-harness/fixtures/*/bad/copy.txt is a DELIBERATE em-dash fixture (E2 proves
          // the no_em_dash check catches one) -- the one intentional exception.
          if (/[\\/]fixtures[\\/][^\\/]+[\\/]bad[\\/]/.test(path.relative(REPO_ROOT, abs))) continue;
          let text;
          try {
            text = fs.readFileSync(abs, 'utf8');
          } catch (e) {
            continue;
          }
          if (/[\u2014\u2013]/.test(text)) offenders.push(path.relative(REPO_ROOT, abs));
        }
      }
    };
    for (const d of dirsToScan) {
      const abs = path.join(REPO_ROOT, d);
      if (fs.existsSync(abs)) walk(abs);
    }
    assert.deepStrictEqual(offenders, [], `em-dash (U+2014) found in: ${offenders.join(', ')}`);
  });

  console.log('\nAll tests passed.');
}

main();
