'use strict';

/**
 * 
 * controller for handling the order processing for Gr4vy.
 * places order and updates order details on Gr4vy.
 *
 * @module controllers/Gr4vy
 */

/* API Includes */
var URLUtils = require('dw/web/URLUtils');
var Resource = require('dw/web/Resource');

/* Script Modules */
var app = require('*/cartridge/scripts/app');
var guard = require('*/cartridge/scripts/guard');
var Order = app.getModel('Order');
var Transaction = require('dw/system/Transaction');
var OrderMgr = require('dw/order/OrderMgr');
var gr4vyHelper = require('*/cartridge/scripts/helpers/gr4vyHelper');

/**
 * contains logic to place order
 * and for redirect to order confirmation page.
 */
function handleGr4vyRedirect() {
    var res = require('*/cartridge/scripts/util/Response');
    var order = gr4vyHelper.getGr4vyOrder(request.httpParameterMap.orderID.value);

    // if error, return to Cart page
    if (!order) {
        res.renderJSON({
            error: true,
            redirectUrl: URLUtils.https('Cart-Show').toString()
        });
        return;
    }

    // if basket and gr4vy amount differs then fail order - (multi tab checkout scenario)
    if (!gr4vyHelper.validateGr4vyTransactionAmount(order, request.httpParameterMap.transaction.value)) {
        Transaction.wrap(function () {
            OrderMgr.failOrder(order, true);
        });

        res.renderJSON({
            error: true,
            cartError: true,
            errorMessage: Resource.msg('confirm.error.technical', 'checkout', null)
        });
        return;
    }

    var result = gr4vyHelper.updateGr4vyOrderDetails(order, request.httpParameterMap.transaction.value);
    if (result.error) {
        res.renderJSON({
            error: true,
            cartError: true,
            errorMessage: Resource.msg('confirm.error.technical', 'checkout', null)
        });
        return;
    }

    // Places the order
    var placeOrderResult;
    placeOrderResult = Order.submit(order);

    if (placeOrderResult.error) {
        if (request.httpParameterMap.format.stringValue === 'ajax') {
            res.renderJSON({
                error: true,
                cartError: true,
                errorMessage: Resource.msg('confirm.error.technical', 'checkout', null)
            });
        }
        return;
    }

    if (customer.addressBook) {
        // save all used shipping addresses to address book of the logged in customer
        app.getModel('Profile').get(customer.profile).addAddressToAddressBook(order.getBillingAddress());
    }

    // reset the orderNo in session
    session.privacy.orderNo = null;

    res.renderJSON({
        error: false,
        orderID: order.orderNo,
        orderToken: order.orderToken,
        continueUrl: URLUtils.url('COSummary-ShowConfirmation').toString()
    });
    return;
}

/**
 * Controller for receiving Webhook notifications from Gr4vy. The notification status is
 * updated in the custom object 'gr4vyNotification' for each orders.The transaction id obtained here
 * is used to fetch transaction details from gr4vy and updating order details in Business Manager by the job 'processGr4vyNotification'.
 */
function notify() {
    var req = { body : request.httpParameterMap.getRequestBodyAsString()};
    gr4vyHelper.updateGr4vyNotificationObject(req);
    return;
}

/** @see module:controllers/Gr4vy-HandleGr4vyRedirects */
exports.HandleGr4vyRedirect = guard.ensure(['https','post'], handleGr4vyRedirect);
/** @see module:controllers/Gr4vy-Notify */
exports.Notify = guard.ensure(['https','post'],notify);