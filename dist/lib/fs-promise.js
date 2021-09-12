"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("util");
const nodefs = require("fs");
const fs = {
    readFile: (0, util_1.promisify)(nodefs.readFile),
    writeFile: (0, util_1.promisify)(nodefs.writeFile),
    stat: (0, util_1.promisify)(nodefs.stat),
};
exports.default = fs;
