let authorization = "EMPTY";

// get authorization cookie
chrome.cookies.get(
  { url: "https://vercel.com", name: "authorization" },
  (cookie) => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      return;
    }

    console.log("Authorization Cookie:", cookie);
    authorization = cookie.value;
  }
);

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  sendResponse(authorization);
});
