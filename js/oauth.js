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

var OAuth = (function() {
    return {
        /**
        * Authrozes application to use gmail on behalf of the user.
        * @param {Function} success A callback function for successful authorization.
        * @param {Function} error A callback function for failed authorization.
        */
        authorize: function(success, error) {
            if (TokenStore.hasToken(oauth.client_id, oauth.scope)) {
                OAuth.checkAndRefreshAccessToken(success, error);
            } else {
                OAuth.initAuthFlow(success, error);
            }
        },

        /**
        * Deauthorizes application and uses callback function to clean up.
        * @param {Function} callback A callback function to clean up after clearing tokens.
        */
        deauthorize: function(callback) {
            TokenStore.clearTokens(oauth.client_id, oauth.scope);
            callback.call(this);
        },

        /**
        * Initializes auth flow. Sends requests to obtain code for access and refresh tokens.
        * @param {Function} success A callback function for successful authorization.
        * @param {Function} error A callback function for failed authorization.
        */
        initAuthFlow: function(success, error) {
            var url = ReqManager.addURLParam(oauth.request_url, "redirect_uri", oauth.redirect_uri);
            url = ReqManager.addURLParam(url, "client_id", oauth.client_id);
            url = ReqManager.addURLParam(url, "scope", oauth.scope);
            url = ReqManager.addURLParam(url, "response_type", oauth.response_type);

            var tabs = {};
            chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
                if (tabs["active"] && tabs["active"] == tab.id && changeInfo.url && ReqManager.getUrl(changeInfo.url) == oauth.redirect_uri) {
                    var decoded = ReqManager.getQueryStringParams(changeInfo.url);
                    if (decoded["code"] && !decoded["error"]) {
                        OAuth.getAccessToken(false, oauth.exchange_url, decoded["code"], oauth, success, error);
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

        /**
        * Sends request to exchange access and refresh tokens with code or refresh token in case of expiry.
        * @param {Boolean} isRefresh A flag to show whether it is echange with code or refresh token.
        * @param {String} url An url for the request to obtain both tokens.
        * @param {String} code A code that can be either authorization code or refresh token.
        * @param {Object} params An object with oauth params.
        * @param {Function} success A callback function for successful request.
        * @param {Function} error A callback function for failed request.
        */
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
                OAuth.onAccessToken.call(this, xhr, data, success, error);
            });
        },

        /**
        * Used as a callback function for obtaining tokens/refreshing access token.
        * @param {Object} xhr An XMLHttpRequest object.
        * @param {Object} data Raw request data.
        * @param {Function} success A callback function for successful request.
        * @param {Function} error A callback function for failed request.
        */
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

        /**
        * Checks access token stored in TokenStore by sending request to googleapis.
        *       If request returns 200 OK - no need to update token, otherwise, tells that token is invalid.
        * @param {Function} success A callback function for successful request.
        * @param {Function} error A callback function for failed request/refresh required.
        */
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
        },

        /**
        * Checks access token and refreshes it if necessary. If it is impossible to refresh error function called.
        * @param {Function} success A callback function for successful request - no refresh needed/new access token obtained.
        * @param {Function} error A callback function for failed request/refresh request.
        */
        checkAndRefreshAccessToken: function(success, error) {
            OAuth.checkAccessToken(success, function(response) {
                var refresh_token = TokenStore.getRefreshToken(oauth.client_id, oauth.scope);
                OAuth.getAccessToken(true, oauth.exchange_url, refresh_token, oauth, success, error);
            });
        }
    }
})();
