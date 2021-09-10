"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.numToMonth = exports.numToDay = exports.formatPubDate = exports.formatHTML = exports.formatDuration = void 0;
function formatDuration(num) {
    const hours = Math.floor(num / 3600);
    const minutes = Math.floor((num % 3600) / 60);
    const seconds = Math.floor(num % 60);
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
exports.formatDuration = formatDuration;
function formatHTML(text) {
    return text
        .replace(/([\r\n]| {4,})/g, "")
        .replace(/&gt;/g, ">")
        .replace(/&lt;/g, "<");
}
exports.formatHTML = formatHTML;
function formatPubDate(date) {
    const weekday = numToDay(date.getDay());
    const monthDate = date.getDate();
    const month = numToMonth(date.getMonth());
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    const offset = date.getTimezoneOffset();
    return `${weekday}, ${monthDate} ${month} ${year} ${hours}:${minutes}:${seconds} ${offset >= 0 ? "+" : ""}${String(offset).padStart(4, "0")}`;
}
exports.formatPubDate = formatPubDate;
function numToDay(num) {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days[num];
}
exports.numToDay = numToDay;
function numToMonth(num) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return months[num];
}
exports.numToMonth = numToMonth;
