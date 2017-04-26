var nodeFetch = require("node-fetch");

var fetch = nodeFetch;
if (typeof window === "object" && typeof window.fetch === "function") {
    fetch = window.fetch;
}

var https = require("https");
var ntlm = require("httpntlm").ntlm;

var keepAlive = new https.Agent({ keepAlive: true });

function ntlmHandshake(url, authOpts) {
    return fetch(url, {
        headers: {
            Connection: "keep-alive",
            Authorization: ntlm.createType1Message(authOpts)
        },
        agent: keepAlive
    })
    .then(function (response) {
        return response.headers.get("www-authenticate");
    })
    .then(function (auth) {
        if (!auth) {
            throw new Error("Stage 1 NTLM handshake failed.");
        }

        var type2 = ntlm.parseType2Message(auth);

        return ntlm.createType3Message(type2, authOpts);
    });
}

module.exports = function request(url, options) {
    if (options.auth.authType === "ntlm") {
        return ntlmHandshake(url, options.auth)
            .then(function (auth) {
                options.headers.Authorization = auth;
                options.headers.Connection = "Close";
                options.agent = keepAlive;

                return fetch(url, options);
            });
    } else {
        return fetch(url, options);
    }
};
