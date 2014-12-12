var oauth = {
    request_url: 'https://accounts.google.com/o/oauth2/auth',
    exchange_url: 'https://www.googleapis.com/oauth2/v3/token',
    client_id: '899698234228-oglo18hbuvmardiq25b5saode9gotsdd.apps.googleusercontent.com',
    client_secret: 'Z6qHj8YGshHKpGV7kaUydit_',
    scope: 'https://www.googleapis.com/auth/gmail.modify',
    response_type: 'code',
    redirect_uri: 'http://localhost/'
};

function constructRequestURL(params) {
    var url = params.request_url;
    url = OAuthScheme.addURLParam(url, "redirect_uri", params.redirect_uri);
    url = OAuthScheme.addURLParam(url, "client_id", params.client_id);
    url = OAuthScheme.addURLParam(url, "scope", params.scope);
    url = OAuthScheme.addURLParam(url, "response_type", params.response_type);
    return url;
}

function getAccessToken(isRefresh, url, code, params, onAccessToken) {
    // prepare request
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

    OAuthScheme.sendRequest("POST", url, headers, OAuthScheme.formEncode(body), onAccessToken);
}

function onAccessToken(xhr, data) {
    if (xhr.readyState == 4) {
        if (xhr.status == 200) {
            var res = JSON.parse(xhr.responseText);
            TokenStore.setAccessToken(res.access_token, oauth.client_id, oauth.scope);
            TokenStore.setRefreshToken(res.refresh_token, oauth.client_id, oauth.scope);
            var access_token = TokenStore.getAccessToken(oauth.client_id, oauth.scope);
            setIcon(true);
            checkUnreadMessages(access_token);
        }
    }
}

function setIcon(isAuth) {
    var image = (isAuth)?"icon19.png": "icon38-off.png";
    chrome.browserAction.setIcon({"path":image}, function(){});
}

function setBadge(text) {
    chrome.browserAction.setBadgeText({
        "text": text
    });
}

function deauthorize() {
    TokenStore.clearTokens(oauth.client_id, oauth.scope);
}

function authorize() {
    var url = constructRequestURL(oauth);
    var tabs = {};
    chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
        // check only when tab is the same and url matches redirect url from oauth
        if (tabs["active"] && tabs["active"] == tab.id && changeInfo.url && OAuthScheme.getUrl(changeInfo.url) == oauth.redirect_uri) {
            var decoded = OAuthScheme.getQueryStringParams(changeInfo.url);
            if (decoded["code"] && !decoded["error"]) {
                getAccessToken(false, oauth.exchange_url, decoded["code"], oauth, onAccessToken);
            }
            chrome.tabs.remove(tab.id);
        }
    });

    chrome.tabs.create({"url": url}, function(tab) {
        tabs["active"] = tab.id;
    });
}

function init() {
    // check first whether tokens are already stored in the system
    if (TokenStore.hasToken(oauth.client_id, oauth.scope)) {
        var access_token = TokenStore.getAccessToken(oauth.client_id, oauth.scope);
        // set active icon
        setIcon(true);
        // check messages
        checkUnreadMessages(access_token);
    } else {
        // otherwise authorize
        authorize();
    }
}

function checkUnreadMessages(access_token) {
    // lets call api
    var maxResults = 5;
    setBadge("...");
    API.getInboxUnreadMail(access_token, maxResults, function(xhr, data) {
        if (xhr.status == 200) {
            var list = JSON.parse(xhr.responseText);
            if (list["messages"]) {
                var estimatedResults = list["resultSizeEstimate"];
                var listBadge = list["messages"].length;
                if (listBadge > 0) {
                    setBadge(""+listBadge+((listBadge >= estimatedResults)?"":"+"));
                    return false;
                }
            }
        } else if (xhr.status == 401) {
            // access token expired
            // obtain new access token
            getAccessToken(true, oauth.exchange_url, TokenStore.getRefreshToken(oauth.client_id, oauth.scope), oauth, onAccessToken);
        }

        setBadge("");
    });
}

setIcon(false);
setBadge("");
chrome.browserAction.onClicked.addListener(init);
