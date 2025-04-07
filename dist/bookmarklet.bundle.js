(function () {
  'use strict';

  // src/autoscroll.js
  function autoScrollAndLoad(callback) {
    const p = 500, m = 6, x = 200;
    let lastScrollHeight = 0, sameCount = 0, attempts = 0;
    const stopBtn = document.createElement('button');
    stopBtn.textContent = "Stop Scrolling";
    stopBtn.style =
      "position:fixed;top:10px;right:10px;padding:10px;z-index:999999;background:red;color:#fff;border-radius:5px;cursor:pointer;";
    stopBtn.onclick = () => {
      clearInterval(scrollInterval);
      stopBtn.remove();
      setTimeout(callback, 1000);
    };
    document.body.appendChild(stopBtn);
    const scrollInterval = setInterval(() => {
      attempts++;
      const loadingElem = document.querySelector(".full-width-message");
      if (loadingElem) {
        loadingElem.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        window.scrollBy({ top: innerHeight, behavior: "smooth" });
      }
      const newScrollHeight = document.body.scrollHeight;
      if (newScrollHeight === lastScrollHeight) {
        sameCount++;
      } else {
        sameCount = 0;
      }
      lastScrollHeight = newScrollHeight;
      if (sameCount >= m || attempts >= x) {
        if (loadingElem && loadingElem.innerText.match(/loading more/i)) {
          sameCount = m - 2;
        } else {
          clearInterval(scrollInterval);
          stopBtn.remove();
          setTimeout(callback, 1500);
        }
      }
    }, p);
  }

  // src/filter.js
  function classifyUtterance(device, tElem, textInputDevices) {
    const text = tElem ? tElem.innerText : "";
    const lowerText = text.toLowerCase().trim();
    let category = null;
    // System Replacements: missing transcript or known system phrases.
    if (
      !text.trim() ||
      lowerText.includes("no text stored") ||
      lowerText.includes("audio was not intended") ||
      lowerText.includes("audio could not be understood")
    ) {
      category = "System Replacements";
    } else {
      const words = lowerText.split(/\s+/);
      // Remove leading/trailing quotes from each word.
      const cleanWords = words.map((w) => w.replace(/^["']+|["']+$/g, ''));
      if (cleanWords.length === 1) {
        category = "Subtractions";
      } else if (
        cleanWords.length === 2 &&
        ["alexa", "echo", "ziggy", "computer"].includes(cleanWords[0])
      ) {
        category = "Subtractions";
      }
      // If the utterance includes "tap /":
      if (lowerText.includes("tap /")) {
        if (device.toLowerCase().includes("echo")) {
          category = "Subtractions";
        } else {
          // On text-input devices, do not count tap/routine as a subtraction.
          if (textInputDevices[device]) {
            if (category === "Subtractions") category = null;
          } else {
            if (!category) category = "Subtractions";
          }
        }
      }
    }
    return { text, lowerText, category };
  }

  // src/dataProcessor.js

  function processEntries(startDate, endDate, textInputDevices) {
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

  // src/report.js
  function copyCategory(data, utterances, category, filterDevice, textInputDevices) {
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

  function copyWakeWordUsage(data, filterDevice) {
    let output = "Wake Word Usage:\n";
    let agg = {};
    {
      for (const dev in data) {
        const usage = data[dev]["Wake Word Usage"] || {};
        for (const variant in usage) {
          agg[variant] = (agg[variant] || 0) + usage[variant];
        }
      }
    }
    for (const variant in agg) {
      output += `\`${variant}: ${agg[variant]}\n\``;
    }
    const totalAll =
      Object.values(data).reduce((sum, d) => sum + (d._utteranceCount || 0), 0)
        ;
    const totalWake = Object.values(agg).reduce((sum, count) => sum + count, 0);
    output += `\`Total: ${totalWake} (${totalAll ? ((totalWake / totalAll) * 100).toFixed(1) : 0}% of utterances)\n\``;
    return output;
  }

  function copyDevices(data) {
    let out = "Device Overview:\n";
    for (const d in data) {
      out += `${d}: ${data[d]._utteranceCount || 0}\n`;
    }
    return out;
  }

  function copyDates(dateData) {
    let txt = `\`First Valid: ${dateData.firstValid || "N/A"}\nLast Valid: ${dateData.lastValid || "N/A"} ET\n\nDaily Work:\n\``;
    for (const dt in dateData) {
      if (dt !== "firstValid" && dt !== "lastValid") {
        txt += `${dt}: ${dateData[dt]}\n`;
      }
    }
    return txt;
  }

  function copyFullAudit(data, dateData, utterances, textInputDevices) {
    let out = copyDevices(data) + "\n\n";
    out += copyWakeWordUsage(data) + "\n\n";
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

  // src/ui.js

  // Main function to render the UI. This function can be called after auto-scroll completes.
  function renderUI(startDate, endDate, textInputDevices) {
    const { data, dateData, utterances } = processEntries(startDate, endDate, textInputDevices);
    // Expose data for use in inline view functions.
    window.__countBookmarkletData = { data, dateData, utterances, textInputDevices, viewSubtractions };

    // Clear any existing UI panels.
    const existingPanel = document.getElementById("countBookmarkletMainUI");
    if (existingPanel) existingPanel.remove();

    // Create main UI container.
    const container = document.createElement("div");
    container.id = "countBookmarkletMainUI";
    container.style =
      "position:fixed;top:10px;right:10px;width:320px;max-height:80%;overflow:auto;padding:10px;background:#f9f9f9;z-index:99999;border-radius:5px;box-shadow:0 0 10px rgba(0,0,0,0.3);";
    container.innerHTML = '<b style="display:block;text-align:center;">Audit Results</b><hr>';

    // Device selector.
    const select = document.createElement("select");
    select.style = "width:100%;margin-bottom:10px;";
    const options = ["All Devices", ...Object.keys(data)]
      .map((d) => `<option>${d}</option>`)
      .join("");
    select.innerHTML = options;
    select.id = "deviceFilter";
    container.appendChild(select);

    // Category counts container.
    const categoryDiv = document.createElement("div");
    categoryDiv.id = "categoryCounts";
    container.appendChild(categoryDiv);
    renderCategoryCounts(data, dateData, utterances, textInputDevices, select.value, categoryDiv);

    // Copy Full Report button.
    const btnCopy = document.createElement("button");
    btnCopy.textContent = "Copy Full Report";
    btnCopy.style = "width:100%;padding:5px;margin-top:4px;cursor:pointer;";
    btnCopy.onclick = () => {
      const report = copyFullAudit(data, dateData, utterances, textInputDevices);
      navigator.clipboard.writeText(report).then(() => alert("Copied Full Report!"));
    };
    container.appendChild(btnCopy);

    // Close button.
    const btnClose = document.createElement("button");
    btnClose.textContent = "Close";
    btnClose.style = "width:100%;padding:5px;margin-top:5px;cursor:pointer;";
    btnClose.onclick = () => {
      container.remove();
      const devicePanel = document.getElementById("deviceOverviewPanel");
      if (devicePanel) devicePanel.remove();
    };
    container.appendChild(btnClose);
    document.body.appendChild(container);

    // Render Device Overview Panel.
    renderDeviceOverviewPanel(data, textInputDevices);

    // Update counts when device filter changes.
    select.onchange = () => {
      renderCategoryCounts(data, dateData, utterances, textInputDevices, select.value, categoryDiv);
    };
  }

  function renderCategoryCounts(data, dateData, utterances, textInputDevices, device, container) {
    container.innerHTML = "";
    container.innerHTML += `<b>Device: ${device}</b><br><br>`;
    
    // Wake Word Usage aggregation.
    const usageAgg = {};
    let totalWake = 0, totalUtter = 0;
    if (device === "All Devices") {
      for (const dev in data) {
        totalUtter += data[dev]._utteranceCount;
        const usage = data[dev]["Wake Word Usage"] || {};
        for (const variant in usage) {
          usageAgg[variant] = (usageAgg[variant] || 0) + usage[variant];
          totalWake += usage[variant];
        }
      }
    } else {
      totalUtter = data[device]._utteranceCount || 0;
      const usage = data[device]["Wake Word Usage"] || {};
      for (const variant in usage) {
        usageAgg[variant] = usage[variant];
        totalWake += usage[variant];
      }
    }
    let wakeHTML = `<b>Wake Word Usage:</b><br>`;
    for (const variant in usageAgg) {
      wakeHTML += `&nbsp;&nbsp;${variant} - ${usageAgg[variant]}<br>`;
    }
    const perc = totalUtter ? ((totalWake / totalUtter) * 100).toFixed(1) : 0;
    wakeHTML += `<b>Total: ${totalWake} (${perc}% of utterances)</b><br>`;
    container.innerHTML += wakeHTML;
    
    // Subtractions counts.
    const singleCount = utterances.filter((u) =>
      u.category === "Subtractions" &&
      (device === "All Devices" || u.device === device) &&
      !(u.lowerText.includes("tap /") && textInputDevices[u.device]) &&
      u.includeInReport
    ).length;
    const sysCount = utterances.filter((u) =>
      u.category === "System Replacements" &&
      (device === "All Devices" || u.device === device) &&
      u.includeInReport
    ).length;
    container.innerHTML += `<br><b>Subtractions:</b><br>`;
    // Use JSON.stringify(device) to safely inject the device name.
    container.innerHTML += `&nbsp;&nbsp;Single word - ${singleCount} <small style="color:blue;cursor:pointer;" onclick='window.__countBookmarkletData.viewSubtractions("Subtractions", ${JSON.stringify(device)})'>(view)</small><br>`;
    container.innerHTML += `&nbsp;&nbsp;System Replacements - ${sysCount} <small style="color:blue;cursor:pointer;" onclick='window.__countBookmarkletData.viewSubtractions("System Replacements", ${JSON.stringify(device)})'>(view)</small><br>`;
  }

  function renderDeviceOverviewPanel(data, textInputDevices) {
    let panel = document.getElementById("deviceOverviewPanel");
    if (panel) panel.remove();
    panel = document.createElement("div");
    panel.id = "deviceOverviewPanel";
    panel.style =
      "position:fixed;top:10px;right:350px;width:200px;max-height:80%;overflow:auto;padding:10px;background:#eef;z-index:99998;border-radius:5px;box-shadow:0 0 10px rgba(0,0,0,0.3);";
    const header = document.createElement("b");
    header.style.textAlign = "center";
    header.style.display = "block";
    header.textContent = "Device Overview";
    panel.appendChild(header);
    const ul = document.createElement("ul");
    for (const d in data) {
      const li = document.createElement("li");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = textInputDevices[d] === true;
      checkbox.onchange = function () {
        textInputDevices[d] = checkbox.checked;
        // Re-render counts.
        const device = document.getElementById("deviceFilter").value;
        const catDiv = document.getElementById("categoryCounts");
        renderCategoryCounts(data, window.__countBookmarkletData.dateData, window.__countBookmarkletData.utterances, textInputDevices, device, catDiv);
      };
      li.appendChild(checkbox);
      const span = document.createElement("span");
      span.textContent = ` ${d}: ${data[d]._utteranceCount || 0}`;
      li.appendChild(span);
      ul.appendChild(li);
    }
    panel.appendChild(ul);
    const devCopy = document.createElement("button");
    devCopy.textContent = "Copy Devices";
    devCopy.style = "width:100%;padding:5px;margin-top:5px;cursor:pointer;";
    devCopy.onclick = () => {
      const txt = copyDevices(data);
      navigator.clipboard.writeText(txt).then(() => alert("Copied Devices!"));
    };
    panel.appendChild(devCopy);
    document.body.appendChild(panel);
  }

  // Expose viewSubtractions so inline onclick handlers can call it.
  function viewSubtractions(category, filterDevice) {
    const { utterances, textInputDevices } = window.__countBookmarkletData;
    let panel = document.createElement("div");
    panel.style =
      "position:fixed;top:100px;left:50px;width:400px;max-height:80%;overflow:auto;padding:10px;background:#fff;z-index:100000;border:2px solid #000;border-radius:5px;";
    panel.innerHTML = `<b>${category} for ${filterDevice}</b><hr>`;
    let list = utterances.filter(
      (u) => u.category === category && (filterDevice === "All Devices" || u.device === filterDevice)
    );
    if (category === "Subtractions") {
      list = list.filter((u) => !(u.lowerText.includes("tap /") && textInputDevices[u.device]));
    }
    list.forEach((u) => {
      const div = document.createElement("div");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = u.includeInReport;
      checkbox.onchange = () => {
        u.includeInReport = checkbox.checked;
        renderCategoryCounts();
      };
      div.appendChild(checkbox);
      const span = document.createElement("span");
      span.textContent = ` [${u.device}] ${u.text}`;
      div.appendChild(span);
      panel.appendChild(div);
    });
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "Close";
    closeBtn.style = "width:100%;padding:5px;margin-top:5px;cursor:pointer;";
    closeBtn.onclick = () => panel.remove();
    panel.appendChild(closeBtn);
    document.body.appendChild(panel);
  }

  // src/index.js

  // Immediately invoked function to initialize the bookmarklet.
  // You can set initial startDate, endDate, and textInputDevices as needed.
  (function () {
    const startDate = null;
    const endDate = null;
    const textInputDevices = {}; // Initially empty; devices can be marked via the UI.
    // Start auto-scrolling and then render the UI.
    autoScrollAndLoad(() => {
      renderUI(startDate, endDate, textInputDevices);
    });
  })();

})();
