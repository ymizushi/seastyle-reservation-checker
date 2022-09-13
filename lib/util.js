import fetch from "node-fetch";
export function dateRange(today, addDays) {
    return [...new Array(addDays).keys()]
        .map(num => {
        const newDate = new Date(today);
        newDate.setDate(newDate.getDate() + num + 1);
        return newDate;
    });
}
export function splitDateByMonth(days) {
    const dict = new Map();
    days.forEach((d) => {
        const key = (d.getMonth() + 1).toString();
        const value = dict.get(key);
        if (value !== undefined) {
            dict.set(key, value.concat([d]));
        }
        else {
            dict.set(key, []);
        }
    });
    return dict;
}
export function filterHolidays(dates) {
    return dates.filter(date => date.getDay() === 0 || date.getDay() === 6);
}
export async function notifySlack(content, url) {
    console.log(`notify to Slack:\n ${content}`);
    return await postData(url, {
        text: content,
    });
}
async function postData(url = "", data = {}) {
    return await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    });
}
//# sourceMappingURL=util.js.map