/* globals session */
'use strict';

var server = require('server');
var URLUtils = require('dw/web/URLUtils');
var TransactionHelper = require('*/cartridge/scripts/helpers/gr4vyTransactionHelper');

/**
 *Gr4vyTransactionTest-Test : The Gr4vyTransactionTest-Test endpoint will render the testtransactionform for
 *sending the capture,refund or void request to gr4vy.
 */
server.get('Test', server.middleware.https, function (req, res, next) {
    var actionUrl = URLUtils.https('Gr4vyTransactionTest-Initiate');

    res.render('test/testtransactionform', {
        actionUrl: actionUrl
    });
    next();
});


/**
 *Gr4vyTransactionTest-Initiate : The Gr4vyTransactionTest-Initiate endpoint will render
 *the transactionresult for corresponding capture,refund or void requests.
 */
server.post('Initiate', server.middleware.https, function (req, res, next) {
    var orderNumber = req.form.ordernumber;
    var amount = req.form.amount;
    var transactionType = req.form.transactionType;
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

    res.render('test/testtransactionresult', {
        orderNumber: orderNumber,
        amount: amount,
        transactionType: transactionType,
        response: response
    });
    next();
});

module.exports = server.exports();
