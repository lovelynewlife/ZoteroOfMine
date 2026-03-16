/**
 * Bundle Script: Build Zotero Plugin with Electron App
 * 
 * This script:
 * 1. Builds Electron app for specified platform(s)
 * 2. Copies Electron output to addon/vibe-research/
 * 3. Builds Zotero plugin (xpi)
 * 4. Renames xpi with platform suffix
 * 
 * Usage:
 *   node scripts/bundle.mjs              # Build for current platform
 *   node scripts/bundle.mjs --platform=win
 *   node scripts/bundle.mjs --platform=mac
 *   node scripts/bundle.mjs --platform=linux
 * 
 * Cross-platform build limitations:
 *   - Linux can only build Linux apps
 *   - macOS can build macOS and Linux apps
 *   - Windows can build Windows and Linux apps
 *   - Building Windows apps on Linux/macOS requires Wine
 */

import { execSync, spawn } from "child_process";
import {
  existsSync,
  mkdirSync,
  rmSync,
  cpSync,
  renameSync,
  readdirSync,
  statSync,
} from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const packageJson = require("../package.json");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const chatuiDir = path.join(rootDir, "src/chatui");
const addonDir = path.join(rootDir, "addon");
const buildDir = path.join(rootDir, "build");

const { name, version, config } = packageJson;

// Parse command line arguments
const args = process.argv.slice(2);
let targetPlatform = null;

for (const arg of args) {
  if (arg.startsWith("--platform=")) {
    targetPlatform = arg.split("=")[1];
  }
}

// Detect current platform
const currentPlatform = process.platform === "win32" ? "win" 
  : process.platform === "darwin" ? "mac" 
  : "linux";

// Default to current platform
if (!targetPlatform) {
  targetPlatform = currentPlatform;
  console.log(`[Bundle] No platform specified, using current: ${currentPlatform}`);
}

