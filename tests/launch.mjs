import { chromium } from 'playwright-core';
import fs from 'node:fs';
const EXE = process.env.CHROME || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => fs.existsSync(p));
export const launch = () => chromium.launch({ executablePath: EXE, headless: true, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--use-gl=swiftshader'] });
export const FILE = 'file:///workspace/magic-colour/dist-single/Magic-Colour.html';
export const SHOTS = '/workspace/magic-colour-screens';
fs.mkdirSync(SHOTS, { recursive: true });
