(function() {
    var id = "list_main";
    var body_id = "list_body";
    var openGmailId = "list_open_gmail";
    var refreshId = "list_refresh";

    var main = document.getElementById(id);
    HTMLConstruct.constructList(main);
    var body = document.getElementById(body_id);
    var openGmail = document.getElementById(openGmailId);
    openGmail.addEventListener("click", function(e) {
        chrome.tabs.create({"url": "https://mail.google.com/mail/"}, function(tab) {});
    });
    var refresh = document.getElementById(refreshId);
    refresh.addEventListener("click", function(e) {
        body.innerHTML = "";
        HTMLConstruct.createElement("div", null, "refresh centered vMargined_normal", null, body);
        List.authorize(function(access_token) {
            getThreadsInfo.call(this, access_token, constructPopup);
        }, error);
    });

    List.authorize(function(access_token) {
        getThreadsInfo.call(this, access_token, constructPopup);
    }, error);

    var constructPopup = function(b) {
        var parent = body;
        parent.innerHTML = "";
        if (b == null || b.length == 0) {
            console.log("Empty");
            HTMLConstruct.createElement("div", null, "empty centered vMargined_normal", null, parent);
        } else {
            for (var i=0; i<b.length; i++) {
                if (b[i].HTTP_RESPONSE.status != 200) {
                    throw ("Error: batch request failed");
                }
            }
            // 1 - labels
            var data = JSON.parse(b[0].data);
            HTMLConstruct.updateLabelList(data.labels);
            // 2 - threads
            for (var i=1; i<b.length; i++) {
                var thread = JSON.parse(b[i].data);
                HTMLConstruct.constructThreadItem(thread, parent);
            }
        }
    }
})();
