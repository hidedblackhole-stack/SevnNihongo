import { Config } from '@remotion/cli/config';
Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
// Chrome lokal dipakai agar tidak mengunduh Chrome Headless Shell (override via CHROME_PATH).
Config.setBrowserExecutable(process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe');
