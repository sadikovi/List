var ReqManager = (function() {
    return {
        /**
        * Encodes a value according to the RFC3986 specification.
        * @param {String} val The string to encode.
        */
        toRfc3986: function(val){
            return encodeURIComponent(val)
            .replace(/\!/g, "%21")
            .replace(/\*/g, "%2A")
            .replace(/'/g, "%27")
            .replace(/\(/g, "%28")
            .replace(/\)/g, "%29");
        },

        /**
        * Decodes a string that has been encoded according to RFC3986.
        * @param {String} val The string to decode.
        */
        fromRfc3986: function(val){
            var tmp = val
            .replace(/%21/g, "!")
            .replace(/%2A/g, "*")
            .replace(/%27/g, "'")
            .replace(/%28/g, "(")
            .replace(/%29/g, ")");
            return decodeURIComponent(tmp);
        },

        /**
        * Adds a key/value parameter to the supplied URL.
        * @param {String} url An URL which may or may not contain querystring values.
        * @param {String} key A key
        * @param {String} value A value
        * @return {String} The URL with URL-encoded versions of the key and value
        *     appended, prefixing them with "&" or "?" as needed.
        */
        addURLParam: function(url, key, value) {
            var sep = (url.indexOf('?') >= 0) ? "&" : "?";
            return url + sep + ReqManager.toRfc3986(key) + "=" + ReqManager.toRfc3986(value);
        },

        /**
        * returns clear URL without get parameters
        * @param {String} url An URL which may or may not contain querystring values.
        * @return {String} The URL without key-value pairs
        */
        getUrl: function(url) {
            var t = url.indexOf("?");
            return (t>0)?url.substring(0, t):url;
        },

        /**
        * Decodes a URL-encoded string into key/value pairs.
        * @param {String} encoded An URL-encoded string.
        * @return {Object} An object representing the decoded key/value pairs found
        *     in the encoded string.
        */
        formDecode: function(encoded) {
            var params = encoded.split("&");
            var decoded = {};
            for (var i = 0, param; param = params[i]; i++) {
                var keyval = param.split("=");
                if (keyval.length == 2) {
                    var key = ReqManager.fromRfc3986(keyval[0]);
                    var val = ReqManager.fromRfc3986(keyval[1]);
                    decoded[key] = val;
                }
            }
            return decoded;
        },

        /**
        * Encodes a object with key-value pairs into URL-encoded string.
        * @param {Object} decoded An object to encode.
        * @return {String} An encoded string of key-value pairs.
        */
        formEncode: function(decoded) {
            var pairs = [];
            var a = Object.keys(decoded);
            for (var i=0; i<a.length; i++)  {
                pairs.push(ReqManager.toRfc3986(a[i])+"="+ReqManager.toRfc3986(decoded[a[i]]));
            }
            return pairs.join("&");
        },

        /**
        * Returns the current window's querystring decoded into key/value pairs.
        * @param {String} url An URL-encoded string.
        * @return {Object} A object representing any key/value pairs found in the
        *     current window's querystring.
        */
        getQueryStringParams: function(url) {
            var urlparts = url.split("?");
            if (urlparts.length >= 2) {
                var querystring = urlparts.slice(1).join("?");
                return ReqManager.formDecode(querystring);
            }
            return {};
        },

        /**
         * Sends an HTTP request.  Convenience wrapper for XMLHttpRequest calls.
         * @param {String} method The HTTP method to use.
         * @param {String} url The URL to send the request to.
         * @param {Object} headers Optional request headers in key/value format.
         * @param {String} body Optional body content.
         * @param {Function} callback Function to call when the XMLHttpRequest's
         *     ready state changes.  See documentation for XMLHttpRequest's
         *     onreadystatechange handler for more information.
         */
        sendRequest: function(method, url, headers, body, callback) {
            var xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function(data) {
                callback(xhr, data);
            };
            xhr.open(method, url, true);
            if (headers) {
                for (var header in headers) {
                    if (headers.hasOwnProperty(header)) {
                        xhr.setRequestHeader(header, headers[header]);
                    }
                }
            }
            xhr.send(body);
        },

        /**
        * Constructs batch request body using array of parts. Each part is a String.
        * @param {String} parts Array of json objects to use.
        * @return {String} A body for the batch request.
        */
        buildBatchRequestBody: function(parts) {
            var se = "\n--batch_request_part";
            var endse = se+"--";
            var a = [];
            for (var i=0; i<parts.length; i++) {
                a.push(se+ReqManager.getBatchRequestPart(parts[i]));
            }
            return a.join("")+endse;
        },

        //TODO: support POST requests
        /**
        * Returns string of the @json.
        * Each json has attributes: {content_type: "#", url: "#", method: "#"}.
        * @param {Object} part An object to convert into string.
        * @return {String} A string representation of the Object.
        */
        getBatchRequestPart: function(part) {
            return ("\n"+"Content-Type: "+ part.content_type+"\n\n"+part.method+" "+part.url+"\n");
        }
    }
})();
