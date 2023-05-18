'use strict';

var Status = require('dw/system/Status');
var gr4vyLogger = require('int_gr4vy/cartridge/scripts/util/gr4vyLogger').getGr4vyLogger();
var Order = require('dw/order/Order');

/**
 * @param {Object} order - Order object
 */
function placeOrder(order) {
    var OrderMgr = require('dw/order/OrderMgr');
    try {
        // eslint-disable-next-line eqeqeq
        if (order.status == Order.ORDER_STATUS_CREATED) {
            var placeOrderResult = OrderMgr.placeOrder(order);
            if (placeOrderResult.error) {
                gr4vyLogger.fatal('process notification Fail to submit the order ' + order.getOrderNo() + placeOrderResult);
            }
        }
    } catch (e) {
        gr4vyLogger.fatal('process notification Fail to submit the order ' + order.getOrderNo() + e.message);
    }
}
/**
 *
 * @param {string} gr4vyNotification - Custom object which stores gr4vy webhook payload data.
 * @param {Object} transactionResponse - API response from gr4vy for the requested transaction ID.
 * @returns {string} Returns order notes
 */
function createOrderNote(gr4vyNotification, transactionResponse) {
    var msg = '';
    try {
        delete transactionResponse.result.cart_items; // eslint-disable-line
        var response = JSON.stringify(transactionResponse.result);
        msg += 'Gr4vy Webhook Notification';
        msg += '\ngr4vyNotificationId : ' + gr4vyNotification.custom.gr4vyNotificationId;
        msg += '\neventType : ' + gr4vyNotification.custom.eventType;
        msg += '\ncreatedAt: ' + gr4vyNotification.custom.createdAt;
        msg += '\ntargetType : ' + gr4vyNotification.custom.targetType;
        msg += '\ntargetId : ' + gr4vyNotification.custom.targetId;
        msg += '\nTransaction Response : ' + response;
    } catch (e) {
        msg = transactionResponse.result;
    }
    var length = Object.keys(msg).length;
    if (length > 4000) {
        msg = msg.slice(0, 3999);
    }

    return msg;
}

/**
 * getOrder - Get order
 * @param {string} orderId - Order ID
 *  to be processed and handle them to place or fail order
 * @return {Object} Order.
 */
function getOrder(orderId) {
    var OrderMgr = require('dw/order/OrderMgr');
    var order = OrderMgr.getOrder(orderId);
    return order;
}


/**
 * ProcessNotification - search for custom objects that need
 *  to be processed and handle them to place or fail order
 * @return {Object} Job Status.
 */
