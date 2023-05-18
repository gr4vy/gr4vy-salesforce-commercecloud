/* globals session empty */

'use strict';

var gr4vyService = require('*/cartridge/scripts/services/gr4vyService');
var gr4vyLogger = require('*/cartridge/scripts/util/gr4vyLogger').getGr4vyLogger();
var Constants = require('*/cartridge/scripts/util/gr4vyConstants');

/**
 *
 * @param {*} customerDetails Details of customer to be passed to gr4vy
 * @returns {*} requestObject
 */
function getRequestObject(customerDetails) {
    var requestObject = {
        body: customerDetails
    };
    return requestObject;
}

/**
 * Parse response data
 * @param {*} serviceResponse Details of customer to be passed to gr4vy
 * @returns {*} data - parsed data
 */
function parseData(serviceResponse) {
    var json = serviceResponse.text;
    try {
        json = JSON.parse(json);
    } catch (e) {
        gr4vyLogger.error('Parse data error: {0}', e.getError());
    }
    return json;
}

/**
 * Service response handler
 * @param {Object} serviceResponse - response
 * @returns {*} data - service data
 */
function parseResponse(serviceResponse) {
    var response = {};
    var serviceResponseObj = serviceResponse.object;
    response.error = (serviceResponse.status === 'SERVICE_UNAVAILABLE') ? true : serviceResponse.error !== 0;
    response.errorMessage = serviceResponse.errorMessage ? serviceResponse.errorMessage : '';
    if (serviceResponseObj) {
        response.result = !empty(serviceResponseObj.text) ? parseData(serviceResponseObj) : ''; // eslint-disable-line
    }
    return response;
}

