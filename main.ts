import express = require("express");
import path = require("path");
import nodefs = require("fs");
import { promisify } from "util";
import { JSDOM } from "jsdom";
import ffprobe from "ffprobe";
import ffprobeStatic from "ffprobe-static";

const PACKAGE = JSON.parse(nodefs.readFileSync(path.join(__dirname, "package.json"), "utf-8")) as { version: string };

const VERSION = PACKAGE.version;

const fs = {
    readFile: promisify(nodefs.readFile),
    writeFile: promisify(nodefs.writeFile),
    stat: promisify(nodefs.stat),
};

const HOST = "192.168.86.63";
const rssURL = "/rss";
const episodeURL = "/ep";
const CLIENTFOLDER = path.resolve(__dirname, "client");
const EPISODESFOLDER = path.resolve(CLIENTFOLDER, "episodes");

const rssFilePath = path.resolve(CLIENTFOLDER, "rss.xml");

const dom = new JSDOM(
    `<rss xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom" version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"></rss>`,
    { contentType: "text/xml" }
);
const document = dom.window.document;

interface ServerOptions {
    port: number;
}

class PodcastServer {
    readonly version: string;
    router = express();
    constructor(options: ServerOptions) {
        const { port } = options;
        this.version = VERSION;
        this.router.get(rssURL, (req, res) => {
            this.buildRSS().then(() => {
                res.sendFile(rssFilePath);
            });
        });
        this.router.get(`${episodeURL}/:episodeID.mp3`, (req, res) => {
            const { episodeID } = req.params;
            const episodeFilePath = path.resolve(EPISODESFOLDER, `${episodeID}.mp3`);
            res.sendFile(episodeFilePath);
        });
        this.router.get(`/s1-thumbnail.jpg`, (req, res) => {
            res.sendFile(path.join(CLIENTFOLDER, "s1-thumbnail.jpg"));
        });
        this.router.listen(port, () => {
            console.log(`RSS server open at ${HOST}:${port}${rssURL}`);
        });
    }

    async buildRSS() {
        const podcastDeclaration = `<?xml version="1.0" encoding="UTF-8"?>`;

        const rssNode = document.getElementsByTagName("rss")[0];

        const optionsFile = path.join(CLIENTFOLDER, "podcast.json");
        const text = await fs.readFile(optionsFile, "utf-8");
        const data = JSON.parse(text) as PodcastData;
        const { feed, items } = data;
        const { title, copyright, feedUrl, siteUrl, webMaster } = feed;
        const description = await fs.readFile(path.join(CLIENTFOLDER, "description.html"), "utf-8");

        const patreonLink = "https://patreon.com/Multiverse_Pod";
        const thumbnailURL = `${HOST}/s1-thumbnail.jpg`;

        const channelNode = document.createElement("channel");
        rssNode.appendChild(channelNode);

        channelNode.appendChild(newTag("title", title));
        channelNode.appendChild(newTag("description", flattenXML(description), true));
        channelNode.appendChild(newTag("copyright", copyright, true));
        channelNode.appendChild(newTag("language", "en"));
        channelNode.appendChild(newTag("generator", `POTM Server v${this.version}`));
        channelNode.appendChild(newTag("link", patreonLink));
        channelNode.appendChild(newTag("docs", patreonLink));
        channelNode.appendChild(newTag("managingEditor", webMaster));
        channelNode.appendChild(newTag("itunes:type", "serial"));

        const itunesImage = document.createElement("itunes:image");
        itunesImage.setAttribute("href", thumbnailURL);

        const imageElement = document.createElement("image");
        imageElement.appendChild(newTag("url", thumbnailURL));
        imageElement.appendChild(newTag("title", title));
        imageElement.appendChild(newTag("link", patreonLink));

        const itunesOwner = document.createElement("itunes:owner");
        channelNode.appendChild(itunesOwner);
        itunesOwner.appendChild(newTag("itunes:name", title));
        itunesOwner.appendChild(newTag("itunes:email", webMaster));

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const itemElement = await newItem(item);
            channelNode.appendChild(itemElement);
        }

        const promise = new Promise<void>((resolve) => {
            fs.writeFile(rssFilePath, podcastDeclaration + dom.serialize()).then(resolve);
        });
        return promise;
    }
}

const podcastServer = new PodcastServer({ port: 80 });

export default PodcastServer;

interface PodcastData {
    feed: {
        title: string;
        copyright: string;
        feedUrl: string;
        siteUrl: string;
        webMaster: string;
    };
    items: EpisodeData[];
}

interface EpisodeData {
    season: number;
    episode: number;
    title: string;
    date: number;
    id: string;
}

function numToDay(num: number) {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days[num];
}

function numToMonth(num: number) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return months[num];
}

async function newItem(item: EpisodeData) {
    const { season, episode, title, id, date } = item;
    const description = await fs.readFile(path.join(EPISODESFOLDER, `${id}.html`), "utf-8");

    const descriptionDOM = new JSDOM(description);
    const summary = Array.from(descriptionDOM.window.document.body.childNodes)[0].textContent;

    const url = `${HOST}/ep/${id}.mp3`;
    const pubDate = formatPubDate(new Date(date));

    const localAudioPath = path.join(EPISODESFOLDER, `${id}.mp3`);
    const audioInfo = (await ffprobe(localAudioPath, { path: ffprobeStatic.path })).streams[0];
    const type = `${audioInfo.codec_type}/${audioInfo.codec_name}`;
    const bytes = (await fs.stat(localAudioPath)).size;

    const itemElement = document.createElement("item");

    itemElement.appendChild(newTag("title", `S${season} E${episode} - ${title}`));
    itemElement.appendChild(newTag("itunes:title", title));
    itemElement.appendChild(newTag("pubDate", pubDate));
    itemElement.appendChild(newTag("description", flattenXML(description), true));
    itemElement.appendChild(newTag("itunes:duration", formatDuration(audioInfo.duration)));
    itemElement.appendChild(newTag("itunes:author", "Pods of the Multiverse"));
    itemElement.appendChild(newTag("itunes:explicit", "no"));
    itemElement.appendChild(newTag("itunes:episodeType", "full"));
    itemElement.appendChild(newTag("itunes:summary", summary));

    const enclosureElement = document.createElement("enclosure");
    enclosureElement.setAttribute("length", String(bytes));
    enclosureElement.setAttribute("type", type);
    enclosureElement.setAttribute("url", url);
    itemElement.appendChild(enclosureElement);

    return itemElement;
}

function newTag(tagName: string, content: string, cdata: boolean = false) {
    const element = document.createElement(tagName);
    if (cdata) {
        const contentNode = document.createCDATASection(content);
        element.appendChild(contentNode);
    } else {
        const contentNode = document.createTextNode(content);
        element.appendChild(contentNode);
    }
    return element;
}

function formatPubDate(date: Date): string {
    const weekday = numToDay(date.getDay());
    const monthDate = date.getDate();
    const month = numToMonth(date.getMonth());
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    const offset = date.getTimezoneOffset();
    return `${weekday}, ${monthDate} ${month} ${year} ${hours}:${minutes}:${seconds} ${offset >= 0 ? "+" : ""}${String(
        offset
    ).padStart(4, "0")}`;
}

function formatDuration(num: number): string {
    const hours = Math.floor(num / 3600);
    const minutes = Math.floor((num % 3600) / 60);
    const seconds = 0;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function flattenXML(text: string): string {
    return text.replace(/([\r\n]| {4,})/g, "");
}
