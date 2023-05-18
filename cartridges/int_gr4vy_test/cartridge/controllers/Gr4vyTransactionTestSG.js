'use strict';

/* API Includes */
var URLUtils = require('dw/web/URLUtils');
var Resource = require('dw/web/Resource');

/* Script Modules */
var app = require('*/cartridge/scripts/app');
var guard = require('*/cartridge/scripts/guard');
var TransactionHelper = require('*/cartridge/scripts/helpers/gr4vyTransactionHelper');

/**
 *Gr4vyTransactionTestSG-Test : The Gr4vyTransactionTest-Test endpoint will render the testtransactionform for
 *sending the capture,refund or void request to gr4vy.
 */
function test() {
    var actionUrl = URLUtils.https('Gr4vyTransactionTestSG-Initiate');

    app.getView({
        actionUrl: actionUrl
    }).render('test/testtransactionform');
}

/**
 *Gr4vyTransactionTestSG-Initiate : The Gr4vyTransactionTest-Initiate endpoint will render
 *the transactionresult for corresponding capture,refund or void requests.
 */
function initiate() {
    var orderNumber = request.httpParameterMap.ordernumber.value;
    var amount = request.httpParameterMap.amount.value;
    var transactionType = request.httpParameterMap.transactionType.value;
    var response = {};

    switch (transactionType) {
        case 'Capture':
            response = TransactionHelper.initiateCaptureRequest(orderNumber, amount);
            break;
        case 'Refund':
            response = TransactionHelper.initiateRefundRequest(orderNumber, amount);
            break;
        case 'Void':
            response = TransactionHelper.initiateVoidRequest(orderNumber);
            break;
        default:
    }

    app.getView({
        orderNumber: orderNumber,
        amount: amount,
        transactionType: transactionType,
        response: response
    }).render('test/testtransactionresultSG');

    return;
}

/** @see module:controllers/Gr4vyTransactionTestSG-Test */
exports.Test = guard.ensure(['https','get'], test);
/** @see module:controllers/Gr4vyTransactionTestSG-Initiate */
exports.Initiate = guard.ensure(['https','post'], initiate);