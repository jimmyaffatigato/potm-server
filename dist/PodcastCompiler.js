"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsdom_1 = require("jsdom");
const ffprobe_1 = __importDefault(require("ffprobe"));
const ffprobe_static_1 = __importDefault(require("ffprobe-static"));
const path = require("path");
const fs_promise_1 = __importDefault(require("./fs-promise"));
const podcast_util_1 = require("./podcast-util");
class PodcastCompiler {
    constructor(host, audioPath) {
        this.host = host;
        this.audioPath = audioPath;
        this.dom = new jsdom_1.JSDOM(`<rss xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom" version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"></rss>`, { contentType: "text/xml" });
        this.document = this.dom.window.document;
    }
    async buildRSS(host) {
        const document = this.document;
        const rssNode = document.getElementsByTagName("rss")[0];
        const optionsFile = path.join(__dirname, "podcast.json");
        const text = await fs_promise_1.default.readFile(optionsFile, "utf-8");
        const data = JSON.parse(text);
        const { feed, items } = data;
        const { title, description, copyright, webMaster, siteURL, links } = feed;
        console.log(`Compiling ${title} RSS feed using hostname ${host}`);
        const descriptionDOM = new jsdom_1.JSDOM(`<div></div>`);
        const descriptionDocument = descriptionDOM.window.document;
        const div = descriptionDocument.getElementsByTagName("div")[0];
        div.appendChild(this.newTag("p", description));
        const linksElement = document.createElement("p");
        div.appendChild(linksElement);
        links.forEach((c) => {
            linksElement.appendChild(document.createTextNode(c));
            linksElement.appendChild(document.createElement("br"));
        });
        const thumbnailURL = `${host}/s1-thumbnail.jpg`;
        const channelNode = document.createElement("channel");
        rssNode.appendChild(channelNode);
        channelNode.appendChild(this.newTag("title", title));
        channelNode.appendChild(this.newTag("description", (0, podcast_util_1.formatHTML)(div.innerHTML), true));
        channelNode.appendChild(this.newTag("copyright", copyright, true));
        channelNode.appendChild(this.newTag("language", "en"));
        channelNode.appendChild(this.newTag("generator", `POTM Server ${process.version}`));
        channelNode.appendChild(this.newTag("link", siteURL));
        channelNode.appendChild(this.newTag("docs", siteURL));
        channelNode.appendChild(this.newTag("managingEditor", webMaster));
        channelNode.appendChild(this.newTag("itunes:type", "serial"));
        const itunesImage = document.createElement("itunes:image");
        channelNode.appendChild(itunesImage);
        itunesImage.setAttribute("href", thumbnailURL);
        const imageElement = document.createElement("image");
        channelNode.appendChild(imageElement);
        imageElement.appendChild(this.newTag("url", thumbnailURL));
        imageElement.appendChild(this.newTag("title", title));
        imageElement.appendChild(this.newTag("link", siteURL));
        const itunesOwner = document.createElement("itunes:owner");
        channelNode.appendChild(itunesOwner);
        itunesOwner.appendChild(this.newTag("itunes:name", title));
        itunesOwner.appendChild(this.newTag("itunes:email", webMaster));
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const itemElement = await this.newItem(item, host, links, thumbnailURL);
            channelNode.appendChild(itemElement);
        }
    }
    async newItem(item, host, links, thumbnailURL) {
        const document = this.document;
        const { season, episode, title, description, date, id, cast, credits } = item;
        const descriptionDOM = new jsdom_1.JSDOM(`<div></div>`);
        const descriptionDocument = descriptionDOM.window.document;
        const div = descriptionDocument.getElementsByTagName("div")[0];
        const descriptionElement = document.createElement("p");
        div.appendChild(descriptionElement);
        descriptionElement.textContent = description;
        const castElement = document.createElement("p");
        div.appendChild(castElement);
        cast.forEach((c) => {
            castElement.appendChild(document.createTextNode(c));
            castElement.appendChild(document.createElement("br"));
        });
        const creditsElement = document.createElement("p");
        div.appendChild(creditsElement);
        credits.forEach((c) => {
            creditsElement.appendChild(document.createTextNode(c));
            creditsElement.appendChild(document.createElement("br"));
        });
        const linksElement = document.createElement("p");
        div.appendChild(linksElement);
        links.forEach((c) => {
            linksElement.appendChild(document.createTextNode(c));
            linksElement.appendChild(document.createElement("br"));
        });
        const url = `${host}/ep/${id}.mp3`;
        const pubDate = (0, podcast_util_1.formatPubDate)(new Date(date));
        const audioFile = path.join(this.audioPath, `${id}.mp3`);
        const audioInfo = (await (0, ffprobe_1.default)(audioFile, { path: ffprobe_static_1.default.path })).streams[0];
        const type = `${audioInfo.codec_type}/${audioInfo.codec_name}`;
        const bytes = (await fs_promise_1.default.stat(this.audioPath)).size;
        const itemElement = document.createElement("item");
        itemElement.appendChild(this.newTag("title", `S${season} E${episode} - ${title}`));
        itemElement.appendChild(this.newTag("itunes:title", title));
        itemElement.appendChild(this.newTag("pubDate", pubDate));
        itemElement.appendChild(this.newTag("description", (0, podcast_util_1.formatHTML)(div.innerHTML), true));
        itemElement.appendChild(this.newTag("itunes:duration", (0, podcast_util_1.formatDuration)(audioInfo.duration)));
        itemElement.appendChild(this.newTag("itunes:author", "Pods of the Multiverse"));
        itemElement.appendChild(this.newTag("itunes:explicit", "no"));
        itemElement.appendChild(this.newTag("itunes:episodeType", "full"));
        itemElement.appendChild(this.newTag("itunes:summary", description));
        const itunesImage = document.createElement("itunes:image");
        itemElement.appendChild(itunesImage);
        itunesImage.setAttribute("href", thumbnailURL);
        const enclosureElement = document.createElement("enclosure");
        enclosureElement.setAttribute("length", String(bytes));
        enclosureElement.setAttribute("type", type);
        enclosureElement.setAttribute("url", url);
        itemElement.appendChild(enclosureElement);
        return itemElement;
    }
    newTag(tagName, content, cdata = false) {
        const document = this.document;
        const element = document.createElement(tagName);
        if (cdata) {
            const contentNode = document.createCDATASection(content);
            element.appendChild(contentNode);
        }
        else {
            const contentNode = document.createTextNode(content);
            element.appendChild(contentNode);
        }
        return element;
    }
    async render(rssFilePath) {
        const podcastDeclaration = `<?xml version="1.0" encoding="UTF-8"?>`;
        await this.buildRSS(this.host);
        fs_promise_1.default.writeFile(rssFilePath, podcastDeclaration + this.dom.serialize());
    }
}
exports.default = PodcastCompiler;
