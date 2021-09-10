"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const path = require("path");
const PodcastCompiler_1 = __importDefault(require("./PodcastCompiler"));
const episodeURL = "/ep";
const rssFilePath = path.resolve(__dirname, "rss.xml");
class PodcastServer {
    constructor(options) {
        this.router = express();
        const { port, host, audioPath, url } = options;
        this.url = url;
        this.port = port;
        this.compiler = new PodcastCompiler_1.default(host, path.resolve(__dirname, audioPath));
        this.compiler.render(rssFilePath).then(() => {
            this.start();
        });
    }
    start() {
        this.router.get(this.url, (req, res) => {
            res.sendFile(rssFilePath);
        });
        this.router.get(`${episodeURL}/:episodeID.mp3`, (req, res) => {
            const { episodeID } = req.params;
            const episodeFilePath = path.resolve(this.compiler.audioPath, `${episodeID}.mp3`);
            res.sendFile(episodeFilePath);
        });
        this.router.get(`/s1-thumbnail.jpg`, (req, res) => {
            res.sendFile(path.join(__dirname, "s1-thumbnail.jpg"));
        });
        this.router.listen(this.port, () => {
            console.log(`RSS server open at ${this.url} on ${this.port}`);
        });
    }
}
exports.default = PodcastServer;
