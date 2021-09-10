export function formatDuration(num: number): string {
    const hours = Math.floor(num / 3600);
    const minutes = Math.floor((num % 3600) / 60);
    const seconds = Math.floor(num % 60);
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatHTML(text: string): string {
    return text
        .replace(/([\r\n]| {4,})/g, "")
        .replace(/&gt;/g, ">")
        .replace(/&lt;/g, "<");
}

export function formatPubDate(date: Date): string {
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

export function numToDay(num: number) {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days[num];
}

export function numToMonth(num: number) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return months[num];
}
