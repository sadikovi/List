var oauth = {
    request_url: 'https://accounts.google.com/o/oauth2/auth',
    exchange_url: 'https://www.googleapis.com/oauth2/v3/token',
    client_id: '899698234228-oglo18hbuvmardiq25b5saode9gotsdd.apps.googleusercontent.com',
    client_secret: 'Z6qHj8YGshHKpGV7kaUydit_',
    scope: 'https://www.googleapis.com/auth/gmail.readonly',
    response_type: 'code',
    redirect_uri: 'http://localhost/'
};

var List = (function() {
    return {
        constructRequestURL: function(params) {
            var url = params.request_url;
            url = OAuthScheme.addURLParam(url, "redirect_uri", params.redirect_uri);
            url = OAuthScheme.addURLParam(url, "client_id", params.client_id);
            url = OAuthScheme.addURLParam(url, "scope", params.scope);
            url = OAuthScheme.addURLParam(url, "response_type", params.response_type);
            return url;
        },

        setIcon: function(isAuth) {
            var image = (isAuth)?"icon19.png": "icon38-off.png";
            chrome.browserAction.setIcon({"path":image}, function(){});
        },

        setBadge: function(text, color) {
            chrome.browserAction.setBadgeText({ "text": text });
            if (color) {
                chrome.browserAction.setBadgeBackgroundColor({ "color": color });
            }
        },

        authorize: function(success, error) {
            if (TokenStore.hasToken(oauth.client_id, oauth.scope)) {
                var access_token = TokenStore.getAccessToken(oauth.client_id, oauth.scope);
                success.call(this, access_token);
            } else {
                List.initAuthFlow(success, error);
            }
        },

        initAuthFlow: function(success, error) {
            var url = List.constructRequestURL(oauth);
            var tabs = {};
            chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
                if (tabs["active"] && tabs["active"] == tab.id && changeInfo.url
                    && OAuthScheme.getUrl(changeInfo.url) == oauth.redirect_uri) {
                    var decoded = OAuthScheme.getQueryStringParams(changeInfo.url);
                    if (decoded["code"] && !decoded["error"]) {
                        List.getAccessToken(false, oauth.exchange_url, decoded["code"], oauth, success, error);
                    } else if (!decoded["code"] || decoded["error"]) {
                        error.call(this, decoded);
                    }
                    chrome.tabs.remove(tab.id);
                }
            });

            chrome.tabs.create({"url": url}, function(tab) {
                tabs["active"] = tab.id;
            });
        },

        getAccessToken: function(isRefresh, url, code, params, success, error) {
            var headers = {
                "Content-Type": "application/x-www-form-urlencoded"
            };

            var body = {
                "client_id": params.client_id,
                "client_secret": params.client_secret
            };

            if (isRefresh) {
                body["refresh_token"] = code;
                body["grant_type"] = "refresh_token";
            } else {
                body["code"] = code;
                body["grant_type"] = "authorization_code";
                body["redirect_uri"] = params.redirect_uri;
            }

            OAuthScheme.sendRequest("POST", url, headers, OAuthScheme.formEncode(body), function(xhr, data) {
                List.onAccessToken.call(this, xhr, data, success, error);
            });
        },

        onAccessToken: function(xhr, data, success, error) {
            if (xhr.readyState == 4) {
                if (xhr.status == 200) {
                    var res = JSON.parse(xhr.responseText);
                    TokenStore.setAccessToken(res.access_token, oauth.client_id, oauth.scope);
                    TokenStore.setRefreshToken(res.refresh_token, oauth.client_id, oauth.scope);
                    var access_token = TokenStore.getAccessToken(oauth.client_id, oauth.scope);
                    success.call(this, access_token);
                } else {
                    error.call(this, xhr.responseText);
                }
            }
        }
    }
})();

/******************************/
/*******  Start loading *******/
/******************************/
window.list_allowRefreshToken = true;
window.list_allowCheckTimer = true;
window.list_checkTimer = null;
window.list_checkTimerInterval = 5*60;

function checkUnreadThreads(access_token) {
    var maxResults = 5;
    List.setBadge("...", "#777");
    API.getInboxUnreadMailThreads(access_token, maxResults, function(xhr, data) {
        if (xhr.status == 200) {
            var list = JSON.parse(xhr.responseText);
            if (list["threads"]) {
                var estimatedResults = list["resultSizeEstimate"];
                var listBadge = list["threads"].length;
                if (listBadge > 0) {
                    List.setIcon(true);
                    List.setBadge(""+listBadge+((listBadge >= estimatedResults)?"":"+"), "#333");
                    return false;
                }
            }
        } else if (xhr.status == 401 && window.list_allowRefreshToken) {
            window.list_allowRefreshToken = false;
            List.getAccessToken(true, oauth.exchange_url, TokenStore.getRefreshToken(oauth.client_id, oauth.scope), oauth,
                function(access_token) {
                    checkUnreadThreads(access_token);
                    window.list_allowRefreshToken = true;
                    return false;
                }
            );
        }
        List.setBadge("");
    });
}

// set "off" icon and empty badge
List.setIcon(false);
List.setBadge("");

function success(access_token) {
    List.setIcon(true);
    checkUnreadThreads(access_token);
    if (window.list_allowCheckTimer) {
        window.checkTimer = setInterval(function() {
            checkUnreadThreads(access_token);
        }, window.list_checkTimerInterval*1000);
        window.list_allowCheckTimer = false;
    }
}

function error(error) {
    List.setIcon(false);
    List.setBadge("");
    console.log(error);
}

document.addEventListener('DOMContentLoaded', function () {
    List.authorize(success, error);
});

chrome.browserAction.onClicked.addListener(function() {
    List.authorize(success, error);
});
