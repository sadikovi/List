var HTMLConstruct = (function() {
    var labels = {};
    return {
        constructThreadItem: function(thread, parent) {
            if (!thread) {
                throw ("Message thread is undefined");
            }
            if (!parent) {
                throw ("Message parent is undefined");
            }

            var first = thread.messages[0];
            var last = thread.messages[thread.messages.length-1];
            var lids = first.labelIds;
            var snippet = last.snippet;

            var headers = last.payload.headers;
            var from = HTMLConstruct.searchPayloadhHeader(headers, "From");
            var subject = HTMLConstruct.searchPayloadhHeader(headers, "Subject");

            var item = HTMLConstruct.createElement("div", null, "list-item", null, parent);
            HTMLConstruct.createElement("div", null, "from font_small", from, item);
            HTMLConstruct.createElement("div", null, "subject font_normal", subject, item);
            HTMLConstruct.createElement("div", null, "snippet font_small", snippet, item);
            var table = HTMLConstruct.createElement("table", null, "controls", null, item);
            var tr = HTMLConstruct.createElement("tr", null, "", null, table);
            var tdl = HTMLConstruct.createElement("td", null, "hAlignLeft", null, tr);
            var tdr = HTMLConstruct.createElement("td", null, "hAlignRight", null, tr);
            var ldiv = HTMLConstruct.createElement("div", null, "labels", null, tdl);
            for (var i=0; i<lids.length; i++) {
                var lstyle = HTMLConstruct.labelForId(lids[i]);
                if (lstyle != null) {
                    HTMLConstruct.createElement("span", null, "label "+lstyle, labels[lids[i]].name, ldiv);
                }
            }
            var rdiv = HTMLConstruct.createElement("div", null, "actions", null, tdr);
            var vi = HTMLConstruct.createElement("button", null, "button simple font_small", "View in Gmail", rdiv);
            vi.addEventListener("click", function(e) {
                chrome.tabs.create({"url": "https://mail.google.com/mail/u/0/#inbox/"+thread.id}, function(tab) {});
            });
            return item;
        },

        constructList: function(parent) {
            if (!parent) {
                throw ("Parent is undefined");
            }
            // build header
            var header = HTMLConstruct.createElement("div", "list_header", "header hAlignRight", null, parent);
            HTMLConstruct.createElement("button", "list_refresh", "button simple font_small vMargined_small", "Refresh", header);
            // build body
            var body = HTMLConstruct.createElement("div", "list_body", "body vMargined_normal", null, parent);
            HTMLConstruct.createElement("div", null, "refresh centered vMargined_normal", null, body);
            // build footer
            var footer = HTMLConstruct.createElement("div", "list_footer", "footer hAlignCenter", null, parent);
            var og = HTMLConstruct.createElement("button", "list_open_gmail", "button simple container vMargined_small", "Open Gmail", footer);
        },

        searchPayloadhHeader: function(headers, name) {
            for (var i=0; i<headers.length; i++) {
                if (headers[i].name == name) {
                    return headers[i].value;
                }
            }
            return null;
        },

        updateLabelList: function(l) {
            labels = {};
            for (var i=0; i<l.length; i++) {
                if (l[i].type && l[i].type == "user") {
                    labels[l[i].id] = { index: i, name: l[i].name, type: l[i].type };
                }
            }
        },

        labelForId:function(id) {
            var num = 8;
            if (labels[id]) {
                var t = (labels[id].index % num);
                switch(t) {
                    case 0: return "label-black";
                    case 1: return "label-yellow";
                    case 2: return "label-green";
                    case 3: return "label-blue";
                    case 4: return "label-orange";
                    case 5: return "label-purple";
                    case 6: return "label-red";
                    case 7: return "label-teal";
                }
            }
            return null;
        },

        createElement: function(tagname, id, aClass, text, parent) {
            var element = document.createElement(tagname);
            if (aClass != null && aClass != "")
                element.className = aClass;
            if (id != null && id != "")
                element.id = id;
            if (text != null && text != "")
                element.innerHTML = text;
            if (parent)
                parent.appendChild(element);

            return element;
        }
    }
})();
