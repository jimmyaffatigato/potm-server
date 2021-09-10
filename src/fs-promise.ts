import nodefs = require("fs");
import { promisify } from "util";

const fs = {
    readFile: promisify(nodefs.readFile),
    writeFile: promisify(nodefs.writeFile),
    stat: promisify(nodefs.stat),
};

export default fs;
