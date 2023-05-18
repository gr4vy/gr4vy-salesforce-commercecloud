'use strict';
var Cart = require('*/cartridge/scripts/models/CartModel');
var PaymentMgr = require('dw/order/PaymentMgr');
var Transaction = require('dw/system/Transaction');
var Constants = require('*/cartridge/scripts/util/gr4vyConstants');

/**
 * Handle method is used for creating payment instrument.
 * @param {Object} args contain basket and payment method id
 * @return {Object} return status
 */
function Handle(args) {
    var cart = Cart.get(args.Basket);

    Transaction.wrap(function () {
        cart.removeExistingPaymentInstruments(Constants.GR4VY_ID);
        cart.createPaymentInstrument(Constants.GR4VY_ID, cart.getNonGiftCertificateAmount());
    });

    return { success: true };
}

/**
 * Authorizes a payment.
 * only and setting the order no as the transaction ID.
 * @param {Object} args contains order, order no and payment instrument.
 * @return {Object} return status
 */
function Authorize(args) { // eslint-disable-line no-unused-vars
    var orderNo = args.OrderNo;
    var paymentInstrument = args.PaymentInstrument;
    var paymentProcessor = PaymentMgr.getPaymentMethod(paymentInstrument.getPaymentMethod()).getPaymentProcessor();

    Transaction.wrap(function () {
        paymentInstrument.paymentTransaction.transactionID = orderNo;
        paymentInstrument.paymentTransaction.paymentProcessor = paymentProcessor;
    });

    return { authorized: true };
}

exports.Handle = Handle;
exports.Authorize = Authorize;