var gr4vyServiceWrapper = {
    getBuyer: function (buyerID) {
        try {
            var requestObject = {};
            var service = gr4vyService.getService(Constants.URL_ENDPOINT_CREATE_BUYER + '/' + buyerID, Constants.METHOD_GET);
            var response = service.call(requestObject);
            if (!empty(response.error) && response.error !== 0) {
                gr4vyLogger.error('getBuyer():Error on fetching buyer' + JSON.stringify(response));
                return {
                    error: true,
                    errorCode: response.error
                };
            }
            var buyerId = JSON.parse(response.object.text).id;
            gr4vyLogger.info('getBuyer():Successfully fetched buyer');

            return {
                error: false,
                buyerId: buyerId
            };
        } catch (e) {
            gr4vyLogger.error('getBuyer():Error in API' + JSON.stringify(e));

            return {
                error: true
            };
        }
    },
    searchBuyer: function (externalIdentifier) {
        try {
            var requestObject = {};
            var service = gr4vyService.getService(Constants.URL_ENDPOINT_CREATE_BUYER + '?limit=1&search=' + externalIdentifier, Constants.METHOD_GET);
            var response = parseResponse(service.call(requestObject));
            if (response.error) {
                gr4vyLogger.error('searchBuyer():Error on fetching buyer' + JSON.stringify(response));
                return {
                    error: true,
                    errorCode: response.error
                };
            }
            var buyerId = '';
            var responseObject = response.result;
            if (responseObject && responseObject.items && responseObject.items[0] && (responseObject.items[0].external_identifier === externalIdentifier)) {
                buyerId = responseObject.items[0].id;
            }
            gr4vyLogger.info('searchBuyer():Successfully fetched buyer');

            return {
                error: false,
                buyerId: buyerId
            };
        } catch (e) {
            gr4vyLogger.error('searchBuyer():Error in API' + JSON.stringify(e));

            return {
                error: true
            };
        }
    },
    createBuyer: function (customerDetails) {
        try {
            var requestObject = getRequestObject(customerDetails);
            var service = gr4vyService.getService(Constants.URL_ENDPOINT_CREATE_BUYER, Constants.METHOD_POST);
            var response = parseResponse(service.call(requestObject));
            if (response.error) {
                gr4vyLogger.error('createBuyer():Error on creating buyer' + JSON.stringify(response));
                return {
                    error: true,
                    errorCode: response.error
                };
            }
            var buyerId = response.result.id;
            gr4vyLogger.info('createBuyer():Successfully completed creating buyer');

            return {
                error: false,
                buyerId: buyerId
            };
        } catch (e) {
            gr4vyLogger.error('createBuyer():Error in API' + JSON.stringify(e));

            return {
                error: true
            };
        }
    },
    updateBuyerBilling: function (customerDetails, buyerId) {
        try {
            var requestObject = getRequestObject(customerDetails);
            var updateEndPoint = Constants.URL_ENDPOINT_CREATE_BUYER + '/' + buyerId;
            var service = gr4vyService.getService(updateEndPoint, Constants.METHOD_PUT);
            var response = parseResponse(service.call(requestObject));
            if (response.error) {
                gr4vyLogger.error('updateBuyerBilling():Error on updating buyer' + JSON.stringify(response), response.result);
                return {
                    error: true,
                    errorCode: response.error
                };
            }
            gr4vyLogger.info('updateBuyerBilling():Successfully completed updating buyer' + buyerId);

            return {
                error: false,
                result: response.result
            };
        } catch (e) {
            gr4vyLogger.error('updateBuyerBilling():Error in API' + JSON.stringify(e));

            return {
                error: true
            };
        }
    },
    updateBuyerShipping: function (customerDetails, buyerId) {
        try {
            var requestObject = getRequestObject(customerDetails);
            var updateBuyerEndPoint = Constants.URL_ENDPOINT_CREATE_BUYER + '/' + buyerId + '/shipping-details';
            var service = gr4vyService.getService(updateBuyerEndPoint, Constants.METHOD_POST);
            var response = parseResponse(service.call(requestObject));
            if (response.error) {
                gr4vyLogger.error('updateBuyerShipping():Error on updating buyer' + JSON.stringify(response), response.result);
                return {
                    error: true,
                    errorCode: response.error
                };
            }
            gr4vyLogger.info('updateBuyerShipping():Successfully completed updating buyer' + buyerId);
            var shippingDetailsId = response.result.id;
            return {
                error: false,
                shippingDetailsId: shippingDetailsId
            };
        } catch (e) {
            gr4vyLogger.error('updateBuyerShipping():Error in API' + JSON.stringify(e));

            return {
                error: true
            };
        }
    },
    getTransactionDetails: function (transactionId) {
        try {
            var getTransactionEndpoint = Constants.URL_ENDPOINT_TRANSACTION + '/' + transactionId;
            var service = gr4vyService.getService(getTransactionEndpoint, Constants.METHOD_GET);
            var response = parseResponse(service.call());
            if (response.error) {
                gr4vyLogger.error('getTransactionDetails():Error in getting transaction details' + JSON.stringify(response));
                return {
                    error: true,
                    errorMessage: response.errorMessage
                };
            }
            gr4vyLogger.info('getTransactionDetails():Successfully obtained transaction details' + transactionId);

            return response;
        } catch (e) {
            gr4vyLogger.error('getTransactionDetails():Error in API' + JSON.stringify(e));

            return {
                error: true
            };
        }
    },
    getRefundDetails: function (targetId, refundId) {
        try {
            var getTransactionEndpoint = Constants.URL_ENDPOINT_TRANSACTION + '/' + targetId + Constants.URL_ENDPOINT_REFUND + '/' + refundId;
            var service = gr4vyService.getService(getTransactionEndpoint, Constants.METHOD_GET);
            var response = parseResponse(service.call());
            if (response.error) {
                gr4vyLogger.error('getRefundDetails():Error in getting transaction details' + JSON.stringify(response));
                return {
                    error: true,
                    errorMessage: response.errorMessage
                };
            }
            gr4vyLogger.info('getRefundDetails():Successfully obtained transaction details' + targetId);

            return response;
        } catch (e) {
            gr4vyLogger.error('getRefundDetails():Error in API' + JSON.stringify(e));

            return {
                error: true
            };
        }
    },
    capturePayment: function (transactionID, captureAmount) {
        var captureEndpoint = Constants.URL_ENDPOINT_TRANSACTION + '/' + transactionID + Constants.URL_ENDPOINT_CAPTURE;
        var service = gr4vyService.getService(captureEndpoint, Constants.METHOD_POST);
        try {
            var response = parseResponse(service.call(getRequestObject(captureAmount)));
            if (response.error) {
                gr4vyLogger.error('Error on capture' + JSON.stringify(response));
                return {
                    error: true,
                    errorMessage: response.errorMessage
                };
            }
            return {
                error: false,
                result: response
            };
        } catch (e) {
            gr4vyLogger.error('Error in API to capture transaction' + JSON.stringify(e));

            return {
                error: true
            };
        }
    },
    refundPayment: function (transactionID, refundAmount) {
        var refundEndpoint = Constants.URL_ENDPOINT_TRANSACTION + '/' + transactionID + Constants.URL_ENDPOINT_REFUND;
        var service = gr4vyService.getService(refundEndpoint, Constants.METHOD_POST);
        try {
            var response = parseResponse(service.call(getRequestObject(refundAmount)));
            if (response.error) {
                gr4vyLogger.error('Error on refund' + JSON.stringify(response));
                return {
                    error: true,
                    errorMessage: response.errorMessage
                };
            }
            return {
                error: false,
                result: response
            };
        } catch (e) {
            gr4vyLogger.error('Error in API to refund transaction' + JSON.stringify(e));

            return {
                error: true
            };
        }
    },
    voidPayment: function (transactionID, voidAmount) {
        var voidEndpoint = Constants.URL_ENDPOINT_TRANSACTION + '/' + transactionID + Constants.URL_ENDPOINT_VOID;
        var service = gr4vyService.getService(voidEndpoint, Constants.METHOD_POST);
        try {
            var response = parseResponse(service.call(getRequestObject(voidAmount)));
            if (response.error) {
                gr4vyLogger.error('Error on void' + JSON.stringify(response));
                return {
                    error: true,
                    errorMessage: response.errorMessage
                };
            }
            return {
                error: false,
                result: response
            };
        } catch (e) {
            gr4vyLogger.error('Error in API to void transaction' + JSON.stringify(e));

            return {
                error: true
            };
        }
    }
};

module.exports = gr4vyServiceWrapper;
