import os from 'os';
import path from 'path';
import { spawn, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
let tauriDriver;
let exit = false;

export const config = {
  host: '127.0.0.1',
  port: 4444,
  specs: ['./specs/**/*.js'],
  maxInstances: 1,
  capabilities: [
    {
      maxInstances: 1,
      'tauri:options': {
        application: path.resolve(__dirname, '..', 'src-tauri', 'target', 'debug', 'nonaterm'),
      },
    },
  ],
  reporters: ['spec'],
  framework: 'mocha',
  mochaOpts: {
    ui: 'bdd',
    timeout: 60000,
  },

  // Build the Tauri app in debug mode before tests
  onPrepare: () => {
    console.log('[wdio] Building Tauri app (debug)...');
    spawnSync('npm', ['run', 'tauri', 'build', '--', '--debug', '--no-bundle'], {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'inherit',
      shell: true,
    });
  },

  // Start tauri-driver before session
  beforeSession: () => {
    console.log('[wdio] Starting tauri-driver...');
    tauriDriver = spawn(
      path.resolve(os.homedir(), '.cargo', 'bin', 'tauri-driver'),
      [],
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
