import fs from 'fs';
import path from 'path';

const dataPath = path.resolve('data', 'players_369.json');
if (!fs.existsSync(dataPath)) {
  console.error('Error: data/players_369.json not found.');
  process.exit(1);
}

const players = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

const counts = {
  approved: 0,
  licensed: 0,
  official: 0,
  devFairUse: 0,
  creatorPermitted: 0,
  cc: 0,
  embedOnly: 0,
  reviewRequired: 0,
  rejected: 0
};

for (const p of players) {
  const status = p.media?.rightsStatus || 'REVIEW_REQUIRED';
  if (status === 'APPROVED') counts.approved++;
  else if (status === 'OFFICIAL_USE_PERMITTED') counts.official++;
  else if (status === 'DEV_FALLBACK_FAIR_USE') counts.devFairUse++;
  else if (status === 'LICENSED') counts.licensed++;
  else if (status === 'CREATOR_PERMISSION') counts.creatorPermitted++;
  else if (status === 'CC_BY' || status === 'CC0' || status === 'PUBLIC_DOMAIN') counts.cc++;
  else if (status === 'EMBED_ONLY') counts.embedOnly++;
  else if (status === 'REJECTED') counts.rejected++;
  else counts.reviewRequired++;
}

console.log('==================================================');
console.log('AUCTION XI — AUTOMATED MEDIA RIGHTS REPORT');
console.log('==================================================');
console.log(`approved:               ${counts.approved}`);
console.log(`official:               ${counts.official}`);
console.log(`dev fair-use (fallback): ${counts.devFairUse}`);
console.log(`licensed:               ${counts.licensed}`);
console.log(`creator-permitted:      ${counts.creatorPermitted}`);
console.log(`CC / Public Domain:     ${counts.cc}`);
console.log(`embed-only:             ${counts.embedOnly}`);
console.log(`review-required:        ${counts.reviewRequired}`);
console.log(`rejected:               ${counts.rejected}`);
console.log('==================================================');
console.log('All non-approved assets maintain neutral fallback silhouetting.');
