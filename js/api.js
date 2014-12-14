/**
* Gmail API system labels that are used to fetch unread messages (threads)
*/
var API_SYS_LABELS = {
    Inbox: "INBOX",
    Unread: "UNREAD"
};

/**
* Gmail API labels that are represented as tabs in inbox
*/
var API_TABS = {
    Important: "IMPORTANT",
    Personal: "CATEGORY_PERSONAL",
    Social: "CATEGORY_SOCIAL",
    Promotions: "CATEGORY_PROMOTIONS"
};

/**
* Gmail API urls
*/
var API_URLS = {
    batch: "https://www.googleapis.com/batch",
    messages: "https://www.googleapis.com/gmail/v1/users/me/messages",
    threads: "https://www.googleapis.com/gmail/v1/users/me/threads",
    labels: "https://www.googleapis.com/gmail/v1/users/me/labels"
};

var API = (function() {
    return {
        /**
        * Sends and receives request to fetch unread mail threads.
        * @param {String} access_token A valid access token for authentication.
        * @param {int} maxResults A number represents maximum results to be fetched.
        * @param {Function} success A callback function for a successful response.
        * @param {Function} error A callback function for a failed response.
        */
        getInboxUnreadMailThreads: function(access_token, maxResults, success, error) {
            var url = ReqManager.addURLParam(API_URLS.threads, "access_token", access_token);
            url = ReqManager.addURLParam(url, "maxResults", maxResults);
            url = ReqManager.addURLParam(url, "fields", "resultSizeEstimate,threads/id");
            url = API.searchTabs(url, [API_SYS_LABELS.Inbox, API_SYS_LABELS.Unread]);
            ReqManager.sendRequest("GET", url, {}, "", function(xhr, data) {
                if (xhr.readyState == 4) {
                    if (xhr.status == 200) {
                        success.call(this, xhr.responseText);
                        return false;
                    }
                    error.call(this, xhr.responseText);
                }
            });
        },

        /**
        * Helper function to append searchable labels to the url.
        * @param {String} url An URL which may or may not contain querystring values.
        * @param {String} tabs An array containing labels.
        * @return {String} The URL with URL-encoded versions of the key and value
        *     appended, prefixing them with "&" or "?" as needed.
        */
        searchTabs: function(url, tabs) {
            if (tabs && tabs.length > 0) {
                for (var i=0; i<tabs.length; i++) {
                    url = ReqManager.addURLParam(url, "labelIds", tabs[i]);
                }
            }
            return url;
        },

        /**
        * Prepares and sends batch request.
        * @param {String} url An URL which may or may not contain querystring values.
        * @param {String} access_token A valid access token for authentication.
        * @param {Array}  parts An array of objects to be converted into sub-requests.
        * @param {Function}  success A callback function for successful response.
        * @param {Function}  error A callback function for failed response.
        */
        sendBatchRequest: function(url, access_token, parts, success, error) {
            var boundary = "batch_request_part";
            var headers = {
                "Content-Type": "multipart/mixed; boundary="+boundary,
                "Authorization": "Bearer "+access_token
            };
            var body = ReqManager.buildBatchRequestBody(parts);
            ReqManager.sendRequest("POST", url, headers, body, function(xhr, data) {
                if (xhr.readyState == 4) {
                    if (xhr.status == 200) {
                        var contentType = xhr.getResponseHeader("Content-Type");
                        if (contentType) {
                            var typeObj = API.parseHeader(contentType);
                            if (typeObj && typeObj.boundary) {
                                var a = xhr.responseText.split("--"+typeObj.boundary);
                                var b = [];
                                for (var i=0; i<a.length; i++) {
                                    var body = API.parseResponseBody(a[i]);
                                    if (body.HTTP_RESPONSE) {
                                        b.push(body);
                                    }
                                }
                                success.call(this, b);
                                return false;
                            }
                        }
                    }
                    error.call(this, xhr.responseText);
                }
            });
        },

        /**
        * Helper function to parse sub-requests that are returned in reponse body.
        * @param {String} body A response body of sub-request
        * @return {Object} The parsed object containing headers, response status/message and data.
        */
        parseResponseBody: function(body) {
            var obj = {};
            var prev = 0, index = 0, lastIndex = body.lastIndexOf("\n");
            while (true) {
                index = body.indexOf("\n", prev);
                if (index <= 0 || index >= lastIndex) {
                    break;
                }
                var el = body.substring(prev, index);
                var a = el.split(": ");
                if (a.length == 2) {
                    obj[a[0]] = a[1];
                } else {
                    if (el.indexOf("HTTP/1") >= 0) {
                        var http = el.split(" ");
                        if (http.length >= 3) {
                            obj["HTTP_RESPONSE"] = {
                                "version": http[0],
                                "status": +http[1],
                                "message": http.splice(2, 2).join(" ")
                            };
                        }
                    } else if (el == "{" || el == "<") {
                        obj["data"] = body.substring(prev);
                        index = lastIndex;
                    }
                }
                prev = ++index;
            }
            return obj;
        },

        /**
        * Helper function to parse key-multivalue pair, separated by ";".
        * @param {String} url A request/response header.
        * @return {Object} The object that contains all the header options.
        */
        parseHeader: function(header) {
            var a = header.split(";");
            var b = {};
            for (var i=0; i<a.length; i++) {
                var t = a[i].trim().split("=");
                if (t.length == 2) {
                    b[t[0]] = t[1];
                } else {
                    b["param"+i] = t[0];
                }
            }
            return b;
        }
    }
})();
