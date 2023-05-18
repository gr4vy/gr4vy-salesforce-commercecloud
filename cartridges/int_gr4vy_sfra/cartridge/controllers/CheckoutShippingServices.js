'use strict';

var server = require('server');
server.extend(module.superModule);
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var BasketMgr = require('dw/order/BasketMgr');
var gr4vyHelper = require('*/cartridge/scripts/helpers/gr4vyHelper');

/**
 * Handle Ajax shipping form submit
 */
/**
 * CheckoutShippingServices-SubmitShipping : The CheckoutShippingServices-SubmitShipping endpoint submits the shopper's shipping addresse(s) and shipping method(s) and saves them to the basket
 * @name Base/CheckoutShippingServices-SubmitShipping
 * @function
 * @memberof CheckoutShippingServices
 * @param {middleware} - server.middleware.https
 * @param {middleware} - csrfProtection.validateAjaxRequest
 * @param {httpparameter} - shipmentUUID - The universally unique identifier of the shipment
 * @param {httpparameter} - csrf_token - Hidden input field CSRF token
 * @param {category} - sensitive
 * @param {returns} - json
 * @param {serverfunction} - post
 *      * Customizations done for Gr4vy:
 *      * Create new gr4vy client session by calling the service and pass that in the view data.
 *      * Pass Gr4vy setup data in viewdata
 */
server.append('SubmitShipping', server.middleware.https, csrfProtection.validateAjaxRequest, function (req, res, next) {
    /* Gr4vy - Begin:  Pass the Gr4vy  client token and Gr4vy setup data in viewdata.*/
    var gr4vyPreferences = require('*/cartridge/scripts/util/gr4vyPreferences');
    var Resource = require('dw/web/Resource');
    this.on('route:BeforeComplete', function (req, res) { // eslint-disable-line no-shadow
        var currentBasket = BasketMgr.getCurrentBasket();
        var viewData = res.getViewData();
        if (!!currentBasket && gr4vyPreferences.isGr4vyEnabled() && !viewData.error) {
            var customerData = req.currentCustomer;
            viewData = gr4vyHelper.updateViewDataWithGr4vyData(currentBasket, viewData, customerData);
            if (!viewData.error) {
                res.setViewData(viewData);
            } else {
                res.json({
                    error: true,
                    fieldErrors: [],
                    serverErrors: [Resource.msg('error.gr4vy.buyer.creation.failure', 'checkout', null)]
                });
                return;
            }
        }
    });
    /* Gr4vy - End:  Pass the Gr4vy  client token and Gr4vy setup data in viewdata.*/
    return next();
});

module.exports = server.exports();
