(function (window) {
    "use strict";

    // Keep the base URL empty while the frontend and Web API are served by the same application.
    window.appConfig = Object.freeze({
        apiBaseUrl: window.location.protocol === "file:" ? "http://localhost:51234" : ""
    });
})(window);
