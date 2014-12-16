(function() {
    var w = chrome.extension.getBackgroundPage();
    chrome.browserAction.setPopup({"popup":"popup.html"});
    if (!w.TokenStore.hasToken(w.oauth.client_id, w.oauth.scope)) {
        w.OAuth.authorize(w.success, w.error);
    } else {
        document.getElementById("opengmail").addEventListener("click", function(e) {
            chrome.tabs.create({"url":"https://mail.google.com/mail/"}, function(tab){});
        });
        document.getElementById("logout").addEventListener("click", function(e) {
            w.OAuth.deauthorize(function() {
                w.BrowserAction.setBrowserAction(false, "");
            });
            chrome.tabs.create({"url":""}, function(tab) {
                chrome.tabs.remove(tab.id);
            });
        });

        var access_token = w.TokenStore.getAccessToken(w.oauth.client_id, w.oauth.scope);
        w.checkUnread(access_token);
    }
})();
