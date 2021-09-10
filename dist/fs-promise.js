"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const nodefs = require("fs");
const util_1 = require("util");
const fs = {
    readFile: (0, util_1.promisify)(nodefs.readFile),
    writeFile: (0, util_1.promisify)(nodefs.writeFile),
    stat: (0, util_1.promisify)(nodefs.stat),
};
exports.default = fs;
