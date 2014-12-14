// init global parameters
window.list_allowRefreshToken = true;
window.list_allowCheckTimer = true;
window.list_checkTimer = null;
window.list_checkTimerInterval = 5*60; // in seconds
window.list_maxResults = 5;

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
                if (list["threads"] && list["resultSizeEstimate"]) {
                    var estimatedResults = list["resultSizeEstimate"];
                    var listBadge = list["threads"].length;
                    if (listBadge > 0) {
                        BrowserAction.setBrowserAction(true, ""+listBadge+((listBadge >= estimatedResults)?"":"+"), "#333");
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
                console.log("Error: " + errmsg);
            });
        }
    }
})();

// set "off" icon and empty badge
BrowserAction.setBrowserAction(false, "", null);
// and add event listener
document.addEventListener('DOMContentLoaded', function () {
    OAuth.authorize(
        function(access_token) {
            BrowserAction.setBrowserAction(true, "", null);
            BrowserAction.checkUnreadThreads(access_token, null, null);
            if (window.list_allowCheckTimer) {
                window.checkTimer = setInterval(function() {
                    BrowserAction.checkUnreadThreads(access_token, null, null);
                }, window.list_checkTimerInterval*1000);
                window.list_allowCheckTimer = false;
            }
        },
        function(errmsg) {
            BrowserAction.setBrowserAction(false, "", null);
            console.log(error);
        }
    );
});
