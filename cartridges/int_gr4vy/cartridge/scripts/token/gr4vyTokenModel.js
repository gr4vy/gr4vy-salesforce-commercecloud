'use strict';
var gr4vyTokenHelper = require('*/cartridge/scripts/token/helper/gr4vyTokenHelper');
var gr4vyConstants = require('*/cartridge/scripts/util/gr4vyConstants');

/**
 * Constructor function
 */
function Gr4vyToken() {
    this.amount = null;
    this.currency = null;
    this.buyerID = null;
    this.scopes = gr4vyConstants.TOKEN_DEFAULT_SCOPES;
}


Gr4vyToken.prototype.setAmount = function (amount) {
    this.amount = amount;
};

Gr4vyToken.prototype.setCurrency = function (currency) {
    this.currency = currency;
};

Gr4vyToken.prototype.setScopes = function (scopes) {
    this.scopes = scopes;
};

Gr4vyToken.prototype.setBuyerID = function (buyerID) {
    this.buyerID = buyerID;
};

Gr4vyToken.prototype.generate = function () {
    var data = {};
    if (this.amount) {
        data.amount = this.amount;
    }
    if (this.currency) {
        data.currency = this.currency;
    }
    if (this.buyerID) {
        data.buyerID = this.buyerID;
    }
    if (this.scopes) {
        data.scopes = this.scopes;
    }
    return gr4vyTokenHelper.generateBearerToken(data);
};

module.exports = Gr4vyToken;
