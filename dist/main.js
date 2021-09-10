"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const PodcastServer_1 = __importDefault(require("./PodcastServer"));
const args = process.argv.slice(2);
if (args.length > 0) {
    const command = args[0];
    if (command == "start") {
        const host = args[1];
        new PodcastServer_1.default({ port: 80, host });
    }
}
exports.default = {};
