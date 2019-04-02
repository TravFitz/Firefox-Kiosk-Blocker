browser.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.greeting === "back") {
            window.stop();
        }
    }
);