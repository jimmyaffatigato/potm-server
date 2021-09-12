"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_promise_1 = __importDefault(require("./lib/fs-promise"));
const path = require("path");
const PodcastServer_1 = __importDefault(require("./lib/PodcastServer"));
const SETTINGSPATH = path.join(__dirname, "settings.json");
loadSettings(SETTINGSPATH).then((settings) => {
    console.log(`Loaded settings from ${SETTINGSPATH}`);
    new PodcastServer_1.default(settings);
});
exports.default = {};
async function loadSettings(path) {
    const text = await fs_promise_1.default.readFile(path, "utf-8");
    return JSON.parse(text);
}
