'use strict';

var Constants = require('*/cartridge/scripts/util/gr4vyConstants');

/**
 * Gr4vy payment instrument is created
 * @param {dw.order.Basket} basket Current users's basket
 * @return {Object} returns an error object
 */
function Handle(basket) {
    var Transaction = require('dw/system/Transaction');
    Transaction.wrap(function () {
        var paymentInstruments = basket.getPaymentInstruments(Constants.GR4VY_ID);
        var paymentInstrumentIter = paymentInstruments.iterator();

        while (paymentInstrumentIter.hasNext()) {
            basket.removePaymentInstrument(paymentInstrumentIter.next());
        }

        basket.createPaymentInstrument(Constants.GR4VY_ID, basket.totalGrossPrice);
    });
    return { error: false };
}

/**
 * Authorizes a payment using a Gr4vy.
 * @param {number} orderNumber - The current order's number
 * @param {dw.order.PaymentInstrument} paymentInstrument -  The payment instrument to authorize
 * @param {dw.order.PaymentProcessor} paymentProcessor -  The payment processor of the current
 *      payment method
 * @return {Object} returns an error object
 */
function Authorize(orderNumber, paymentInstrument, paymentProcessor) { // eslint-disable-line no-unused-vars
    var Transaction = require('dw/system/Transaction');
    var serverErrors = [];
    var fieldErrors = {};
    var error = false;

    Transaction.wrap(function () {
        paymentInstrument.paymentTransaction.paymentProcessor = paymentProcessor; // eslint-disable-line no-param-reassign
        session.privacy.orderNo = orderNumber; //eslint-disable-line
    });

    return { fieldErrors: fieldErrors, serverErrors: serverErrors, error: error };
}

exports.Handle = Handle;
exports.Authorize = Authorize;
