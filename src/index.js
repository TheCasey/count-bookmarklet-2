// src/index.js
import { autoScrollAndLoad } from "./autoscroll.js";
import { renderUI } from "./ui.js";

// Helper function to read filter dates from the page.
// It expects two elements with IDs "#date-start" and "#date-end".
// It converts the values to Date objects set to 8:00 PM ET (start)
// and 6:00 PM ET (end), respectively.
function getFilterDates() {
  const s = document.querySelector("#date-start");
  const e = document.querySelector("#date-end");
  if (!s || !e) {
    alert("Could not find filter range on page.");
    return { startDate: null, endDate: null };
  }
  const currentYear = new Date().getFullYear();
  // Append the current year if the input length is short.
  const startInput = s.value.length < 10 ? s.value + "/" + currentYear : s.value;
  const endInput = e.value.length < 10 ? e.value + "/" + currentYear : e.value;
  // Create Date objects with forced times: 8:00 PM for start and 6:00 PM for end in ET.
  const startDate = new Date(
    new Date(startInput + " 20:00:00").toLocaleString("en-US", { timeZone: "America/New_York" })
  );
  const endDate = new Date(
    new Date(endInput + " 18:00:00").toLocaleString("en-US", { timeZone: "America/New_York" })
  );
  return { startDate, endDate };
}

// Immediately invoked initialization function.
(function () {
  const { startDate, endDate } = getFilterDates();
  const textInputDevices = {}; // Initially empty; devices can be marked via the UI.
  autoScrollAndLoad(() => {
    renderUI(startDate, endDate, textInputDevices);
  });
})();