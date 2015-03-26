// init global parameters
window.list_checkTimer = null;
window.list_errorTimer = null;
window.list_checkTimerInterval = 5*60; // in seconds
window.list_checkErrorTryInterval = 10*60 // in seconds
window.list_maxResults = 9;

var BrowserAction = (function() {
    return {
        setBrowserAction: function(isAuth, text, color) {
            var image = (isAuth)?"images/icon38.png": "images/icon_off38.png";
            chrome.browserAction.setIcon({"path":image}, function(){});
            chrome.browserAction.setBadgeText({ "text": text });
            if (color) {
                chrome.browserAction.setBadgeBackgroundColor({ "color": color });
            }
        },

        getUnreadThreads: function(access_token, prev, success, error) {
            if (prev) {
                prev.call(this);
            }
            API.getInboxUnreadMailThreads(access_token, window.list_maxResults, function(result) {
                success.call(this, result);
            }, function(errmsg) {
                error.call(this, errmsg);
            });
        },

        checkUnreadThreads: function(access_token, success, error) {
            BrowserAction.getUnreadThreads(access_token, function() {
                BrowserAction.setBrowserAction(true, "...", "#777");
            }, function(result) {
                var list = JSON.parse(result);
                if (list["threads"]) {
                    var listBadge = list["threads"].length;
                    if (listBadge > 0) {
                        var symb = listBadge.toString();
                        symb = (listBadge < window.list_maxResults)?symb:symb+"+";
                        BrowserAction.setBrowserAction(true, symb, "#333");
                        if (success) {
                            success.call(this, list["threads"]);
                        }
                        return false;
                    }
                }
                BrowserAction.setBrowserAction(true, "", null);
                if (success) {
                    success.call(this, []);
                }
            }, function(errmsg) {
                BrowserAction.setBrowserAction(false, "", null);
                if (error) {
                    error.call(this, errmsg);
                }
            });
        }
    }
})();

// checks unread messages and refreshes token if necessary
function checkUnread(access_token) {
    BrowserAction.checkUnreadThreads(access_token, null, function(response) {
        OAuth.checkAndRefreshAccessToken(function(access_token) {
            BrowserAction.checkUnreadThreads(access_token, null, function(response) {
                OAuth.authorize(success, error);
            });
        }, function(response) {
            OAuth.authorize(success, error);
        });
    });
}

// clears timer
function clearTimer(timer) {
    clearInterval(timer);
    timer = null;
}

// success function for authorization
function success(access_token) {
    BrowserAction.setBrowserAction(true, "", null);
    BrowserAction.checkUnreadThreads(access_token, null, null);
    clearTimer(window.list_errorTimer);
    clearTimer(window.list_checkTimer);

    window.list_checkTimer = setInterval(
        function() {
            checkUnread(TokenStore.getAccessToken(oauth.client_id, oauth.scope));
        },
        window.list_checkTimerInterval*1000
    );
}

// error function for authorization
function error(errmsg) {
    BrowserAction.setBrowserAction(false, "", null);
    clearTimer(window.list_checkTimer);
    if (errmsg != null && errmsg["error"] != null) {
        // if access denied, do not try again
        if (errmsg["error"] == "access_denied") {
            return false;
        }
    }
    // otherwise try to reconnect
    if (!window.list_errorTimer) {
        window.list_errorTimer = setInterval(function() {
            console.log("Error occuried. Another try...");
            OAuth.authorize(success, error);
        }, window.list_checkErrorTryInterval);
    }
}

// set "off" icon and empty badge
BrowserAction.setBrowserAction(false, "", null);
// ...and add event listener
document.addEventListener('DOMContentLoaded', function () {
    OAuth.authorize(success, error);
});
