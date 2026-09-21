import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const envPath = path.resolve(rootDir, 'config', '.env');
const playersPath = path.resolve(rootDir, 'data', 'players_369.json');
const mediaPath = path.resolve(rootDir, 'data', 'player_media.json');
const backendResDir = path.resolve(rootDir, 'backend', 'src', 'main', 'resources', 'data');
const scratchDir = path.resolve(rootDir, 'scratch');
if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

console.log('=== AUCTION XI — IMAGEKIT MASTER MEDIA SYNC ===');

// 1. Load config
let config = {};
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [k, ...v] = trimmed.split('=');
    config[k.trim()] = v.join('=').trim();
  }
}

const PUBLIC_KEY = process.env.IMAGEKIT_PUBLIC_KEY || config.IMAGEKIT_PUBLIC_KEY;
const PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY || config.IMAGEKIT_PRIVATE_KEY;
const URL_ENDPOINT = (process.env.IMAGEKIT_URL_ENDPOINT || config.IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/hemanthhkt').replace(/\/$/, '');
const MAX_STORAGE_BYTES = parseInt(config.IMAGEKIT_MAX_STORAGE_BYTES || '3221225472', 10); // 3 GB
const SAFETY_THRESHOLD = parseFloat(config.IMAGEKIT_SAFETY_THRESHOLD || '0.95');

if (!PRIVATE_KEY || !PUBLIC_KEY) {
  console.error('[ERROR] IMAGEKIT_PRIVATE_KEY or IMAGEKIT_PUBLIC_KEY missing in config/.env');
  process.exit(1);
}

const authHeader = 'Basic ' + Buffer.from(`${PRIVATE_KEY}:`).toString('base64');

// Parse CLI flags
const args = process.argv.slice(2);
let targetPlayer = null;
let limit = null;
let isRetry = false;
let isForce = false;
let isMissingOnly = false;
let isTeamsOnly = false;
let isWithTeams = true;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--player' && args[i + 1]) targetPlayer = args[++i];
  if (args[i] === '--limit' && args[i + 1]) limit = parseInt(args[++i], 10);
  if (args[i] === '--retry') isRetry = true;
  if (args[i] === '--force') isForce = true;
  if (args[i] === '--missing-only') isMissingOnly = true;
  if (args[i] === '--teams-only') isTeamsOnly = true;
  if (args[i] === '--without-teams') isWithTeams = false;
}

console.log(`Endpoint:    ${URL_ENDPOINT}`);
console.log(`Safety Cap:  ${(MAX_STORAGE_BYTES / (1024 * 1024 * 1024)).toFixed(1)} GB (Stop at ${(SAFETY_THRESHOLD * 100).toFixed(0)}%)`);

// Helper: Upload file buffer to ImageKit
async function uploadToImageKit({ fileBuffer, fileName, folder, tags }) {
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const parts = [];

  function addField(name, value) {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`));
  }

  function addFile(name, filename, buffer, contentType) {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`));
    parts.push(buffer);
    parts.push(Buffer.from('\r\n'));
  }

  addFile('file', fileName, fileBuffer, 'image/webp');
  addField('fileName', fileName);
  addField('folder', folder);
  addField('useUniqueFileName', 'false');
  if (tags && tags.length > 0) addField('tags', tags.join(','));
  parts.push(Buffer.from(`--${boundary}--\r\n`));

  const payload = Buffer.concat(parts);

  const res = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': String(payload.length)
    },
    body: payload
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`ImageKit Upload HTTP ${res.status}: ${errorText}`);
  }

  return await res.json();
}

// Helper: Verify URL delivers HTTP 200 image with retry for CDN propagation
async function verifyDelivery(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0 (Auction-XI-MediaSync/1.0)' },
        signal: controller.signal
      });
      clearTimeout(timeout);
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.startsWith('image/')) {
        return true;
      }
    } catch (e) {}
    if (attempt < retries) {
      await new Promise(r => setTimeout(r, 400 * attempt));
    }
  }
  return false;
}

