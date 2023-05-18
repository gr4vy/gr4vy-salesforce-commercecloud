'use strict';

/**
 * @namespace Checkout
*/

var server = require('server');
server.extend(module.superModule);

/**
 * Checkout-Begin : The Checkout-Begin endpoint will render the checkout shipping page for both guest shopper and returning shopper
 * @name Base/Checkout-Begin
 * @function
 * @memberof Checkout
 * @param {middleware} - server.middleware.https
 * @param {middleware} - consentTracking.consent
 * @param {middleware} - csrfProtection.generateToken
 * @param {querystringparameter} - stage - a flag indicates the checkout stage
 * @param {category} - sensitive
 * @param {renders} - isml
 * @param {serverfunction} - get
 * Customerizations done for Gr4vy:
 *      * Value of isGr4vyEnabled custom preference is passed in viewdata, so that it can be checked in template.
 *      * Create new gr4vy client session by calling the service and pass that in the view data.
 *      * Pass Gr4vy setup data in viewdata
 */
server.append('Begin', function (req, res, next) {
    /* Gr4vy - Begin:  Pass the Gr4vy enabled flag, JS SDK and created client token and Gr4vy setup data in viewdata.*/
    var gr4vyPreferences = require('*/cartridge/scripts/util/gr4vyPreferences');
    var gr4vyHelper = require('*/cartridge/scripts/helpers/gr4vyHelper');
    var BasketMgr = require('dw/order/BasketMgr');
    var viewData = res.getViewData();
    viewData.isGr4vyEnabled = gr4vyPreferences.isGr4vyEnabled();
    var currentBasket = BasketMgr.getCurrentBasket();
    if (!!currentBasket && gr4vyPreferences.isGr4vyEnabled() && !viewData.error) {
        viewData.gr4vyJS_SDK_URL = gr4vyPreferences.getGr4vyEmbedScriptURL();
        var requestStage = req.querystring.stage;
        var currentStage = requestStage || 'customer';
        if (currentStage === 'payment') {
            var customerData = req.currentCustomer;
            viewData = gr4vyHelper.updateViewDataWithGr4vyData(currentBasket, viewData, customerData);
        }
    }
    res.setViewData(viewData);
    /* gr4vy - End:  Pass the gr4vy enabled flag, JS SDK and created client token and Gr4vy setup data in viewdata.*/
    return next();
});

module.exports = server.exports();
