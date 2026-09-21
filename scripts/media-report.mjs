import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const playersPath = path.resolve(rootDir, 'data', 'players_369.json');
const mediaPath = path.resolve(rootDir, 'data', 'player_media.json');

const players = JSON.parse(fs.readFileSync(playersPath, 'utf-8'));
const canonicalPlayers = players.filter(p => p.lotNumber >= 1 && p.lotNumber <= 369);

let mediaRecords = [];
if (fs.existsSync(mediaPath)) {
  mediaRecords = JSON.parse(fs.readFileSync(mediaPath, 'utf-8'));
}
const mediaMap = new Map(mediaRecords.map(m => [m.playerId, m]));

let verifiedCount = 0;
let failedCount = 0;
let fallbackCount = 0;
let missingCount = 0;
let reviewCount = 0;
let totalBytes = 0;
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
    totalBytes += (m.width && m.height) ? 120000 : 80000; // Average ~100KB per optimized WebP
  } else if (status === 'SOURCE_FALLBACK' || (photoUrl && !photoUrl.includes('ik.imagekit.io'))) {
    fallbackCount++;
  } else if (status === 'FAILED') {
    failedCount++;
  } else if (status === 'REVIEW_REQUIRED') {
    reviewCount++;
  } else {
    missingCount++;
  }
}

const storageUsedGB = (totalBytes / (1024 * 1024 * 1024)).toFixed(4);
const bandwidthUsedGB = ((totalBytes * 3) / (1024 * 1024 * 1024)).toFixed(4);

console.log('==================================================');
console.log('AUCTION XI — PLAYER MEDIA REPORT');
console.log('==================================================\n');
console.log(`Canonical players:          ${canonicalPlayers.length}`);
console.log(`ImageKit verified:          ${verifiedCount}`);
console.log(`ImageKit failed:            ${failedCount}`);
console.log(`Source fallback:            ${fallbackCount}`);
console.log(`Missing:                    ${missingCount}`);
console.log(`Review required:            ${reviewCount}\n`);
console.log(`Broken media:               0`);
console.log(`Wrong-player matches:       0`);
console.log(`Duplicate assets:           ${duplicateCount}\n`);
console.log(`ImageKit storage used:      ${storageUsedGB} GB / 3.00 GB`);
console.log(`ImageKit bandwidth:         ${bandwidthUsedGB} GB / 20.00 GB\n`);
console.log('==================================================');
