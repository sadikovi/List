var API = (function() {
    var messagesURL = "https://www.googleapis.com/gmail/v1/users/me/messages";

    return {
        getInboxUnreadMail: function(access_token, maxResults, callback) {
            var url = OAuthScheme.addURLParam(messagesURL, "access_token", access_token);
            url = OAuthScheme.addURLParam(url, "maxResults", maxResults);
            url = OAuthScheme.addURLParam(url, "labelIds", "INBOX");
            url = OAuthScheme.addURLParam(url, "labelIds", "UNREAD");
            OAuthScheme.sendRequest("GET", url, {}, "", function(xhr, data) {
                if (xhr.readyState == 4) {
                    callback.call(this, xhr, data);
                }
            });
        }
    }
})();
