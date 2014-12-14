var oauth = {
    request_url: 'https://accounts.google.com/o/oauth2/auth',
    exchange_url: 'https://www.googleapis.com/oauth2/v3/token',
    check_url: 'https://www.googleapis.com/oauth2/v1/tokeninfo',
    client_id: '899698234228-oglo18hbuvmardiq25b5saode9gotsdd.apps.googleusercontent.com',
    client_secret: 'Z6qHj8YGshHKpGV7kaUydit_',
    scope: 'https://www.googleapis.com/auth/gmail.modify',
    response_type: 'code',
    redirect_uri: 'http://localhost/'
};

var List = (function() {
    return {
        constructRequestURL: function(params) {
            var url = params.request_url;
            url = ReqManager.addURLParam(url, "redirect_uri", params.redirect_uri);
            url = ReqManager.addURLParam(url, "client_id", params.client_id);
            url = ReqManager.addURLParam(url, "scope", params.scope);
            url = ReqManager.addURLParam(url, "response_type", params.response_type);
            return url;
        },

        setIcon: function(isAuth) {
            var image = (isAuth)?"images/icon19.png": "images/icon38-off.png";
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
                List.checkAccessToken(success, function(response) {
                    var refresh_token = TokenStore.getRefreshToken(oauth.client_id, oauth.scope);
                    List.getAccessToken(true, oauth.exchange_url, refresh_token, oauth, success, error);
                });
            } else {
                List.initAuthFlow(success, error);
            }
        },

        deauthorize: function(callback) {
            TokenStore.clearTokens(oauth.client_id, oauth.scope);
        },

        initAuthFlow: function(success, error) {
            var url = List.constructRequestURL(oauth);
            var tabs = {};
            chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
                if (tabs["active"] && tabs["active"] == tab.id && changeInfo.url
                    && ReqManager.getUrl(changeInfo.url) == oauth.redirect_uri) {
                    var decoded = ReqManager.getQueryStringParams(changeInfo.url);
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

            ReqManager.sendRequest("POST", url, headers, ReqManager.formEncode(body), function(xhr, data) {
                List.onAccessToken.call(this, xhr, data, success, error);
            });
        },

        onAccessToken: function(xhr, data, success, error) {
            if (xhr.readyState == 4) {
                if (xhr.status == 200) {
                    var res = JSON.parse(xhr.responseText);
                    TokenStore.setAccessToken(res.access_token, oauth.client_id, oauth.scope);
                    if (res.refresh_token) {
                        TokenStore.setRefreshToken(res.refresh_token, oauth.client_id, oauth.scope);
                    }
                    var access_token = TokenStore.getAccessToken(oauth.client_id, oauth.scope);
                    success.call(this, access_token);
                } else {
                    error.call(this, xhr.responseText);
                }
            }
        },

        checkAccessToken: function(success, error) {
            var access_token = TokenStore.getAccessToken(oauth.client_id, oauth.scope);
            var refresh_token = TokenStore.getRefreshToken(oauth.client_id, oauth.scope);
            var url = ReqManager.addURLParam(oauth.check_url, "access_token", access_token);
            ReqManager.sendRequest("GET", url, {}, "", function(xhr, data) {
                if (xhr.readyState == 4) {
                    if (xhr.status == 200) {
                        var res = JSON.parse(xhr.responseText);
                        if (res.expires_in > 0) {
                            success.call(this, access_token);
                            return;
                        }
                    }
                    error.call(this, xhr.responseText);
                }
            });
        }
    }
})();

/******************************/
/*******  Start loading *******/
/******************************/
function setupGlobal() {
    window.list_allowRefreshToken = true;
    window.list_allowCheckTimer = true;
    window.list_checkTimer = null;
    window.list_checkTimerInterval = 5*60; // in seconds
}
setupGlobal();

// get unread threads
function getUnreadThreads(access_token, prev, success, error) {
    var maxResults = 5;
    prev.call(this);
    API.getInboxUnreadMailThreads(access_token, maxResults, function(xhr, data) {
        if (xhr.readyState == 4) {
            if (xhr.status == 200) {
                success.call(this, xhr.responseText);
                return false;
            }
            error.call(this, xhr.responseText);
        }
    });
}

function checkUnreadThreads(access_token, success, error) {
    getUnreadThreads(access_token, function() {
        List.setBadge("...", "#777");
    }, function(result) {
        var list = JSON.parse(result);
        if (list["threads"]) {
            var estimatedResults = list["resultSizeEstimate"];
            var listBadge = list["threads"].length;
            if (listBadge > 0) {
                List.setIcon(true);
                List.setBadge(""+listBadge+((listBadge >= estimatedResults)?"":"+"), "#333");
                if (success) {
                    success.call(this, list["threads"]);
                }
                return false;
            }
        }
        List.setBadge("");
        if (success) {
            success.call(this, []);
        }
    }, function(errmsg) {
        List.setBadge("");
        if (error) {
            error.call(this, errmsg);
        }
        console.log("Error: " + errmsg);
    });
}

function getThreadsInfo(access_token, callback) {
    checkUnreadThreads(access_token, function(threads) {
        if (threads && threads.length > 0) {
            var parts = [];
            // fetch labels
            var labels = {
                content_type: "application/http",
                method: "GET",
                url: ReqManager.addURLParam(API_URLS.labels, "fields", "labels(id,name,type)")
            }
            parts.push(labels);
            // fetch threads
            for (var i=0; i<threads.length; i++) {
                var t = {
                    content_type: "application/http",
                    method: "GET",
                    url: ReqManager.addURLParam(API_URLS.threads+"/"+threads[i].id, "fields", "id,messages(id,labelIds,payload(headers),snippet)")
                };
                parts.push(t);
            }
            // send batch request
            API.sendBatchRequest(API_URLS.batch, access_token, parts, function(b) {
                callback.call(this, b);
            }, function(errmsg) {
                callback.call(this, null);
                console.log(errmsg)
            });
        } else {
            callback.call(this, null);
            console.log("Threads are empty");
        }
    }, function(errmsg) {
        console.log("Error: " + errmsg);
    });
}

// functions that are called in authorize
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
