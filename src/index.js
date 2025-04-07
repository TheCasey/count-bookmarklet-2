// src/index.js
import { autoScrollAndLoad } from "./autoscroll.js";
import { renderUI } from "./ui.js";

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
