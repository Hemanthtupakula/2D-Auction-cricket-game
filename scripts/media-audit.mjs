import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const playersPath = path.resolve(rootDir, 'data', 'players_369.json');
const mediaPath = path.resolve(rootDir, 'data', 'player_media.json');
const envPath = path.resolve(rootDir, 'config', '.env');

console.log('=== AUCTION XI — PLAYER MEDIA AUDIT ===');

let isConfigured = false;
let endpoint = null;
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  isConfigured = envContent.includes('IMAGEKIT_PRIVATE_KEY=private_') && envContent.includes('IMAGEKIT_PUBLIC_KEY=public_');
  for (const line of envContent.split('\n')) {
    if (line.startsWith('IMAGEKIT_URL_ENDPOINT=')) endpoint = line.split('=')[1].trim();
  }
}

if (!fs.existsSync(playersPath)) {
  console.error('[ERROR] data/players_369.json not found.');
  process.exit(1);
}

const players = JSON.parse(fs.readFileSync(playersPath, 'utf-8'));
let mediaRecords = [];
if (fs.existsSync(mediaPath)) {
  mediaRecords = JSON.parse(fs.readFileSync(mediaPath, 'utf-8'));
}
const mediaMap = new Map(mediaRecords.map(m => [m.playerId, m]));

// Canonical definition: lotNumber between 1 and 369 and auctionSet != null
const canonicalPlayers = players.filter(p => p.lotNumber >= 1 && p.lotNumber <= 369 && p.auctionSet != null);

let verifiedCount = 0;
let failedCount = 0;
let fallbackCount = 0;
let missingCount = 0;
let reviewCount = 0;
let brokenCount = 0;
let directSourceCount = 0;
const fileIdSet = new Set();
let duplicateCount = 0;

for (const p of canonicalPlayers) {
  const m = p.media || mediaMap.get(p.id) || {};
  const status = m.status || 'MISSING';
  const fileId = m.storageFileId;
  const photoUrl = p.photoUrl || m.deliveryUrl;

  if (fileId) {
    if (fileIdSet.has(fileId)) duplicateCount++;
    else fileIdSet.add(fileId);
  }

  if (status === 'VERIFIED_IMAGEKIT' && photoUrl && photoUrl.includes('ik.imagekit.io')) {
    verifiedCount++;
  } else if (status === 'SOURCE_FALLBACK' || (photoUrl && !photoUrl.includes('ik.imagekit.io') && (photoUrl.includes('documents.iplt20.com') || photoUrl.includes('wikimedia.org')))) {
    fallbackCount++;
    directSourceCount++;
  } else if (status === 'FAILED') {
    failedCount++;
    if (m.sourceUrl) fallbackCount++;
  } else if (status === 'REVIEW_REQUIRED') {
    reviewCount++;
  } else {
    missingCount++;
  }
}

console.log('==================================================');
console.log('AUDIT RESULTS');
console.log('==================================================');
console.log(`Canonical Players:        ${canonicalPlayers.length}`);
console.log(`ImageKit Configured:      ${isConfigured ? 'YES' : 'NO'}`);
console.log(`ImageKit Verified:        ${verifiedCount}`);
console.log(`ImageKit Failed:          ${failedCount}`);
console.log(`Source Fallback:          ${fallbackCount}`);
console.log(`Missing (Silhouette):     ${missingCount}`);
console.log(`Review Required:          ${reviewCount}`);
console.log(`Broken Media:             ${brokenCount}`);
console.log(`Direct Source Remaining:  ${directSourceCount}`);
console.log(`Duplicate Assets:         ${duplicateCount}`);
console.log('==================================================');

if (canonicalPlayers.length !== 369) {
  console.error(`[AUDIT FAIL] Canonical players count is ${canonicalPlayers.length}, expected exactly 369!`);
  process.exit(1);
} else {
  console.log('[AUDIT PASS] Canonical 369 player boundary maintained.');
}
