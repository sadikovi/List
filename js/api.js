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

var API_URLS = {
    batch: "https://www.googleapis.com/batch",
    messages: "https://www.googleapis.com/gmail/v1/users/me/messages",
    threads: "https://www.googleapis.com/gmail/v1/users/me/threads",
    labels: "https://www.googleapis.com/gmail/v1/users/me/labels"
};

var API = (function() {
    return {
        getInboxUnreadMailThreads: function(access_token, maxResults, callback) {
            var url = ReqManager.addURLParam(API_URLS.threads, "access_token", access_token);
            url = ReqManager.addURLParam(url, "maxResults", maxResults);
            url = ReqManager.addURLParam(url, "fields", "resultSizeEstimate,threads/id");
            url = API.searchTabs(url, [API_SYS_LABELS.Inbox, API_SYS_LABELS.Unread]);
            ReqManager.sendRequest("GET", url, {}, "", function(xhr, data) {
                if (xhr.readyState == 4) {
                    callback.call(this, xhr, data);
                }
            });
        },

        searchTabs: function(url, tabs) {
            if (tabs && tabs.length > 0) {
                for (var i=0; i<tabs.length; i++) {
                    url = ReqManager.addURLParam(url, "labelIds", tabs[i]);
                }
            }
            return url;
        },

        getLabels: function(access_token, callback) {
            var url = ReqManager.addURLParam(API_URLS.labels, "access_token", access_token);
            url = ReqManager.addURLParam(url, "fields", "labels(id,name,type)");
            ReqManager.sendRequest("GET", url, {}, "", function(xhr, data) {
                if (xhr.readyState == 4) {
                    callback.call(this, xhr, data);
                }
            });
        },

        getThread: function(access_token, id, callback) {
            var url = API_URLS.threads+"/"+id;
            var url = ReqManager.addURLParam(url, "access_token", access_token);
            url = ReqManager.addURLParam(url, "fields", "id,messages(id,labelIds,payload,snippet)");
            ReqManager.sendRequest("GET", url, {}, "", function(xhr, data) {
                if (xhr.readyState == 4) {
                    callback.call(this, xhr, data);
                }
            });
        },

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
