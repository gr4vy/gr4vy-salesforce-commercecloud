'use strict';

/**
 * @namespace CheckoutServices
*/

var server = require('server');
server.extend(module.superModule);
var BasketMgr = require('dw/order/BasketMgr');

var gr4vyHelper = require('*/cartridge/scripts/helpers/gr4vyHelper');

/**
 * CheckoutServices-Get : This endpoint is only used in multi-ship. The CheckoutServices-Get endpoint is invoked when clicking on"Next: Payment"
 * @name Base/CheckoutServices-Get
 * @function
 * @memberof CheckoutServices
 * @param {middleware} - server.middleware.https
 * @param {category} - sensitive
 * @param {returns} - json
 * @param {serverfunction} - get
 *      * Customizations done for Gr4vy:
 *      * Create new gr4vy client session by calling the service and pass that in the view data.
 *      * Pass Gr4vy setup data in viewdata
 */
server.append('Get', server.middleware.https, function (req, res, next) {
    /* Gr4vy - Begin:  Pass the Gr4vy  client token and Gr4vy setup data in viewdata.*/
    var gr4vyPreferences = require('*/cartridge/scripts/util/gr4vyPreferences');
    var Resource = require('dw/web/Resource');
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
    /* Gr4vy - End:  Pass the Gr4vy  client token and Gr4vy setup data in viewdata.*/
    return next();
});

/**
 * CheckoutServices-PlaceOrder : The CheckoutServices-PlaceOrder endpoint places the order
 * @name Base/CheckoutServices-PlaceOrder
 * @function
 * @memberof CheckoutServices
 * @param {middleware} - server.middleware.https
 * @param {category} - sensitive
 * @param {returns} - json
 * @param {serverfunction} - post
 *  * Customerizations done for Gr4vy:
 *  * If Gr4vy payment is enabled break the place order flow and send back the order number to client side after fraud detection step
 * Update the existing buyer  with the customer shipping and billing info.
 */
