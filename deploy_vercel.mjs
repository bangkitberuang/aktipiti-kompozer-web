#!/usr/bin/env node
/**
 * Deploy statis Aktipiti Kompozer Web ke Vercel REST API (Linux/macOS/Windows).
 * Penggunaan:
 *   VERCEL_TOKEN=... node deploy_vercel.mjs
 *   node deploy_vercel.mjs --token=...
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveToken() {
  const argToken = process.argv.find((a) => a.startsWith('--token='));
  if (argToken) return argToken.slice('--token='.length).trim();
  if (process.env.VERCEL_TOKEN_FILE && fs.existsSync(process.env.VERCEL_TOKEN_FILE)) {
    return fs.readFileSync(process.env.VERCEL_TOKEN_FILE, 'utf8').trim();
  }
  return (process.env.VERCEL_TOKEN || '').trim();
}

const EXCLUDED_TOP = new Set([
  '.git',
  '.gitignore',
  '.vercel',
  '.vercelignore',
  'graphify-out',
  'node_modules',
  'server.ps1',
  'deploy_vercel.ps1',
  'deploy_vercel.mjs',
  'preview_verified.png'
]);

function collectFiles(dir, baseDir = dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDED_TOP.has(entry.name)) continue;
    if (entry.name.endsWith('.zip')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(full, baseDir));
    } else if (entry.isFile()) {
      const rel = path.relative(baseDir, full).split(path.sep).join('/');
      results.push({ full, rel });
    }
  }
  return results;
}

async function uploadFile(token, relPath, bytes, sha1Hex, teamId) {
  const qs = teamId ? `?teamId=${encodeURIComponent(teamId)}` : '';
  const resp = await fetch(`https://api.vercel.com/v2/now/files${qs}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'x-vercel-digest': sha1Hex,
      'Content-Type': 'application/octet-stream'
    },
    body: bytes
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Upload gagal (${relPath}, HTTP ${resp.status}): ${text}`);
  }
}

async function createDeployment(token, deploymentFiles, teamId) {
  const qs = teamId ? `?teamId=${encodeURIComponent(teamId)}` : '';
  const resp = await fetch(`https://api.vercel.com/v13/deployments${qs}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'aktipiti-kompozer',
      target: 'production',
      files: deploymentFiles,
      projectSettings: { framework: null }
    })
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const msg = data?.error?.message || JSON.stringify(data);
    throw new Error(`Deployment gagal (HTTP ${resp.status}): ${msg}`);
  }
  return data;
}

async function main() {
  const token = resolveToken();
  if (!token) {
    console.error('ERROR: VERCEL_TOKEN tidak ditemukan. Set VERCEL_TOKEN atau kirim --token=...');
    process.exit(1);
  }

  let teamId = process.env.VERCEL_ORG_ID || '';
  const projectJsonPath = path.join(__dirname, '.vercel', 'project.json');
  if (!teamId && fs.existsSync(projectJsonPath)) {
    try {
      const pj = JSON.parse(fs.readFileSync(projectJsonPath, 'utf8'));
      if (pj.orgId && pj.orgId.startsWith('team_')) teamId = pj.orgId;
    } catch (_) {}
  }

  const files = collectFiles(__dirname);
  console.log(`Mempersiapkan ${files.length} file untuk deploy ke Vercel...`);

  const deploymentFiles = [];
  const uploadAll = async (tid) => {
    deploymentFiles.length = 0;
    for (const f of files) {
      const bytes = fs.readFileSync(f.full);
      const sha = crypto.createHash('sha1').update(bytes).digest('hex');
      await uploadFile(token, f.rel, bytes, sha, tid);
      deploymentFiles.push({ file: f.rel, sha, size: bytes.length });
    }
  };

  try {
    await uploadAll('');
    const result = await createDeployment(token, deploymentFiles, '');
    console.log('Deploy berhasil:', `https://${result.url}`);
    if (Array.isArray(result.alias) && result.alias.length > 0) {
      console.log('Alias:', result.alias.map((a) => `https://${a}`).join(', '));
    }
  } catch (err) {
    if (!teamId) throw err;
    console.warn('Mencoba ulang dengan teamId dari .vercel/project.json...');
    await uploadAll(teamId);
    const result = await createDeployment(token, deploymentFiles, teamId);
    console.log('Deploy berhasil:', `https://${result.url}`);
    if (Array.isArray(result.alias) && result.alias.length > 0) {
      console.log('Alias:', result.alias.map((a) => `https://${a}`).join(', '));
    }
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
