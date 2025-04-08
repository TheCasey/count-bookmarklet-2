// src/ui.js
import { processEntries } from "./dataProcessor.js";
import { autoScrollAndLoad } from "./autoscroll.js";
import { copyFullAudit, copyDevices } from "./report.js";

// Helper: Read filter date inputs from the page and return startDate and endDate (in ET)
// It assumes that the page has inputs with IDs "#date-start" and "#date-end".
// For the start date, we use 8:00 PM ET; for the end date, 6:00 PM ET.
function getFilterDates() {
  const s = document.querySelector("#date-start");
  const e = document.querySelector("#date-end");
  if (!s || !e) {
    alert("Could not find filter range on page.");
    return { startDate: null, endDate: null };
  }
  const currentYear = new Date().getFullYear();
  const startInput = s.value.length < 10 ? s.value + "/" + currentYear : s.value;
  const endInput = e.value.length < 10 ? e.value + "/" + currentYear : e.value;
  // Create Date objects with the designated times.
  const startDate = new Date(
    new Date(startInput + " 20:00:00").toLocaleString("en-US", { timeZone: "America/New_York" })
  );
  const endDate = new Date(
    new Date(endInput + " 18:00:00").toLocaleString("en-US", { timeZone: "America/New_York" })
  );
  return { startDate, endDate };
}

// Main function to render the UI. Call this after auto-scroll completes.
export function renderUI(startDate, endDate, textInputDevices) {
  const { data, dateData, utterances } = processEntries(startDate, endDate, textInputDevices);
  // Expose data for use in viewSubtractions.
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
  btnCopy.addEventListener("click", () => {
    const report = copyFullAudit(data, dateData, utterances, textInputDevices);
    navigator.clipboard.writeText(report).then(() => alert("Copied Full Report!"));
  });
  container.appendChild(btnCopy);

  // Close button.
  const btnClose = document.createElement("button");
  btnClose.textContent = "Close";
  btnClose.style = "width:100%;padding:5px;margin-top:5px;cursor:pointer;";
  btnClose.addEventListener("click", () => {
    container.remove();
    const devicePanel = document.getElementById("deviceOverviewPanel");
    if (devicePanel) devicePanel.remove();
  });
  container.appendChild(btnClose);
  document.body.appendChild(container);

  // Render Device Overview Panel.
  renderDeviceOverviewPanel(data, textInputDevices);

  // Update counts when device filter changes.
  select.addEventListener("change", () => {
    renderCategoryCounts(data, dateData, utterances, textInputDevices, select.value, categoryDiv);
  });
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
  const singleCount = utterances.filter(u =>
    u.category === "Subtractions" &&
    (device === "All Devices" || u.device === device) &&
    !(u.lowerText.includes("tap /") && textInputDevices[u.device]) &&
    u.includeInReport
  ).length;
  const sysCount = utterances.filter(u =>
    u.category === "System Replacements" &&
    (device === "All Devices" || u.device === device) &&
    u.includeInReport
  ).length;

  // Escape single quotes in device names
  const escapedDevice = device.replace(/'/g, "\\'");
  
  // Create a container for the Single word subtractions view.
  const singleContainer = document.createElement("div");
  singleContainer.innerHTML = `&nbsp;&nbsp;Single word - ${singleCount} `;
  const singleViewBtn = document.createElement("small");
  singleViewBtn.style.color = "blue";
  singleViewBtn.style.cursor = "pointer";
  singleViewBtn.textContent = "(view)";
  singleViewBtn.addEventListener("click", () => {
    viewSubtractions("Subtractions", device);
  });
  singleContainer.appendChild(singleViewBtn);
  container.appendChild(singleContainer);
  
  // Create a container for the System Replacements view.
  const sysContainer = document.createElement("div");
  sysContainer.innerHTML = `&nbsp;&nbsp;System Replacements - ${sysCount} `;
  const sysViewBtn = document.createElement("small");
  sysViewBtn.style.color = "blue";
  sysViewBtn.style.cursor = "pointer";
  sysViewBtn.textContent = "(view)";
  sysViewBtn.addEventListener("click", () => {
    viewSubtractions("System Replacements", device);
  });
  sysContainer.appendChild(sysViewBtn);
  container.appendChild(sysContainer);
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
    checkbox.addEventListener("change", () => {
      textInputDevices[d] = checkbox.checked;
      // Re-render counts.
      const device = document.getElementById("deviceFilter").value;
      const catDiv = document.getElementById("categoryCounts");
      renderCategoryCounts(data, window.__countBookmarkletData.dateData, window.__countBookmarkletData.utterances, textInputDevices, device, catDiv);
    });
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
  devCopy.addEventListener("click", () => {
    const txt = copyDevices(data);
    navigator.clipboard.writeText(txt).then(() => alert("Copied Devices!"));
  });
  panel.appendChild(devCopy);
  document.body.appendChild(panel);
}

// Expose viewSubtractions so external calls can use it.
export function viewSubtractions(category, filterDevice) {
  const { utterances, textInputDevices } = window.__countBookmarkletData;
  let panel = document.createElement("div");
  panel.style =
    "position:fixed;top:100px;left:50px;width:400px;max-height:80%;overflow:auto;padding:10px;background:#fff;z-index:100000;border:2px solid #000;border-radius:5px;";
  panel.innerHTML = `<b>${category} for ${filterDevice}</b><hr>`;
  let list = utterances.filter(u =>
    u.category === category && (filterDevice === "All Devices" || u.device === filterDevice)
  );
  if (category === "Subtractions") {
    list = list.filter(u => !(u.lowerText.includes("tap /") && textInputDevices[u.device]));
  }
  list.forEach(u => {
    const div = document.createElement("div");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = u.includeInReport;
    checkbox.addEventListener("change", () => {
      u.includeInReport = checkbox.checked;
      // Update the main counts.
      const catDiv = document.getElementById("categoryCounts");
      const device = document.getElementById("deviceFilter").value;
      renderCategoryCounts(window.__countBookmarkletData.data, window.__countBookmarkletData.dateData, window.__countBookmarkletData.utterances, window.__countBookmarkletData.textInputDevices, device, catDiv);
    });
    div.appendChild(checkbox);
    const span = document.createElement("span");
    span.textContent = ` [${u.device}] ${u.text}`;
    div.appendChild(span);
    panel.appendChild(div);
  });
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "Close";
  closeBtn.style = "width:100%;padding:5px;margin-top:5px;cursor:pointer;";
  closeBtn.addEventListener("click", () => panel.remove());
  panel.appendChild(closeBtn);
  document.body.appendChild(panel);
}