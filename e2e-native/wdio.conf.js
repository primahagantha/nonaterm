import os from 'os';
import path from 'path';
import fs from 'fs';
import { spawn, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = path.resolve(__dirname, '..');
let tauriDriver;
let exit = false;

// Find msedgedriver in common locations
function findEdgeDriver() {
  const candidates = [
    path.join(rootDir, 'msedgedriver.exe'),
    path.join(os.homedir(), '.cargo', 'bin', 'msedgedriver.exe'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return 'msedgedriver';
}

export const config = {
  host: '127.0.0.1',
  port: 4444,
  specs: ['./specs/**/*.js'],
  maxInstances: 1,
  capabilities: [
    {
      maxInstances: 1,
      'tauri:options': {
        application: path.resolve(rootDir, 'src-tauri', 'target', 'release', 'nonaterm'),
      },
    },
  ],
  reporters: ['spec'],
  framework: 'mocha',
  mochaOpts: {
    ui: 'bdd',
    timeout: 60000,
  },

  // Skip build if binary already exists (CI builds separately)
  onPrepare: () => {
    const binary = path.resolve(rootDir, 'src-tauri', 'target', 'release', 'nonaterm.exe');
    if (fs.existsSync(binary)) {
      console.log(`[wdio] Using existing binary: ${binary}`);
    } else {
      console.log('[wdio] Building Tauri app...');
      spawnSync('npm', ['run', 'tauri', 'build', '--no-bundle'], {
        cwd: rootDir,
        stdio: 'inherit',
        shell: true,
      });
    }
  },

  // Start tauri-driver before session
  beforeSession: async () => {
    const nativeDriver = findEdgeDriver();
    console.log(`[wdio] Starting tauri-driver (native: ${nativeDriver})...`);
    tauriDriver = spawn(
      path.resolve(os.homedir(), '.cargo', 'bin', 'tauri-driver'),
      ['--native-driver', nativeDriver],
      { stdio: [null, process.stdout, process.stderr] },
    );

    tauriDriver.on('error', (error) => {
      console.error('[wdio] tauri-driver error:', error);
      process.exit(1);
    });
    tauriDriver.on('exit', (code) => {
      if (!exit) {
        console.error('[wdio] tauri-driver exited with code:', code);
        process.exit(1);
      }
    });

    // Wait for tauri-driver to be ready
    console.log('[wdio] Waiting for tauri-driver...');
    await new Promise((resolve) => setTimeout(resolve, 2000));
  },

  // Clean up tauri-driver after session
  afterSession: () => {
    closeTauriDriver();
  },
};

function closeTauriDriver() {
  exit = true;
  tauriDriver?.kill();
}

function onShutdown(fn) {
  const cleanup = () => {
    try {
      fn();
    } finally {
      process.exit();
    }
  };

  process.on('exit', cleanup);
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('SIGHUP', cleanup);
  if (process.platform === 'win32') {
    process.on('SIGBREAK', cleanup);
  }
}

onShutdown(() => {
  closeTauriDriver();
});
