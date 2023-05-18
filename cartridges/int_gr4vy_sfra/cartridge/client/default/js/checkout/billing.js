'use strict';

var base = require('base/checkout/billing');
var cleave = require('base/components/cleave');

/**
 * Validate and update payment instrument form fields
 * @param {Object} order - the order model
 */
function validateAndUpdateBillingPaymentInstrument(order) {
    var billing = order.billing;
    if (!billing.payment || !billing.payment.selectedPaymentInstruments
        || billing.payment.selectedPaymentInstruments.length <= 0) return;

    var form = $('form[name=dwfrm_billing]');
    if (!form) return;

    /* Gr4vy Start : bypass credit card field manipulation if Gr4vy is the selected payment method */
    if (billing.payment.selectedPaymentInstruments[0].paymentMethod !== 'Gr4vy') {
        var instrument = billing.payment.selectedPaymentInstruments[0];
        $('select[name$=expirationMonth]', form).val(instrument.expirationMonth);
        $('select[name$=expirationYear]', form).val(instrument.expirationYear);
        // Force security code and card number clear
        $('input[name$=securityCode]', form).val('');
        $('input[name$=cardNumber]').data('cleave').setRawValue('');
    }
    /* Gr4vy end : bypass credit card field manipulation if Gr4vy is the selected payment method */
}

base.handleCreditCardNumber = function () {
    /* Gr4vy Start : Do not run Credit card validation if payment method is Gr4vy */
    if ($('.payment-information').data('payment-method-id') !== 'Gr4vy') {
        cleave.handleCreditCardNumber('.cardNumber', '#cardType');
    }
    /* Gr4vy end : Do not run Credit card validation if payment method is Gr4vy */
};

base.methods.validateAndUpdateBillingPaymentInstrument = validateAndUpdateBillingPaymentInstrument;
module.exports = base;