// 2. Team Logos Ingestion
async function syncTeamLogos() {
  console.log('\n--- SYNCING 10 FRANCHISE TEAM LOGOS ---');
  const teams = ['MI', 'CSK', 'RCB', 'KKR', 'RR', 'SRH', 'GT', 'LSG', 'DC', 'PBKS'];
  let teamSuccess = 0;

  for (const team of teams) {
    const logoFileName = `${team}.webp`;
    const deliveryUrl = `${URL_ENDPOINT}/auction-xi/teams/${logoFileName}`;

    if (!isForce) {
      const alreadyDelivered = await verifyDelivery(deliveryUrl);
      if (alreadyDelivered) {
        console.log(`[TEAM LOGO] ${team} -> Already verified on ImageKit: ${deliveryUrl}`);
        teamSuccess++;
        continue;
      }
    }

    try {
      const sourceUrl = `https://scores.iplt20.com/ipl/teamlogos/${team}.png`;
      console.log(`[TEAM LOGO] Downloading ${team} from ${sourceUrl}...`);
      const srcRes = await fetch(sourceUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!srcRes.ok) throw new Error(`HTTP ${srcRes.status}`);
      const rawBuf = Buffer.from(await srcRes.arrayBuffer());

      const rawTmp = path.join(scratchDir, `tmp_team_${team}.png`);
      const webpTmp = path.join(scratchDir, `tmp_team_${team}.webp`);
      fs.writeFileSync(rawTmp, rawBuf);

      execFileSync('python', ['scripts/convert_webp.py', rawTmp, webpTmp, '90']);
      const webpBuf = fs.readFileSync(webpTmp);

      console.log(`[TEAM LOGO] Uploading ${team} to /auction-xi/teams/...`);
      const uploadRes = await uploadToImageKit({
        fileBuffer: webpBuf,
        fileName: logoFileName,
        folder: '/auction-xi/teams/',
        tags: ['auction-xi', 'team-logo', team]
      });

      const ok = await verifyDelivery(uploadRes.url);
      if (ok) {
        console.log(`[TEAM LOGO PASS] ${team}: ${uploadRes.url} (${uploadRes.size} bytes)`);
        teamSuccess++;
      } else {
        console.warn(`[TEAM LOGO WARN] Uploaded but delivery check pending for ${team}`);
      }
    } catch (e) {
      console.error(`[TEAM LOGO FAIL] ${team}: ${e.message}`);
    }
  }
  console.log(`Team Logos Verified: ${teamSuccess}/${teams.length}`);
}

