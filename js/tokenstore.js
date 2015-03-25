/*
* TokenStore manages access and refresh tokens
*
*/
var TokenStore = (function() {
    return {
        /**
        * Returns access token for client_id and scope.
        * @param {String} client_id A specific client_id for application.
        * @param {String} scope A scope that application obtained
        * @return {String} The access token for specific client_id and scope
        */
        getAccessToken: function(client_id, scope) {
            return localStorage[encodeURI(client_id)+encodeURI(scope)+"&access_token"];
        },

        /**
        * Stores access token for specific client_id and scope.
        * @param {String} token An access token obtained during OAuth.
        * @param {String} client_id A specific client_id for application.
        * @param {String} scope A scope that application obtained
        */
        setAccessToken: function(token, client_id, scope) {
            localStorage[encodeURI(client_id)+encodeURI(scope)+"&access_token"] = token;
        },

        /**
        * Returns refresh token for client_id and scope.
        * @param {String} client_id A specific client_id for application.
        * @param {String} scope A scope that application obtained
        * @return {String} The refresh token for specific client_id and scope
        */
        getRefreshToken: function(client_id, scope) {
            return localStorage[encodeURI(client_id)+encodeURI(scope)+"&refresh_token"];
        },

        /**
        * Stores refresh token for specific client_id and scope.
        * @param {String} token A refresh token obtained during OAuth.
        * @param {String} client_id A specific client_id for application.
        * @param {String} scope A scope that application obtained
        */
        setRefreshToken: function(token, client_id, scope) {
            localStorage[encodeURI(client_id)+encodeURI(scope)+"&refresh_token"] = token;
        },

        /**
        * Deletes all tokens for client_id and scope.
        * @param {String} client_id A specific client_id for application.
        * @param {String} scope A scope that application obtained
        */
        clearTokens: function(client_id, scope) {
            delete localStorage[encodeURI(client_id)+encodeURI(scope)+"&refresh_token"];
            delete localStorage[encodeURI(client_id)+encodeURI(scope)+"&access_token"];
        },

        hasToken: function(client_id, scope) {
            return !!localStorage[encodeURI(client_id)+encodeURI(scope)+"&access_token"];
        },

        hasBothTokens: function(client_id, scope) {
            hasAccessToken = !!localStorage[encodeURI(client_id)+encodeURI(scope)+"&access_token"];
            hasRefreshToken = !!localStorage[encodeURI(client_id)+encodeURI(scope)+"&refresh_token"];
            return hasAccessToken && hasRefreshToken;
        }
    }
})();
