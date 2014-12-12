var API_SYS_LABELS = {
    Inbox: "INBOX",
    Unread: "UNREAD"
};

var API_TABS = {
    Important: "IMPORTANT",
    Personal: "CATEGORY_PERSONAL",
    Social: "CATEGORY_SOCIAL",
    Promotions: "CATEGORY_PROMOTIONS"
};

var API = (function() {
    var messagesURL = "https://www.googleapis.com/gmail/v1/users/me/messages";
    var threadsURL = "https://www.googleapis.com/gmail/v1/users/me/threads";

    return {
        getInboxUnreadMailThreads: function(access_token, maxResults, callback) {
            var url = OAuthScheme.addURLParam(threadsURL, "access_token", access_token);
            url = OAuthScheme.addURLParam(url, "maxResults", maxResults);
            url = OAuthScheme.addURLParam(url, "fields", "resultSizeEstimate,threads/id");
            url = API.searchTabs(url, [API_SYS_LABELS.Inbox, API_SYS_LABELS.Unread]);
            OAuthScheme.sendRequest("GET", url, {}, "", function(xhr, data) {
                if (xhr.readyState == 4) {
                    callback.call(this, xhr, data);
                }
            });
        },

        searchTabs: function(url, tabs) {
            if (tabs && tabs.length > 0) {
                for (var i=0; i<tabs.length; i++) {
                    url = OAuthScheme.addURLParam(url, "labelIds", tabs[i]);
                }
            }
            return url;
        }
    }
})();
