import { promisify } from "util";
import nodefs = require("fs");

const fs = {
    readFile: promisify(nodefs.readFile),
    writeFile: promisify(nodefs.writeFile),
    stat: promisify(nodefs.stat),
};

export default fs;
