// src/autoscroll.js
export function autoScrollAndLoad(callback) {
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
