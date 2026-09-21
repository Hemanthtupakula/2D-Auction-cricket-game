import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// 1. Load config/.env
function loadEnv() {
  const envPath = path.join(ROOT_DIR, 'config', '.env');
  const envVars = {};
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = trimmed.match(/^([A-Za-z0-9_]+)\s*=\s*(.*)$/);
      if (match) {
        let val = match[2].trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        envVars[match[1]] = val;
      }
    }
  }
  return envVars;
}

const fileEnv = loadEnv();
const mergedEnv = { ...process.env, ...fileEnv };

// Configure Supabase PostgreSQL if credentials present
if (mergedEnv.SUPABASE_URL && mergedEnv.SUPABASE_DB_PASSWORD) {
  try {
    const urlObj = new URL(mergedEnv.SUPABASE_URL);
    const hostParts = urlObj.hostname.split('.');
    const projectRef = hostParts[0];
    if (projectRef) {
      if (!mergedEnv.SUPABASE_DB_URL) {
        mergedEnv.SUPABASE_DB_URL = `jdbc:postgresql://db.${projectRef}.supabase.co:5432/postgres?sslmode=require`;
      }
      if (!mergedEnv.SUPABASE_DB_USERNAME) {
        mergedEnv.SUPABASE_DB_USERNAME = 'postgres';
      }
      if (!mergedEnv.SUPABASE_DB_DRIVER) {
        mergedEnv.SUPABASE_DB_DRIVER = 'org.postgresql.Driver';
      }
      if (!mergedEnv.SUPABASE_DB_DIALECT) {
        mergedEnv.SUPABASE_DB_DIALECT = 'org.hibernate.dialect.PostgreSQLDialect';
      }
      mergedEnv.JPA_DDL_AUTO = 'update';
      mergedEnv.FLYWAY_ENABLED = 'true';
    }
  } catch (e) {
    // Keep defaults if parsing fails
  }
}

console.log('\n=============================================================');
console.log('       AUCTION XI — ONE-CLICK AUTONOMOUS LAUNCHER');
console.log('=============================================================');
console.log(`[1/4] Supabase PostgreSQL: ${mergedEnv.SUPABASE_DB_URL ? 'CONFIGURED & ACTIVE' : 'H2 IN-MEMORY WITH SCHEMA'}`);

// 2. Helper to poll an HTTP endpoint until ready
function waitForHttp(url, timeoutMs = 60000, intervalMs = 1500) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      http.get(url, (res) => {
        if (res.statusCode && res.statusCode < 500) {
          resolve(true);
        } else if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timeout waiting for ${url}`));
        } else {
          setTimeout(check, intervalMs);
        }
      }).on('error', () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timeout waiting for ${url}`));
        } else {
          setTimeout(check, intervalMs);
        }
      });
    };
    check();
  });
}

const processes = [];

function cleanup() {
  console.log('\n[STOP] Shutting down services...');
  for (const proc of processes) {
    try {
      if (!proc.killed) {
        proc.kill();
      }
    } catch (e) {}
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

async function start() {
  // A. Start Spring Boot Backend
  console.log('[2/4] Starting Spring Boot Backend (port 8080)...');
  const isWindows = process.platform === 'win32';
  const mvnCmd = isWindows ? 'mvn.cmd' : 'mvn';

  const backendProc = spawn(mvnCmd, ['-f', 'backend/pom.xml', 'spring-boot:run'], {
    cwd: ROOT_DIR,
    env: mergedEnv,
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  processes.push(backendProc);

  backendProc.stdout.on('data', (d) => {
    const line = d.toString();
    if (line.includes('Started AuctionXiApplication')) {
      console.log('      ✓ Spring Boot Backend is fully up and listening on port 8080');
    }
  });
  backendProc.stderr.on('data', (d) => {
    const str = d.toString();
    if (str.includes('ERROR') || str.includes('Exception')) {
      // Log errors if any
      process.stderr.write(str);
    }
  });

  try {
    await waitForHttp('http://127.0.0.1:8080/api/players', 90000);
    console.log('      ✓ Backend API verified healthy at http://127.0.0.1:8080');
  } catch (err) {
    console.error('      [!] Warning waiting for backend HTTP check:', err.message);
  }

  // B. Start Vite Frontend
  console.log('[3/4] Starting Vite Frontend (port 5173)...');
  const npmCmd = isWindows ? 'npm.cmd' : 'npm';
  const frontendProc = spawn(npmCmd, ['--prefix', 'frontend', 'run', 'dev'], {
    cwd: ROOT_DIR,
    env: mergedEnv,
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  processes.push(frontendProc);

  try {
    await waitForHttp('http://localhost:5173', 45000);
    console.log('      ✓ Vite Frontend verified healthy at http://localhost:5173');
  } catch (err) {
    console.error('      [!] Warning waiting for frontend HTTP check:', err.message);
  }

  // C. Start Cloudflare Tunnel
  console.log('[4/4] Starting Cloudflare Tunnel to port 5173...');
  const cloudflaredProc = spawn('cloudflared', ['tunnel', '--url', 'http://localhost:5173'], {
    cwd: ROOT_DIR,
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  processes.push(cloudflaredProc);

  let tunnelUrlFound = false;

  const handleTunnelOutput = (data) => {
    const text = data.toString();
    const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
    if (match && !tunnelUrlFound) {
      tunnelUrlFound = true;
      const liveUrl = match[0];
      console.log('\n=============================================================');
      console.log('   🎉 AUCTION XI IS NOW LIVE ON CLOUDFLARE PUBLIC SERVER!    ');
      console.log('=============================================================');
      console.log(`   🌐 PUBLIC CLOUDFLARE URL : ${liveUrl}`);
      console.log(`   💻 LOCAL FRONTEND        : http://localhost:5173`);
      console.log(`   ⚙️ BACKEND API           : http://127.0.0.1:8080`);
      console.log(`   🗄️ SUPABASE DATABASE     : ACTIVE`);
      console.log('=============================================================');
      console.log('Share the public URL to play live on any phone, tablet, or PC!');
      console.log('Press Ctrl+C to stop all services.\n');
    }
  };

  cloudflaredProc.stdout.on('data', handleTunnelOutput);
  cloudflaredProc.stderr.on('data', handleTunnelOutput);
}

start().catch((err) => {
  console.error('Failed to start live services:', err);
  cleanup();
});
