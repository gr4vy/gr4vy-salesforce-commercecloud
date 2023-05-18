'use strict';

var server = require('server');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');
var URLUtils = require('dw/web/URLUtils');
var Resource = require('dw/web/Resource');

var gr4vyHelper = require('*/cartridge/scripts/helpers/gr4vyHelper');
var Transaction = require('dw/system/Transaction');
var OrderMgr = require('dw/order/OrderMgr');

/**
 * HandleGr4vyRedirect : Handle place-order in SFCC.
 * Also update the SFCC order status based on Gr4vy transaction status
 * @name HandleGr4vyRedirect
 * @param {middleware} - server.middleware.https
 * @param {middleware} - consentTracking.consent
 * @param {middleware} - csrfProtection.generateToken
 * @param {renders} - json
 * @param {serverfunction} - post
 */

server.post(
    'HandleGr4vyRedirect',
    server.middleware.https,
    consentTracking.consent,
    csrfProtection.generateToken,
    function (req, res, next) {
        var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
        var addressHelpers = require('*/cartridge/scripts/helpers/addressHelpers');

        var order = gr4vyHelper.getGr4vyOrder(req.form.orderID);

        // if error, return to cart page
        if (!order) {
            res.redirect(URLUtils.url('Cart-Show'));
            return next();
        }

        // if basket and gr4vy amount differs then fail order - (multi tab checkout scenario)
        if (!gr4vyHelper.validateGr4vyTransactionAmount(order, req.form.transaction)) {
            Transaction.wrap(function () {
                OrderMgr.failOrder(order, true);
            });

            res.json({
                error: true,
                cartError: true,
                redirectUrl: URLUtils.https('Checkout-Begin', 'stage', 'payment').abs().toString()
            });
            return next();
        }

        var result = gr4vyHelper.updateGr4vyOrderDetails(order, req.form.transaction);
        if (result.error) {
            res.json({
                error: true,
                errorMessage: Resource.msg('error.technical', 'checkout', null)
            });
            return next();
        }

        // Places the order
        var placeOrderResult = COHelpers.placeOrder(order, {});
        if (placeOrderResult.error) {
            res.json({
                error: true,
                errorMessage: Resource.msg('error.technical', 'checkout', null)
            });
            return next();
        }


        if (req.currentCustomer.addressBook) {
            // save all used shipping addresses to address book of the logged in customer
            var allAddresses = addressHelpers.gatherShippingAddresses(order);
            allAddresses.forEach(function (address) {
                if (!addressHelpers.checkIfAddressStored(address, req.currentCustomer.addressBook.addresses)) {
                    addressHelpers.saveAddress(address, req.currentCustomer, addressHelpers.generateAddressName(address));
                }
            });
        }

        if (order.getCustomerEmail()) {
            COHelpers.sendConfirmationEmail(order, req.locale.id);
        }

        // Reset usingMultiShip after successful Order placement
        req.session.privacyCache.set('usingMultiShipping', false);

        // TODO: Exposing a direct route to an Order, without at least encoding the orderID
        //  is a serious PII violation.  It enables looking up every customers orders, one at a
        //  time.
        res.json({
            error: false,
            orderID: order.orderNo,
            orderToken: order.orderToken,
            continueUrl: URLUtils.url('Order-Confirm').toString()
        });

        return next();
    }
);

/**
 * Controller for receiving Webhook notifications from Gr4vy. The notification status is
 * updated in the custom object 'gr4vyNotification' for each orders.The transaction id obtained here
 * is used to fetch transaction details from gr4vy and updating order details in Business Manager by the job 'processGr4vyNotification'.
 */
server.post('Notify', function (req, res, next) {
    gr4vyHelper.updateGr4vyNotificationObject(req);
    return next;
});
module.exports = server.exports();
