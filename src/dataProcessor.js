// src/dataProcessor.js
import { classifyUtterance } from "./filter.js";

export function processEntries(startDate, endDate, textInputDevices) {
  const data = {};
  const dateData = {};
  const utterances = [];
  let firstValidTime = null;
  let lastValidTime = null;
  const wakeVariants = [
    "hey alexa",
    "alexa",
    "hey echo",
    "echo",
    "hey ziggy",
    "ziggy",
    "hey computer",
    "computer",
  ];

  document.querySelectorAll(".apd-content-box.with-activity-page").forEach((e) => {
    const dElem = e.querySelector(".device-name");
    const tElem = e.querySelector(".customer-transcript") || e.querySelector(".replacement-text");
    const items = e.querySelectorAll(".record-info .item");
    if (dElem && tElem && items.length >= 2) {
      const device = dElem.innerText.trim();
      const dateStr = items[0].innerText.trim();
      const timeStr = items[1].innerText.trim();
      const fullDateStr = dateStr + " " + timeStr;
      const dateObj = new Date(fullDateStr);
      if (startDate && endDate && (dateObj < startDate || dateObj > endDate)) return;
      const classification = classifyUtterance(device, tElem, textInputDevices);
      const utt = {
        device,
        text: classification.text, // original text (with quotes)
        lowerText: classification.lowerText, // for matching
        timestamp: dateObj,
        category: classification.category, // "Subtractions" or "System Replacements" or null
        includeInReport: true,
      };
      // For wake word usage, clean the text (remove quotes) for matching.
      const normalized = utt.lowerText.replace(/^["']+|["']+$/g, '');
      for (const variant of wakeVariants) {
        if (normalized.startsWith(variant)) {
          utt.wakeWord = variant;
          break;
        }
      }
      utterances.push(utt);
      if (!data[device]) {
        data[device] = { _utteranceCount: 0, "Subtractions": 0, "System Replacements": 0, "Wake Word Usage": {} };
      }
      data[device]._utteranceCount++;
      if (utt.category === "Subtractions") {
        if (!(utt.lowerText.includes("tap /") && textInputDevices[device])) {
          data[device]["Subtractions"]++;
        }
      }
      if (utt.category === "System Replacements") {
        data[device]["System Replacements"]++;
      }
      if (utt.wakeWord) {
        data[device]["Wake Word Usage"][utt.wakeWord] =
          (data[device]["Wake Word Usage"][utt.wakeWord] || 0) + 1;
      }
      dateData[dateStr] = (dateData[dateStr] || 0) + 1;
      if (!firstValidTime || dateObj < firstValidTime) firstValidTime = dateObj;
      if (!lastValidTime || dateObj > lastValidTime) lastValidTime = dateObj;
    }
  });
  dateData.firstValid = firstValidTime
    ? firstValidTime.toLocaleString("en-US", { timeZone: "America/New_York" })
    : "N/A";
  dateData.lastValid = lastValidTime
    ? lastValidTime.toLocaleString("en-US", { timeZone: "America/New_York" })
    : "N/A";
  return { data, dateData, utterances };
}