server.prepend('PlaceOrder', server.middleware.https, function (req, res, next) {
    var OrderMgr = require('dw/order/OrderMgr');
    var Resource = require('dw/web/Resource');
    var Transaction = require('dw/system/Transaction');
    var URLUtils = require('dw/web/URLUtils');
    var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
    var hooksHelper = require('*/cartridge/scripts/helpers/hooks');
    var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
    var validationHelpers = require('*/cartridge/scripts/helpers/basketValidationHelpers');

    var isGr4vyEnabled = require('*/cartridge/scripts/util/gr4vyPreferences').isGr4vyEnabled;
    if (!isGr4vyEnabled) {
        return next();
    }

    var currentBasket = BasketMgr.getCurrentBasket();

    if (!currentBasket) {
        res.json({
            error: true,
            cartError: true,
            fieldErrors: [],
            serverErrors: [],
            redirectUrl: URLUtils.url('Cart-Show').toString()
        });
        return next();
    }

    var validatedProducts = validationHelpers.validateProducts(currentBasket);
    if (validatedProducts.error) {
        res.json({
            error: true,
            cartError: true,
            fieldErrors: [],
            serverErrors: [],
            redirectUrl: URLUtils.url('Cart-Show').toString()
        });
        return next();
    }

    if (req.session.privacyCache.get('fraudDetectionStatus')) {
        res.json({
            error: true,
            cartError: true,
            redirectUrl: URLUtils.url('Error-ErrorCode', 'err', '01').toString(),
            errorMessage: Resource.msg('error.technical', 'checkout', null)
        });

        return next();
    }

    var validationOrderStatus = hooksHelper('app.validate.order', 'validateOrder', currentBasket, require('*/cartridge/scripts/hooks/validateOrder').validateOrder);
    if (validationOrderStatus.error) {
        res.json({
            error: true,
            errorMessage: validationOrderStatus.message
        });
        return next();
    }

    // Check to make sure there is a shipping address
    if (currentBasket.defaultShipment.shippingAddress === null) {
        res.json({
            error: true,
            errorStage: {
                stage: 'shipping',
                step: 'address'
            },
            errorMessage: Resource.msg('error.no.shipping.address', 'checkout', null)
        });
        return next();
    }

    // Check to make sure billing address exists
    if (!currentBasket.billingAddress) {
        res.json({
            error: true,
            errorStage: {
                stage: 'payment',
                step: 'billingAddress'
            },
            errorMessage: Resource.msg('error.no.billing.address', 'checkout', null)
        });
        return next();
    }

    // Calculate the basket
    Transaction.wrap(function () {
        basketCalculationHelpers.calculateTotals(currentBasket);
    });

    // Re-validates existing payment instruments
    var validPayment = COHelpers.validatePayment(req, currentBasket);
    if (validPayment.error) {
        res.json({
            error: true,
            errorStage: {
                stage: 'payment',
                step: 'paymentInstrument'
            },
            errorMessage: Resource.msg('error.payment.not.valid', 'checkout', null)
        });
        return next();
    }

    // Re-calculate the payments.
    var calculatedPaymentTransactionTotal = COHelpers.calculatePaymentTransaction(currentBasket);
    if (calculatedPaymentTransactionTotal.error) {
        res.json({
            error: true,
            errorMessage: Resource.msg('error.technical', 'checkout', null)
        });
        return next();
    }

    /* Gr4vy Begin: Update billing and shipping details in Gr4vy*/
    var updateGr4vy = gr4vyHelper.updateBuyerInGr4vy(currentBasket);
    if (!updateGr4vy.success) {
        res.json({
            error: true,
            errorStage: {
                stage: 'payment',
                step: 'paymentInstrument'
            },
            errorMessage: Resource.msg('error.gr4vy.address.update.failure', 'checkout', null)
        });
        this.emit('route:Complete', req, res);
        return;
    }
    /* Gr4vy End: Update billing and shipping details in Gr4vy*/

    /* Gr4vy Begin: verify if amount in Gr4vy token and basket are the same to eliminate multi-tab checkout issue*/
    var gr4vyTotalGrossPrice = (currentBasket.custom && currentBasket.custom.gr4vyTotalGrossPrice) ? currentBasket.custom.gr4vyTotalGrossPrice : 0;
    var totalGrossPrice = (currentBasket.totalGrossPrice).multiply(100);
    if (gr4vyTotalGrossPrice !== totalGrossPrice.value) {
        var redirectUrl = URLUtils.https('Checkout-Begin', 'stage', 'payment').abs().toString();
        res.json({
            error: true,
            cartError: true,
            redirectUrl: redirectUrl
        });
        this.emit('route:Complete', req, res);
        return;
    }
    /* Gr4vy End: verify if amount in Gr4vy token and basket are the same to eliminate multi-tab checkout issue*/

    // Creates a new order.
    var order = COHelpers.createOrder(currentBasket);
    if (!order) {
        res.json({
            error: true,
            errorMessage: Resource.msg('error.technical', 'checkout', null)
        });
        return next();
    }

    // Handles payment authorization
    var handlePaymentResult = COHelpers.handlePayments(order, order.orderNo);

    // Handle custom processing post authorization
    var options = {
        req: req,
        res: res
    };
    var postAuthCustomizations = hooksHelper('app.post.auth', 'postAuthorization', handlePaymentResult, order, options, require('*/cartridge/scripts/hooks/postAuthorizationHandling').postAuthorization);
    if (postAuthCustomizations && Object.prototype.hasOwnProperty.call(postAuthCustomizations, 'error')) {
        res.json(postAuthCustomizations);
        return next();
    }

    if (handlePaymentResult.error) {
        res.json({
            error: true,
            errorMessage: Resource.msg('error.technical', 'checkout', null)
        });
        return next();
    }

    var fraudDetectionStatus = hooksHelper('app.fraud.detection', 'fraudDetection', currentBasket, require('*/cartridge/scripts/hooks/fraudDetection').fraudDetection);
    if (fraudDetectionStatus.status === 'fail') {
        Transaction.wrap(function () { OrderMgr.failOrder(order, true); });

        // fraud detection failed
        req.session.privacyCache.set('fraudDetectionStatus', true);

        res.json({
            error: true,
            cartError: true,
            redirectUrl: URLUtils.url('Error-ErrorCode', 'err', fraudDetectionStatus.errorCode).toString(),
            errorMessage: Resource.msg('error.technical', 'checkout', null)
        });

        return next();
    }

    // TODO: Exposing a direct route to an Order, without at least encoding the orderID
    //  is a serious PII violation.  It enables looking up every customers orders, one at a
    //  time.
    res.json({
        error: false,
        orderID: order.orderNo,
        orderToken: order.orderToken,
        shippingDetailsId: updateGr4vy.shippingDetailsId
    });

    this.emit('route:Complete', req, res);
    return;
});

module.exports = server.exports();
