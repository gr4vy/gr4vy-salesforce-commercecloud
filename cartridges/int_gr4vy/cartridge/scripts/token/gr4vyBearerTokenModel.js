'use strict';
var gr4vyTokenHelper = require('*/cartridge/scripts/token/helper/gr4vyTokenHelper');
var gr4vyConstants = require('*/cartridge/scripts/util/gr4vyConstants');

/**
 * Constructor function
 */
function Gr4vyBearerToken() {
}

Gr4vyBearerToken.prototype.generate = function () {
    var data = {};
    data.scopes = gr4vyConstants.BEARER_TOKEN_SCOPE;
    return gr4vyTokenHelper.generateToken(data);
};

module.exports = Gr4vyBearerToken;