function processNotification(parameters) {
    var gr4vyNotification;
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var OrderMgr = require('dw/order/OrderMgr');
    var gr4vyServiceWrapper = require('*/cartridge/scripts/services/gr4vyServiceWrapper');
    var Constants = require('int_gr4vy/cartridge/scripts/util/gr4vyConstants');
    var gr4vyPreferences = require('int_gr4vy/cartridge/scripts/util/gr4vyPreferences');
    var gr4vyHelper = require('int_gr4vy/cartridge/scripts/helpers/gr4vyHelper');
    var delay = parameters.delayInMinite;
    var date = new Date();
    date.setTime(date.getTime() - delay * 60 * 1000);
    var gr4vyNotifications = CustomObjectMgr.queryCustomObjects('gr4vyNotification', 'lastModified <= {0}', 'lastModified asc', date);
    var manualCaptureEnabled = gr4vyPreferences.getIntent();

    while (gr4vyNotifications && gr4vyNotifications.hasNext()) {
        gr4vyNotification = gr4vyNotifications.next();
        var transactionResponse = {};
        var paymentStatus;
        var currentOrder = '';
        var transactionData;
        try {
            var targetType = gr4vyNotification.custom.targetType;
            var targetId = gr4vyNotification.custom.targetId;
            var refundId = gr4vyNotification.custom.refundId;
            switch (targetType) {
                case 'transaction':
                    transactionResponse = gr4vyServiceWrapper.getTransactionDetails(targetId);
                    if (!transactionResponse.error) {
                        transactionData = transactionResponse.result;
                        gr4vyLogger.info('Transaction details for' + targetId + ':' + JSON.stringify(transactionData));
                        currentOrder = getOrder(transactionData.external_identifier);
                        if (currentOrder) {
                            paymentStatus = transactionData.status;
                            // Updating the order status in BM after checking the payment status from gr4vy and updates order notes.
                            if ((paymentStatus === Constants.AUTHORIZATION_DECLINED) || (paymentStatus === Constants.AUTHORIZATION_FAILED)) {
                                OrderMgr.failOrder(currentOrder, false);
                            } else if ((paymentStatus === Constants.AUTHORIZATION_SUCCEEDED) || (!manualCaptureEnabled && paymentStatus === Constants.CAPTURE_SUCCEEDED)) {
                                currentOrder.setExportStatus(Order.EXPORT_STATUS_READY);
                            }
                            if (paymentStatus === Constants.CAPTURE_SUCCEEDED) {
                                currentOrder.setPaymentStatus(Order.PAYMENT_STATUS_PAID);
                            }

                            // eslint-disable-next-line eqeqeq
                            if (currentOrder.status == Order.ORDER_STATUS_CREATED) {
                                if (paymentStatus === Constants.AUTHORIZATION_SUCCEEDED ||
                                    paymentStatus === Constants.PROCESSING ||
                                    (!manualCaptureEnabled && paymentStatus === Constants.CAPTURE_SUCCEEDED) ||
                                    (!manualCaptureEnabled && paymentStatus === Constants.CAPTURE_PENDING)) {
                                    gr4vyHelper.updateOrderDetails(currentOrder, transactionResponse);
                                    placeOrder(currentOrder);
                                }
                            }
                            gr4vyHelper.updateTransactionStatus(currentOrder, paymentStatus);

                            currentOrder.addNote('Gr4vy Payment Notification', createOrderNote(gr4vyNotification, transactionResponse));
                        } else {
                            gr4vyLogger.error('Could not find the order in BM :' + transactionData.external_identifier);
                        }
                    } else {
                        gr4vyLogger.error('Could not get transaction details for transactionId:' + targetId + ' error' + (transactionResponse.errorMessage));
                    }

                    // Check whether the SFCC order exists.

                    break;
                case 'refund':
                    transactionResponse = gr4vyServiceWrapper.getTransactionDetails(targetId);
                    if (!transactionResponse.error) {
                        transactionData = transactionResponse.result;
                        gr4vyLogger.info('Transaction details for' + targetId + ':' + JSON.stringify(transactionData));
                        currentOrder = getOrder(transactionData.external_identifier);
                        if (currentOrder) {
                            var refundResponse = gr4vyServiceWrapper.getRefundDetails(targetId, refundId);
                            if (!refundResponse.error) {
                                var refundData = refundResponse.result;
                                var refundStatus = refundData.type + '_' + refundData.status + '_' + refundData.created_at;
                                gr4vyHelper.updateTransactionStatus(currentOrder, refundStatus);
                                currentOrder.addNote('Gr4vy Payment Notification', createOrderNote(gr4vyNotification, refundResponse));
                            } else {
                                gr4vyLogger.error('Refund request error for the refund ID : ' + refundId);
                            }
                        } else {
                            gr4vyLogger.error('Could not find the order in BM :' + transactionData.external_identifier);
                        }
                    } else {
                        gr4vyLogger.info('Refund transaction missing for the transaction: ' + targetId);
                    }
                    break;
                default:
                    gr4vyLogger.error('Not a valid targetType: ' + targetType);
            }
            // Removes the processed custom objects.
            CustomObjectMgr.remove(gr4vyNotification);
        } catch (e) {
            gr4vyLogger.error('Error in processing Job: ' + JSON.stringify(e));
        }
    }
    return new Status(Status.OK);
}
module.exports = {
    processNotification: processNotification
};
