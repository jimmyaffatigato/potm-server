import PodcastServer from "./PodcastServer";

const args = process.argv.slice(2);

if (args.length > 0) {
    const command = args[0];
    if (command == "start") {
        const host = args[1];
        new PodcastServer({ port: 80, host });
    }
}

export default {};