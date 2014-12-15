(function() {
    document.getElementById("opengmail").addEventListener("click", function(e) {
        chrome.tabs.create({"url":"https://mail.google.com/mail/"}, function(tab){});
    });
    var w = chrome.extension.getBackgroundPage();
    var access_token = w.TokenStore.getAccessToken(w.oauth.client_id, w.oauth.scope);
    w.checkUnread(access_token);
})();
