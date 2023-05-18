'use strict';

var gr4vyLogger = require('*/cartridge/scripts/util/gr4vyLogger').getGr4vyLogger();
var gr4vyServiceWrapper = require('*/cartridge/scripts/services/gr4vyServiceWrapper');
var Transaction = require('dw/system/Transaction');
var gr4vyHelper = require('*/cartridge/scripts/helpers/gr4vyHelper');
var OrderMgr = require('dw/order/OrderMgr');
var TransactionHelper = {};


/**
 *
 * @param {string} order - Order ID
 * @returns {string} - transactionID
 */
function getTransactionID(order) {
    var transactionID = order.custom.gr4vyPaymentTransactionId;
    return transactionID;
}

/**
 * Initiate Capture Request for an order
 *
 * @param {string} orderNo number
 * @param {string} captureAmount number
 * @returns {Object} captureResponse Capture response
 */
TransactionHelper.initiateCaptureRequest = function (orderNo, captureAmount) {
    var response = {
        ok: false
    };

    try {
        var order = OrderMgr.getOrder(orderNo);
        if (!order) {
            gr4vyLogger.error('[initiateCaptureRequest] Unable to find order : ' + orderNo);
            response.errorCode = 'UNABLE_TO_FIND_ORDER';
            return response;
        }
        var gr4vyTransactionID = getTransactionID(order);
        if (gr4vyTransactionID) {
            var amount = {};
            var money = new dw.value.Money(captureAmount, order.currencyCode);
            amount.amount = money.multiply(100).value;
            var captureResponse = gr4vyServiceWrapper.capturePayment(gr4vyTransactionID, amount);
            Transaction.wrap(function () {
                if (!captureResponse.error) {
                    order.addNote('Gr4vy Payment Capture Notification', gr4vyHelper.savePaymentResponse(captureResponse.result));
                    response.ok = true;
                } else {
                    gr4vyLogger.error('[initiateCaptureRequest] An error occurred during Capture request service for order : ' + orderNo + '. Error details : ' + captureResponse.errorMessage);
                    order.addNote('Gr4vy Payment Capture Notification', captureResponse.errorMessage);
                    response.errorCode = 'GR4VY_CAPTURE_ERROR';
                }
            });
        } else {
            gr4vyLogger.error('[initiateCaptureRequest] Unable to find transaction id for order : ' + orderNo);
            response.errorCode = 'UNABLE_TO_FIND_TRANSACTION';
        }
    } catch (e) {
        response.errorCode = 'GENERAL_CAPTURE_ERROR';
        gr4vyLogger.error('Error in capture' + e.message);
    }

    return response;
};
/**
 *
 * @param {string} orderNo number
 * @param {string} refundAmount number
 * @returns {Object} refundResponse Refund response
 */
TransactionHelper.initiateRefundRequest = function (orderNo, refundAmount) {
    var response = {
        ok: false
    };
    try {
        var order = OrderMgr.getOrder(orderNo);
        if (!order) {
            gr4vyLogger.error('[initiateRefundRequest] Unable to find order : ' + orderNo);
            response.errorCode = 'UNABLE_TO_FIND_ORDER';
            return response;
        }
        var gr4vyTransactionID = getTransactionID(order);
        if (gr4vyTransactionID) {
            var amount = {};
            var money = new dw.value.Money(refundAmount, order.currencyCode);
            amount.amount = money.multiply(100).value;
            var refundResponse = gr4vyServiceWrapper.refundPayment(gr4vyTransactionID, amount);


            Transaction.wrap(function () {
                if (!refundResponse.error) {
                    order.addNote('Gr4vy Payment Refund Notification', gr4vyHelper.savePaymentResponse(refundResponse.result));
                    response.ok = true;
                } else {
                    gr4vyLogger.error('[initiateRefundRequest] An error occurred during Refund request service for order : ' + orderNo + '. Error details : ' + refundResponse.errorMessage);
                    order.addNote('Gr4vy Payment Refund Notification', refundResponse.errorMessage);
                    response.errorCode = 'GR4VY_REFUND_ERROR';
                }
            });
        } else {
            gr4vyLogger.error('[initiateRefundRequest] Unable to find transaction id for order : ' + orderNo);
            response.errorCode = 'UNABLE_TO_FIND_TRANSACTION';
        }
    } catch (e) {
        response.errorCode = 'GENERAL_REFUND_ERROR';
        gr4vyLogger.info('Error in refund' + e.message);
    }

    return response;
};


TransactionHelper.initiateVoidRequest = function (orderNo) {
    var response = {
        ok: false
    };
    try {
        var order = OrderMgr.getOrder(orderNo);
        if (!order) {
            gr4vyLogger.error('[initiateVoidRequest] Unable to find order : ' + orderNo);
            response.errorCode = 'UNABLE_TO_FIND_ORDER';
            return response;
        }
        var gr4vyTransactionID = getTransactionID(order);
        if (gr4vyTransactionID) {
            var voidResponse = gr4vyServiceWrapper.voidPayment(gr4vyTransactionID);


            Transaction.wrap(function () {
                if (!voidResponse.error) {
                    order.addNote('Gr4vy Payment Void Notification', gr4vyHelper.savePaymentResponse(voidResponse.result));
                    response.ok = true;
                } else {
                    gr4vyLogger.error('[initiateVoidRequest] An error occurred during Void request service for order : ' + orderNo + '. Error details : ' + voidResponse.errorMessage);
                    order.addNote('Gr4vy Payment Void Notification', voidResponse.errorMessage);
                    response.errorCode = 'GR4VY_VOID_ERROR';
                }
            });
        } else {
            gr4vyLogger.error('[initiateVoidRequest] Unable to find transaction id for order : ' + orderNo);
            response.errorCode = 'UNABLE_TO_FIND_TRANSACTION';
        }
    } catch (e) {
        response.errorCode = 'GENERAL_VOID_ERROR';
        gr4vyLogger.info('Error in void' + e.message);
    }

    return response;
};

module.exports = TransactionHelper;
