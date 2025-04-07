// src/report.js
export function copyCategory(data, utterances, category, filterDevice, textInputDevices) {
  let output = category + ":\n";
  let filtered = utterances.filter(
    (u) =>
      u.category === category &&
      (filterDevice === "All Devices" || u.device === filterDevice) &&
      u.includeInReport
  );
  if (category === "Subtractions") {
    filtered = filtered.filter(
      (u) => !(u.lowerText.includes("tap /") && textInputDevices[u.device])
    );
  }
  const counts = {};
  filtered.forEach((u) => {
    counts[u.text] = (counts[u.text] || 0) + 1;
  });
  for (const key in counts) {
    output += `\`${key}: ${counts[key]}\n\``;
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  output += `\`Total: ${total}\n\``;
  return output;
}

export function copyWakeWordUsage(data, filterDevice) {
  let output = "Wake Word Usage:\n";
  let agg = {};
  if (filterDevice === "All Devices") {
    for (const dev in data) {
      const usage = data[dev]["Wake Word Usage"] || {};
      for (const variant in usage) {
        agg[variant] = (agg[variant] || 0) + usage[variant];
      }
    }
  } else {
    const usage = data[filterDevice]["Wake Word Usage"] || {};
    for (const variant in usage) {
      agg[variant] = usage[variant];
    }
  }
  for (const variant in agg) {
    output += `\`${variant}: ${agg[variant]}\n\``;
  }
  const totalAll =
    filterDevice === "All Devices"
      ? Object.values(data).reduce((sum, d) => sum + (d._utteranceCount || 0), 0)
      : data[filterDevice]._utteranceCount || 0;
  const totalWake = Object.values(agg).reduce((sum, count) => sum + count, 0);
  output += `\`Total: ${totalWake} (${totalAll ? ((totalWake / totalAll) * 100).toFixed(1) : 0}% of utterances)\n\``;
  return output;
}

export function copyDevices(data) {
  let out = "Device Overview:\n";
  for (const d in data) {
    out += `${d}: ${data[d]._utteranceCount || 0}\n`;
  }
  return out;
}

export function copyDates(dateData) {
  let txt = `\`First Valid: ${dateData.firstValid || "N/A"}\nLast Valid: ${dateData.lastValid || "N/A"} ET\n\nDaily Work:\n\``;
  for (const dt in dateData) {
    if (dt !== "firstValid" && dt !== "lastValid") {
      txt += `${dt}: ${dateData[dt]}\n`;
    }
  }
  return txt;
}

export function copyFullAudit(data, dateData, utterances, textInputDevices) {
  let out = copyDevices(data) + "\n\n";
  out += copyWakeWordUsage(data, "All Devices") + "\n\n";
  out += copyCategory(data, utterances, "Subtractions", "All Devices", textInputDevices) + "\n\n";
  out += copyCategory(data, utterances, "System Replacements", "All Devices", textInputDevices) + "\n\n";
  out += "Per-Device Wake Word Usage:\n";
  for (const d in data) {
    let usage = "";
    for (const variant in data[d]["Wake Word Usage"]) {
      usage += `\`${variant}: ${data[d]["Wake Word Usage"][variant]}\n\``;
    }
    if (usage) out += `\`\n${d}:\n\`\n` + usage + "\n";
  }
  out += "\nPer-Device Subtractions:\n";
  for (const d in data) {
    const sub = copyCategory(data, utterances, "Subtractions", d, textInputDevices);
    if (sub.includes(":")) out += `\`\n${d}:\n\`\n` + sub + "\n";
  }
  out += "\nPer-Device System Replacements:\n";
  for (const d in data) {
    const sys = copyCategory(data, utterances, "System Replacements", d, textInputDevices);
    if (sys.includes(":")) out += `\`\n${d}:\n\`\n` + sys + "\n";
  }
  out += "\n" + copyDates(dateData);
  return out;
}