// Check cross-platform build capability
function canBuildPlatform(target) {
  if (target === currentPlatform) return true;
  
  if (target === "win" && currentPlatform !== "win") {
    // Check for Wine
    try {
      execSync("which wine", { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  }
  
  // macOS can build Linux, and vice versa
  if ((target === "linux" && currentPlatform === "mac") ||
      (target === "mac" && currentPlatform === "linux")) {
    return true;
  }
  
  return currentPlatform === target;
}

// Platform mappings
const platformConfigs = {
  win: {
    electronArch: "x64",
    xpiSuffix: "win",
    files: (version) => [
      { src: `vibe-research-${version}-x64-win.exe`, dest: "vibe-research.exe" },
    ],
  },
  mac: {
    electronArch: "universal",
    xpiSuffix: "mac",
    files: (version) => [
      { src: `vibe-research-${version}-x64-mac.dmg`, dest: "vibe-research-x64.dmg" },
      { src: `vibe-research-${version}-arm64-mac.dmg`, dest: "vibe-research-arm64.dmg" },
      // For direct execution, we need the .app
      { src: `vibe-research.app`, dest: "vibe-research.app", isDir: true },
    ],
  },
  linux: {
    electronArch: "x64",
    xpiSuffix: "linux",
    files: (version) => [
      { src: `vibe-research-${version}-x64-linux.AppImage`, dest: "vibe-research.AppImage" },
    ],
  },
};

/**
 * Run command synchronously
 */
function runCommand(command, cwd = rootDir) {
  console.log(`[Bundle] Running: ${command}`);
  try {
    // Use Electron mirror for faster downloads in China
    const env = {
      ...process.env,
      ELECTRON_MIRROR: process.env.ELECTRON_MIRROR || 'https://npmmirror.com/mirrors/electron/',
    };
    execSync(command, { cwd, stdio: "inherit", env });
    return true;
  } catch (error) {
    console.error(`[Bundle] Command failed: ${command}`);
    return false;
  }
}

/**
 * Build Electron app for platform
 */
async function buildElectron(platform) {
  console.log(`\n[Bundle] Building Electron for ${platform}...`);
  
  const buildCmd = platform === "all" 
    ? "pnpm build:all" 
    : `pnpm build:${platform}`;
  
  if (!runCommand(buildCmd, chatuiDir)) {
    throw new Error(`Failed to build Electron for ${platform}`);
  }
  
  console.log(`[Bundle] Electron build for ${platform} completed`);
}

/**
 * Copy Electron output to addon directory
 */
function copyElectronToAddon(platform) {
  console.log(`\n[Bundle] Copying Electron output to addon directory...`);
  
  const distDir = path.join(chatuiDir, "dist-electron");
  const targetDir = path.join(addonDir, "vibe-research", platform);
  
  // Clean target directory
  if (existsSync(targetDir)) {
    rmSync(targetDir, { recursive: true, force: true });
  }
  
  // Check if dist exists
  if (!existsSync(distDir)) {
    throw new Error(`Electron dist not found: ${distDir}`);
  }
  
  // List available files
  console.log(`[Bundle] Available files in dist:`);
  const files = readdirSync(distDir);
  files.forEach(f => console.log(`  - ${f}`));
  
  // electron-builder with dir target creates:
  // - win: win-unpacked/
  // - mac: mac/ or mac-arm64/
  // - linux: linux-unpacked/
  
  const platformDirMap = {
    win: ["win-unpacked", "win"],
    mac: ["mac-arm64", "mac-x64", "mac"], // Prefer arm64 for Apple Silicon
    linux: ["linux-unpacked", "linux"],
  };
  
  const possibleDirs = platformDirMap[platform];
  let sourceDir = null;
  
  for (const dirName of possibleDirs) {
    const testPath = path.join(distDir, dirName);
    if (existsSync(testPath)) {
      sourceDir = testPath;
      break;
    }
  }
  
  if (sourceDir) {
    console.log(`[Bundle] Found unpacked directory: ${path.basename(sourceDir)}`);
    mkdirSync(path.dirname(targetDir), { recursive: true });
    cpSync(sourceDir, targetDir, { recursive: true });
    console.log(`[Bundle] Copied to: ${targetDir}`);
    
    // For macOS, ensure the app is named correctly
    if (platform === "mac") {
      const appFiles = readdirSync(targetDir);
      const appFile = appFiles.find(f => f.endsWith(".app"));
      if (appFile && appFile !== "vibe-research.app") {
        const oldPath = path.join(targetDir, appFile);
        const newPath = path.join(targetDir, "vibe-research.app");
        renameSync(oldPath, newPath);
        console.log(`[Bundle] Renamed: ${appFile} -> vibe-research.app`);
      }
    }
    
    // For Linux, make sure the binary is executable
    if (platform === "linux") {
      const linuxFiles = readdirSync(targetDir);
      const binaryFile = linuxFiles.find(f => f.startsWith("vibe-research") && !f.includes("."));
      if (binaryFile) {
        const binaryPath = path.join(targetDir, binaryFile);
        try {
          execSync(`chmod +x "${binaryPath}"`);
          console.log(`[Bundle] Made executable: ${binaryFile}`);
        } catch (e) {
          console.log(`[Bundle] Warning: Could not make binary executable`);
        }
      }
    }
  } else {
    console.log(`[Bundle] Warning: Unpacked directory not found for ${platform}`);
    console.log(`[Bundle] Looking for: ${possibleDirs.join(", ")}`);
    throw new Error(`Electron unpacked directory not found for platform ${platform}`);
  }
  
  console.log(`[Bundle] Electron files copied successfully`);
}

/**
 * Build Zotero plugin
 */
async function buildZoteroPlugin() {
  console.log(`\n[Bundle] Building Zotero plugin...`);
  
  if (!runCommand("pnpm build-prod", rootDir)) {
    throw new Error("Failed to build Zotero plugin");
  }
  
  console.log(`[Bundle] Zotero plugin build completed`);
}

/**
 * Rename XPI with platform suffix
 */
function renameXpi(platform) {
  const suffix = platformConfigs[platform].xpiSuffix;
  const originalXpi = path.join(buildDir, `${name}.xpi`);
  const renamedXpi = path.join(buildDir, `${name}-${suffix}.xpi`);
  
  if (existsSync(originalXpi)) {
    renameSync(originalXpi, renamedXpi);
    console.log(`[Bundle] Renamed: ${name}.xpi -> ${name}-${suffix}.xpi`);
  } else {
    console.log(`[Bundle] Warning: XPI not found: ${originalXpi}`);
  }
}

/**
 * Main bundle function
 */
async function main() {
  const startTime = Date.now();
  
  console.log(`\n${"=".repeat(60)}`);
  console.log(`[Bundle] Starting bundle process`);
  console.log(`[Bundle] Version: ${version}`);
  console.log(`[Bundle] Current platform: ${currentPlatform}`);
  console.log(`[Bundle] Target platform: ${targetPlatform}`);
  console.log(`${"=".repeat(60)}\n`);
  
  try {
    // Check if we can build for the target platform
    if (!canBuildPlatform(targetPlatform)) {
      console.error(`\n[Bundle] Error: Cannot build for ${targetPlatform} on ${currentPlatform}`);
      console.error(`[Bundle] `);
      console.error(`[Bundle] Cross-platform build limitations:`);
      console.error(`[Bundle]   - Linux can only build Linux apps`);
      console.error(`[Bundle]   - macOS can build macOS and Linux apps`);
      console.error(`[Bundle]   - Windows can build Windows and Linux apps`);
      console.error(`[Bundle] `);
      console.error(`[Bundle] To build for ${targetPlatform}, use:`);
      console.error(`[Bundle]   1. Run on a ${targetPlatform} machine`);
      console.error(`[Bundle]   2. Use GitHub Actions CI/CD`);
      console.error(`[Bundle]   3. Install Wine (for Windows builds on Linux/macOS)`);
      process.exit(1);
    }
    
    console.log(`[Bundle] Building for platform: ${targetPlatform}`);
    
    // Build for the target platform
    console.log(`\n${"=".repeat(60)}`);
    console.log(`[Bundle] Processing platform: ${targetPlatform}`);
    console.log(`${"=".repeat(60)}`);
    
    // Step 1: Build Electron
    await buildElectron(targetPlatform);
    
    // Step 2: Copy Electron to addon
    copyElectronToAddon(targetPlatform);
    
    // Step 3: Build Zotero plugin
    await buildZoteroPlugin();
    
    // Step 4: Rename XPI
    renameXpi(targetPlatform);
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n${"=".repeat(60)}`);
    console.log(`[Bundle] Build completed in ${elapsed}s`);
    console.log(`[Bundle] Output: build/${name}-${targetPlatform}.xpi`);
    console.log(`${"=".repeat(60)}\n`);
    
  } catch (error) {
    console.error(`\n[Bundle] Error: ${error.message}`);
    process.exit(1);
  }
}

main();