// 3. Player Photos Sync
async function syncPlayers() {
  const players = JSON.parse(fs.readFileSync(playersPath, 'utf-8'));
  console.log(`\n--- LOADED ${players.length} CANONICAL PLAYERS ---`);

  // Build / update media registry lookup
  let mediaRegistry = [];
  if (fs.existsSync(mediaPath)) {
    mediaRegistry = JSON.parse(fs.readFileSync(mediaPath, 'utf-8'));
  }
  const mediaMap = new Map(mediaRegistry.map(m => [m.playerId, m]));

  let verifiedCount = 0;
  let skippedCount = 0;
  let fallbackCount = 0;
  let missingCount = 0;
  let failedCount = 0;
  let processedCount = 0;
  let totalUploadedBytes = 0;

  for (const p of players) {
    const pid = p.id;

    if (targetPlayer && pid !== targetPlayer) continue;
    if (limit && processedCount >= limit) break;

    let media = p.media || mediaMap.get(pid) || {};
    const existingFileId = media.storageFileId;
    const existingDeliveryUrl = media.deliveryUrl || `${URL_ENDPOINT}/auction-xi/players/${pid}.webp`;
    const existingStatus = media.status;

    // Resumable check: if already verified ImageKit and not forced, verify URL and skip
    if (!isForce && existingStatus === 'VERIFIED_IMAGEKIT' && existingFileId) {
      const isLive = await verifyDelivery(existingDeliveryUrl);
      if (isLive) {
        skippedCount++;
        verifiedCount++;
        continue;
      }
    }

    if (isMissingOnly && existingStatus === 'VERIFIED_IMAGEKIT') {
      continue;
    }

    // Determine best available source URL
    let sourceUrl = media.sourceUrl || p.photoUrl;
    let sourceName = media.sourceName || 'Official Cricket Registry';
    let sourcePage = media.sourcePageUrl || 'https://www.iplt20.com/auction';
    let rightsStatus = media.rightsStatus || 'DEV_TEST_SOURCE';

    if (!sourceUrl || sourceUrl.includes('placeholder') || sourceUrl.includes('silhouette')) {
      // Mark MISSING cleanly
      media = {
        id: `media-${pid}`,
        playerId: pid,
        mediaType: 'PORTRAIT',
        storageProvider: 'IMAGEKIT',
        storageFileId: null,
        storagePath: null,
        deliveryUrl: null,
        sourceUrl: null,
        sourcePageUrl: null,
        sourceName: null,
        status: 'MISSING',
        rightsStatus: 'REVIEW_REQUIRED',
        width: null,
        height: null,
        mimeType: null,
        checksum: null,
        isPrimary: true,
        sortOrder: 0,
        retrievedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        errorMessage: 'No verified source image available'
      };
      p.photoUrl = null;
      p.media = media;
      mediaMap.set(pid, media);
      missingCount++;
      continue;
    }

    // Safety Circuit Breaker Check
    if (totalUploadedBytes >= MAX_STORAGE_BYTES * SAFETY_THRESHOLD) {
      console.warn(`[SAFETY HALT] Storage threshold (${SAFETY_THRESHOLD * 100}%) reached. Stopping new uploads.`);
      break;
    }

    console.log(`[SYNC LOT #${p.lotNumber}] ${p.fullName} (${pid}) from ${sourceUrl.slice(0, 60)}...`);
    processedCount++;

    try {
      // Download source
      const srcRes = await fetch(sourceUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      if (!srcRes.ok) throw new Error(`Source fetch HTTP ${srcRes.status}`);
      const rawBuf = Buffer.from(await srcRes.arrayBuffer());

      // Convert to WebP using python helper
      const rawTmp = path.join(scratchDir, `tmp_player_${pid}.raw`);
      const webpTmp = path.join(scratchDir, `tmp_player_${pid}.webp`);
      fs.writeFileSync(rawTmp, rawBuf);

      const pyOutput = execFileSync('python', ['scripts/convert_webp.py', rawTmp, webpTmp, '85'], { encoding: 'utf-8' }).trim();
      if (!pyOutput.startsWith('OK:')) throw new Error(`Conversion failed: ${pyOutput}`);
      const [, widthStr, heightStr] = pyOutput.split(':');
      const width = parseInt(widthStr, 10);
      const height = parseInt(heightStr, 10);

      const webpBuf = fs.readFileSync(webpTmp);
      totalUploadedBytes += webpBuf.length;

      // Upload to ImageKit
      const fileName = `${pid}.webp`;
      const uploadRes = await uploadToImageKit({
        fileBuffer: webpBuf,
        fileName,
        folder: '/auction-xi/players/',
        tags: ['auction-xi', 'player', p.country || 'Unknown', p.role || 'Player', `lot-${p.lotNumber}`]
      });

      const finalDeliveryUrl = uploadRes.url || `${URL_ENDPOINT}/auction-xi/players/${fileName}`;

      // Verify delivery immediately
      const isDelivered = await verifyDelivery(finalDeliveryUrl);
      if (!isDelivered) throw new Error(`Delivery verification failed for ${finalDeliveryUrl}`);

      // Persist real metadata
      media = {
        id: `media-${pid}`,
        playerId: pid,
        mediaType: 'PORTRAIT',
        storageProvider: 'IMAGEKIT',
        storageFileId: uploadRes.fileId,
        storagePath: uploadRes.filePath,
        deliveryUrl: finalDeliveryUrl,
        sourceUrl,
        sourcePageUrl: sourcePage,
        sourceName,
        status: 'VERIFIED_IMAGEKIT',
        rightsStatus,
        width: uploadRes.width || width,
        height: uploadRes.height || height,
        mimeType: 'image/webp',
        checksum: null,
        isPrimary: true,
        sortOrder: 0,
        retrievedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        errorMessage: null
      };

      p.photoUrl = finalDeliveryUrl;
      p.media = media;
      mediaMap.set(pid, media);
      verifiedCount++;
      console.log(`  -> [VERIFIED_IMAGEKIT] ${finalDeliveryUrl} (${uploadRes.size} bytes, ${width}x${height})`);

      // Cleanup tmp files
      try { fs.unlinkSync(rawTmp); fs.unlinkSync(webpTmp); } catch (_) {}
    } catch (err) {
      console.error(`  -> [FAILED] ${p.fullName}: ${err.message}`);
      failedCount++;
      media = {
        id: `media-${pid}`,
        playerId: pid,
        mediaType: 'PORTRAIT',
        storageProvider: 'IMAGEKIT',
        storageFileId: null,
        storagePath: null,
        deliveryUrl: null,
        sourceUrl,
        sourcePageUrl: sourcePage,
        sourceName,
        status: 'FAILED',
        rightsStatus,
        width: null,
        height: null,
        mimeType: null,
        checksum: null,
        isPrimary: true,
        sortOrder: 0,
        retrievedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        errorMessage: err.message
      };
      // Keep sourceUrl as fallback
      p.media = media;
      mediaMap.set(pid, media);
    }
  }

  // Persist canonical files
  const updatedMediaList = Array.from(mediaMap.values());
  fs.writeFileSync(playersPath, JSON.stringify(players, null, 2));
  fs.writeFileSync(mediaPath, JSON.stringify(updatedMediaList, null, 2));

  if (fs.existsSync(backendResDir)) {
    fs.copyFileSync(playersPath, path.join(backendResDir, 'players_369.json'));
    fs.copyFileSync(mediaPath, path.join(backendResDir, 'player_media.json'));
  }

  console.log('\n==================================================');
  console.log('PLAYER MEDIA SYNC SUMMARY:');
  console.log('==================================================');
  console.log(`Canonical Pool:        ${players.length}`);
  console.log(`ImageKit Verified:     ${verifiedCount}`);
  console.log(`Skipped (Resumed):     ${skippedCount}`);
  console.log(`Missing (Silhouette):  ${missingCount}`);
  console.log(`Failed:                ${failedCount}`);
  console.log(`Batch Uploaded Bytes:  ${(totalUploadedBytes / 1024).toFixed(1)} KB`);
  console.log('==================================================');
}

async function main() {
  if (isTeamsOnly) {
    await syncTeamLogos();
  } else if (isWithTeams) {
    await syncTeamLogos();
    await syncPlayers();
  } else {
    await syncPlayers();
  }
}

main().catch(e => {
  console.error('[FATAL]', e);
  process.exit(1);
});
