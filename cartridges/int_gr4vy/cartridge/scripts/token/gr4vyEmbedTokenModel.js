'use strict';
var gr4vyTokenHelper = require('*/cartridge/scripts/token/helper/gr4vyTokenHelper');
var gr4vyConstants = require('*/cartridge/scripts/util/gr4vyConstants');

/**
 * Constructor function
 */
function Gr4vyEmbedToken() {
    this.amount = null;
    this.currency = null;
    this.buyerID = null;
    this.cartItems = null;
    this.metadata = null;
}


Gr4vyEmbedToken.prototype.setAmount = function (amount) {
    this.amount = amount;
};

Gr4vyEmbedToken.prototype.setCurrency = function (currency) {
    this.currency = currency;
};

Gr4vyEmbedToken.prototype.setCartItems = function (cartItems) {
    this.cartItems = cartItems;
};

Gr4vyEmbedToken.prototype.setBuyerID = function (buyerID) {
    this.buyerID = buyerID;
};

Gr4vyEmbedToken.prototype.setMetadata = function (metadata) {
    this.metadata = metadata;
};

Gr4vyEmbedToken.prototype.generate = function () {
    var data = {};
    data.scopes = gr4vyConstants.EMBED_TOKEN_SCOPE;
    if (this.amount || this.amount === 0) {
        data.amount = this.amount;
    }
    if (this.currency) {
        data.currency = this.currency;
    }
    if (this.buyerID) {
        data.buyerID = this.buyerID;
    }
    if (this.cartItems) {
        data.cartItems = this.cartItems;
    }
    if (this.metadata) {
        data.metadata = this.metadata;
    }
    return gr4vyTokenHelper.generateToken(data);
};

module.exports = Gr4vyEmbedToken;
