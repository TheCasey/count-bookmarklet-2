// src/filter.js
export function classifyUtterance(device, tElem, textInputDevices) {
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
