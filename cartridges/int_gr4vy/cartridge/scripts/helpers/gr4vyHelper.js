/* eslint-disable no-param-reassign */
'use strict';

var URLUtils = require('dw/web/URLUtils');
var Money = require('dw/value/Money');
var Resource = require('dw/web/Resource');
var OrderMgr = require('dw/order/OrderMgr');
var TaxMgr = require('dw/order/TaxMgr');

var Transaction = require('dw/system/Transaction');
var gr4vyServiceWrapper = require('*/cartridge/scripts/services/gr4vyServiceWrapper');
var Constants = require('*/cartridge/scripts/util/gr4vyConstants');
var gr4vyLogger = require('*/cartridge/scripts/util/gr4vyLogger').getGr4vyLogger();

/**
 * Get a product's price without decimals & negative value.
 *
 * @param {dw.value.Money} price - price
 * @return {string} - Updated price value
 */
function getPriceValue(price) {
    return price.multiply(100).value;
}

/**
 * check if given phone number is in e164 format
 *
 * @param {string} text the phone number
 * @return {boolean} - e164 validity status
 */
function isValidE164(text) {
    try {
        return text.match(/^\+[1-9]\d{1,14}$/);
    } catch (e) {
        return false;
    }
}

/**
 * clean up leading 0s and special characters except + from phone number
 *
 * @param {string} phone the phone number
 * @return {string} - formatted phone number
 */
function formatPhoneNumber(phone) {
    try {
        var phoneFormatted = phone.replace(/^0+/, ''); // remove leading 0 if any
        phoneFormatted = phoneFormatted.replace(/[^+\d]+/g, ''); // remove any characters other than + or digits
        return phoneFormatted;
    } catch (e) {
        return phone;
    }
}

/**
 * get locale in gr4vy format
 *
 * @return {string} - formatted locale
 */
function getLocale() {
    var Site = require('dw/system/Site');
    var locale = 'en'; // 'en' is used since gr4vy do not accept empty value and 'en' is the default gr4vy value
    try {
        locale = request.getLocale();
        if (locale === 'default') {
            locale = Site.getCurrent().getDefaultLocale();
        }
        locale = locale.toLowerCase();
        locale = locale.replace(/_/g, '-');
    } catch (e) {
        return locale;
    }
    return locale;
}

/**
 *
 * @param {Object} priceAdjustments an object of price adjustments
 * @param {string} currencyCode currency code
 * @returns {string} discount amount
 */
function getDiscountAmount(priceAdjustments, currencyCode) {
    var discountAmt = new Money(0.0, currencyCode);
    if (priceAdjustments) {
        var priceAdjustmentsItr = priceAdjustments.iterator();
        while (priceAdjustmentsItr.hasNext()) {
            var priceAdj = priceAdjustmentsItr.next();
            if (priceAdj && priceAdj.promotion !== null) {
                discountAmt = discountAmt.add(priceAdj.getPrice());
            }
        }
    }

    discountAmt = Math.abs(discountAmt.multiply(-100).value);

    return discountAmt;
}
/**
 *
 * @param {*} product product
 * @returns {array} categoriesArray
 */
function getCategories(product) {
    var categoriesArray = [];
    var categories = [];
    if (product.categories && product.categories.length > 0) {
        categories = product.categories;
    } else if (product.masterProduct && product.masterProduct.categories && product.masterProduct.categories.length > 0) {
        categories = product.masterProduct.categories;
    }
    for (var i = 0; i < categories.length; i++) {
        categoriesArray.push(categories[i].displayName);
    }
    return categoriesArray;
}
/**
 *
 * @param {dw.order.Basket} basket The customer basket.
 * @returns {dw.util.ArrayList} the Gr4vy product cart item details.
 */
function getProductItems(basket) {
    var cartProductItems = [];
    var productLineItems = basket.getProductLineItems().iterator();

    while (productLineItems.hasNext()) {
        var productLineItem = productLineItems.next();
        var product = productLineItem.product;

        var image = product.getImage('medium', 0);
        var taxAmount = new Money(0.0, basket.currencyCode);
        if (TaxMgr.taxationPolicy === TaxMgr.TAX_POLICY_NET) {
            taxAmount = productLineItem.getAdjustedTax();
        }
        var unitAmount = new Money(0.0, basket.currencyCode);
        for (var i = 0; i < productLineItem.getOptionProductLineItems().size(); i++) {
            unitAmount = unitAmount.add(productLineItem.getOptionProductLineItems()[i].getBasePrice());
            if (TaxMgr.taxationPolicy === TaxMgr.TAX_POLICY_NET) {
                taxAmount = taxAmount.add(productLineItem.getOptionProductLineItems()[i].getAdjustedTax());
            }
        }
        unitAmount = unitAmount.add(productLineItem.getBasePrice());
        taxAmount = getPriceValue(taxAmount);
        var productObj = {
            name: productLineItem.productName,
            quantity: productLineItem.quantityValue,
            unitAmount: getPriceValue(unitAmount),
            discountAmount: getDiscountAmount(productLineItem.priceAdjustments, basket.currencyCode),
            taxAmount: taxAmount,
            externalIdentifier: productLineItem.productID,
            sku: productLineItem.productID,
            productUrl: URLUtils.url('Product-Show', 'pid', product.ID).abs().toString(),
            imageUrl: image.getURL().abs().toString(),
            categories: getCategories(product),
            productType: 'physical'
        };
        cartProductItems.push(productObj);
    }
    return cartProductItems;
}

/**
 *
 * @param {dw.order.Basket} basket The customer basket.
 * @returns {dw.util.ArrayList} the Gr4vy shipping cart item details.
 */
function getShippingItems(basket) {
    var shippingItems = [];
    var shipmentsIterator = basket.shipments.iterator();

    while (shipmentsIterator.hasNext()) {
        var shipment = shipmentsIterator.next();
        var shippingLineItemsIterator = shipment.getShippingLineItems().iterator();
        while (shippingLineItemsIterator.hasNext()) {
            var shippingLineItem = shippingLineItemsIterator.next();
            var taxAmount = 0;
            if (TaxMgr.taxationPolicy === TaxMgr.TAX_POLICY_NET) {
                taxAmount = getPriceValue(shipment.getAdjustedShippingTotalTax());
            }
            var shippingObj = {
                name: shipment.shippingMethod.displayName,
                quantity: 1,
                unitAmount: getPriceValue(shipment.getShippingTotalPrice()),
                discountAmount: getDiscountAmount(shippingLineItem.shippingPriceAdjustments, basket.currencyCode),
                taxAmount: taxAmount,
                externalIdentifier: shipment.shippingMethodID,
                sku: shipment.shippingMethodID,
                categories: [],
                productType: 'shipping_fee'
            };

            shippingItems.push(shippingObj);
        }
    }
    return shippingItems;
}

/**
 *
 * @param {Object} priceAdjustments an object of price adjustments
 * @param {string} currencyCode currency code
 * @returns {string} discount amount
 */
function getOrderLevelDiscountAmount(priceAdjustments, currencyCode) {
    var discountAmt = new Money(0.0, currencyCode);
    if (priceAdjustments) {
        var priceAdjustmentsItr = priceAdjustments.iterator();
        while (priceAdjustmentsItr.hasNext()) {
            var priceAdj = priceAdjustmentsItr.next();
            if (priceAdj && priceAdj.promotion !== null) {
                discountAmt = discountAmt.add(priceAdj.getGrossPrice());
            }
        }
    }

    discountAmt = Math.abs(discountAmt.multiply(-100).value);

    return discountAmt;
}

/**
 *
 * @param {dw.order.Basket} basket The customer basket.
 * @returns {Object} the Gr4vy order price adjustment detail object.
 */
function getOrderAdjustmentItems(basket) {
    var orderPriceAdjustments = basket.getPriceAdjustments();

    var orderAdjustmentObj = {
        name: 'Discount',
        quantity: 1,
        unitAmount: 0,
        discountAmount: getOrderLevelDiscountAmount(orderPriceAdjustments, basket.currencyCode),
        taxAmount: 0,
        externalIdentifier: 'Discount',
        sku: 'Discount',
        categories: [],
        productType: 'discount'
    };

    return orderAdjustmentObj;
}

/**
 *
 * @param {dw.order.Basket} basket The customer basket.
 * @returns {dw.util.ArrayList} the Gr4vy cart items.
 */
function getGr4vyCartItems(basket) {
    var cartItems = [];
    var productLineItems = getProductItems(basket);
    var shippingLineItems = getShippingItems(basket);
    productLineItems.forEach(function (productItems) {
        cartItems.push(productItems);
    });

    shippingLineItems.forEach(function (shippingItems) {
        cartItems.push(shippingItems);
    });
    var getOrderAdjustmentItem = getOrderAdjustmentItems(basket);
    if (getOrderAdjustmentItem.discountAmount !== 0) {
        cartItems.push(getOrderAdjustmentItem);
    }
    return cartItems;
}

/**
 * Checks if external_identifier exists in Gr4vy
 * @param {dw.order.Basket} currentBasket The customer basket.
 * @param {*} customerData The customer profile.
 * @returns {string} the buyer id.
 */
function searchBuyerInGr4vy(currentBasket, customerData) {
    var buyerId = '';
    var externalIdentifier;
    var customer = customerData;
    var Basket = currentBasket;
    var isregisteredCustomer = Basket.customer.registered;
    if (isregisteredCustomer) {
        externalIdentifier = Basket.customerNo;
    } else {
        externalIdentifier = Basket.customer.ID;
    }
    var result = gr4vyServiceWrapper.searchBuyer(externalIdentifier);
    if (result && !result.error) {
        // overwrite profile buyerid to eliminate buyer_id deletion in SFCC edge case
        // if external_identifier not found or if buyer_id deleted in Gr4vy buyerId remains ''
        buyerId = result.buyerId;
    }
    Transaction.wrap(function () {
        if (customerData.raw.profile) {
            customer.raw.profile.custom.gr4vyBuyerId = buyerId;
        }
        Basket.custom.gr4vyBuyerId = buyerId;
    });
    return buyerId;
}

/**
 * Creates new buyer in Gr4vy.
 * @param {dw.order.Basket} currentBasket The customer basket.
 * @param {*} customerData The customer profile.
 * @returns {string} the client token.
 */
function createBuyerInGr4vy(currentBasket, customerData) {
    var isregisteredCustomer = currentBasket.customer.registered;
    var customerDetails = {};
    var buyerId = '';
    if (isregisteredCustomer) {
        customerDetails.external_identifier = currentBasket.customerNo;
    } else {
        customerDetails.external_identifier = currentBasket.customer.ID;
    }

    var result = gr4vyServiceWrapper.createBuyer(customerDetails);
    if (result && !result.error) {
        var customer = customerData;
        var Basket = currentBasket;
        buyerId = result.buyerId;
        Transaction.wrap(function () {
            if (customerData.raw.profile) {
                customer.raw.profile.custom.gr4vyBuyerId = result.buyerId;
            }
            Basket.custom.gr4vyBuyerId = result.buyerId;
        });
    }
    return buyerId;
}

/**
 * Update shipping and billing address in Gr4vy
 * @param {dw.order.Basket} currentBasket The customer basket.
 * @returns {boolean} the update status.
 */
function updateBuyerInGr4vy(currentBasket) {
    var buyerId = currentBasket.custom.gr4vyBuyerId;
    var shippingDetailsId;
    var customerDetails = {};
    customerDetails.billing_details = {};
    customerDetails.billing_details.address = {};
    customerDetails.billing_details.address.line1 = currentBasket.billingAddress.address1;
    customerDetails.billing_details.address.line2 = currentBasket.billingAddress.address2 ? currentBasket.billingAddress.address2 : null;
    customerDetails.billing_details.address.city = currentBasket.billingAddress.city;
    customerDetails.billing_details.address.country = currentBasket.billingAddress.countryCode.value.toUpperCase();
    customerDetails.billing_details.address.postal_code = currentBasket.billingAddress.postalCode;
    var billingPhone = formatPhoneNumber(currentBasket.billingAddress.phone);
    customerDetails.billing_details.address.state = currentBasket.billingAddress.stateCode;
    var e164prefix = '';
    if (!isValidE164(billingPhone) && currentBasket.billingAddress.countryCode) {
        e164prefix = Resource.msg('e164prefix.' + currentBasket.billingAddress.countryCode.value.toUpperCase(), 'gr4vy', null);
    }
    customerDetails.billing_details.phone_number = e164prefix + billingPhone;
    customerDetails.billing_details.email_address = currentBasket.customerEmail;
    customerDetails.billing_details.first_name = currentBasket.billingAddress.firstName;
    customerDetails.billing_details.last_name = currentBasket.billingAddress.lastName;
    customerDetails.display_name = currentBasket.billingAddress.fullName;
    var result = gr4vyServiceWrapper.updateBuyerBilling(customerDetails, buyerId);
    if (!result.error) {
        var customerDetailsShipping = {};
        customerDetailsShipping.address = {};
        customerDetailsShipping.address.city = currentBasket.shipments[0].shippingAddress.city;
        customerDetailsShipping.address.country = currentBasket.shipments[0].shippingAddress.countryCode.value.toUpperCase();
        customerDetailsShipping.address.line1 = currentBasket.shipments[0].shippingAddress.address1;
        customerDetailsShipping.address.line2 = currentBasket.shipments[0].shippingAddress.address2 ? currentBasket.shipments[0].shippingAddress.address2 : null;
        customerDetailsShipping.address.postal_code = currentBasket.shipments[0].shippingAddress.postalCode;
        customerDetailsShipping.address.state = currentBasket.shipments[0].shippingAddress.stateCode;
        customerDetailsShipping.email_address = currentBasket.customerEmail;
        customerDetailsShipping.first_name = currentBasket.shipments[0].shippingAddress.firstName;
        customerDetailsShipping.last_name = currentBasket.shipments[0].shippingAddress.lastName;
        var shippingPhone = formatPhoneNumber(currentBasket.shipments[0].shippingAddress.phone);
        var e164prefixShipping = '';
        if (!isValidE164(shippingPhone) && currentBasket.shipments[0].shippingAddress.countryCode) {
            e164prefixShipping = Resource.msg('e164prefix.' + currentBasket.shipments[0].shippingAddress.countryCode.value.toUpperCase(), 'gr4vy', null);
        }
        customerDetailsShipping.phone_number = e164prefixShipping + shippingPhone;
        var resultShipping = gr4vyServiceWrapper.updateBuyerShipping(customerDetailsShipping, buyerId);
        shippingDetailsId = resultShipping.shippingDetailsId;
        if (resultShipping.error) {
            return {
                success: false
            };
        }
    } else {
        return {
            success: false
        };
    }
    return {
        success: true,
        shippingDetailsId: shippingDetailsId
    };
}


/**
 * Creates a client embed token.
 * @param {dw.order.Basket} currentBasket The customer basket.
 * @param {string} gr4vyBuyerId - gr4vyBuyerId
 * @param {Object} gr4vyCartItems - gr4vyCartItems
 * @param {Object} metadata - metadata
 * @returns {string} the client token.
 */
function createClientEmbedToken(currentBasket, gr4vyBuyerId, gr4vyCartItems, metadata) {
    var basket = currentBasket;
    var Gr4vyEmbedTokenModel = require('*/cartridge/scripts/token/gr4vyEmbedTokenModel');
    var gr4vyEmbedToken = new Gr4vyEmbedTokenModel();
    var currencyCode = basket.currencyCode;
    var totalGrossPrice = (basket.totalGrossPrice).multiply(100);
    gr4vyEmbedToken.setAmount(totalGrossPrice.value);
    gr4vyEmbedToken.setCurrency(currencyCode);
    gr4vyEmbedToken.setBuyerID(gr4vyBuyerId);
    gr4vyEmbedToken.setCartItems(gr4vyCartItems);
    gr4vyEmbedToken.setMetadata(metadata);
    var token = gr4vyEmbedToken.generate();

    Transaction.wrap(function () {
        basket.custom.gr4vyTotalGrossPrice = totalGrossPrice.value;
    });
    return token;
}

/**
 * Creates a viewdata with Gr4vy data.
 * @param {dw.order.Basket} basket The customer basket.
 * @param {Object} viewData - gr4vyBuyerId
 * @param {Object} customerData - gr4vyCartItems
 * @returns {Object} customerData.
 */
function updateViewDataWithGr4vyData(basket, viewData, customerData) {
    var currentBasket = basket;
    var gr4vyPreferences = require('*/cartridge/scripts/util/gr4vyPreferences');
    var buyerID;
    var viewDataUpdated = viewData;

    viewDataUpdated.gr4vyMetadata = gr4vyPreferences.getMetaData();
    viewDataUpdated.gr4vyPaymentSource = gr4vyPreferences.getPaymentSource();
    viewDataUpdated.gr4vyDisplay = gr4vyPreferences.getDisplay();

    var isregisteredCustomer = currentBasket.customer.registered;
    var isAuthenticatedCustomer = currentBasket.customer.authenticated;
    if (isregisteredCustomer && isAuthenticatedCustomer) {
        viewDataUpdated.gr4vyStore = gr4vyPreferences.getStore();
    } else {
        viewDataUpdated.gr4vyStore = false;
    }

    var intent = gr4vyPreferences.getIntent();
    if (intent) {
        intent = 'authorize';
    } else {
        intent = 'capture';
    }
    viewDataUpdated.gr4vyIntent = intent;
    viewDataUpdated.gr4vyStatementDescriptor = gr4vyPreferences.getStatementDescriptor();
    viewDataUpdated.gr4vyId = gr4vyPreferences.getGr4vyId();
    viewDataUpdated.gr4vyEnvironment = gr4vyPreferences.getEnvironment();
    viewDataUpdated.gr4vyRequireSecurityCode = gr4vyPreferences.getRequireSecurityCode();
    viewDataUpdated.gr4vyStylingObject = gr4vyPreferences.getGr4vyStylingObject();
    viewDataUpdated.gr4vyLocale = getLocale();

    if (currentBasket) {
        // check if external_identifier exists in Gr4vy side and return buyerId
        // reset buyerId to '' if no result found
        buyerID = searchBuyerInGr4vy(currentBasket, customerData);

        if (!buyerID) {
            buyerID = createBuyerInGr4vy(currentBasket, customerData);
            if (!buyerID) {
                // An error from Gr4vy side will result in buyerID = ''
                // return error
                viewDataUpdated.error = true;
                return viewDataUpdated;
            }
        }

        viewDataUpdated.gr4vyBuyerId = buyerID;
        var gr4vyCartItems = getGr4vyCartItems(currentBasket);
        viewDataUpdated.gr4vyCartItems = { key: gr4vyCartItems };
        viewDataUpdated.gr4vyCurrencyCode = currentBasket.currencyCode;
        viewDataUpdated.gr4vyTotalGrossPrice = (currentBasket.totalGrossPrice).multiply(100).value;

        if (viewData.address && viewData.address.countryCode) {
            viewDataUpdated.gr4vyCountryCode = viewData.address.countryCode;
        } else if (currentBasket.shipments && currentBasket.shipments[0] && currentBasket.shipments[0].shippingAddress) {
            viewDataUpdated.gr4vyCountryCode = currentBasket.shipments[0].shippingAddress.countryCode.value;
        }
        viewDataUpdated.gr4vyClientEmbedToken = createClientEmbedToken(currentBasket, buyerID, gr4vyCartItems, viewDataUpdated.gr4vyMetadata);
    }
    return viewDataUpdated;
}

/**
 * returns order.
 * @param {string} gr4vyOrderID - gr4vyOrderID
 * @returns {dw.order} the order.
 */
function getGr4vyOrder(gr4vyOrderID) {
    var order;
    var orderNo = session.privacy.orderNo; // eslint-disable-line
    if (gr4vyOrderID === orderNo) {
        order = OrderMgr.getOrder(orderNo) ? OrderMgr.getOrder(orderNo) : null;
    }

    return order;
}

/**
 * Update order instruction
 * @param {Object} order order object
 * @param {Object} transactionData response object
 */
function updateTransactionStatus(order, status) {
    var transactionStatus = order.custom.gr4vyTransactionStatus.slice();
    transactionStatus.push(status);
    order.custom.gr4vyTransactionStatus = transactionStatus; //eslint-disable-line
}

/**
 * updates order
 * @param {dw.order} order - order.
 * @param {string} transactionDetails - transactionDetails
 * @returns {*} response
 */
function updateOrderDetails(order, transactionDetails) {
    var transactionData = transactionDetails.result;
    try {
        order.custom.gr4vyPaymentTransactionId = transactionData.id;
        order.custom.gr4vyTransactionAmount = transactionData.amount;
        order.custom.gr4vyPaymentServiceName = (transactionData.payment_service && transactionData.payment_service.display_name) ? transactionData.payment_service.display_name : '';
        order.custom.gr4vyTransactionDetails = JSON.stringify(transactionDetails);
        var paymentInstruments = order.paymentInstruments;
        var gr4vyPaymentMethodScheme = '';
        if (transactionData.payment_method && transactionData.payment_method.method.toLowerCase() === 'card') {
            gr4vyPaymentMethodScheme = transactionData.payment_method.scheme;
        }
        for (var i = 0; i < paymentInstruments.length; i++) {
            var paymentInstrument = paymentInstruments[i];
            if (paymentInstrument.paymentMethod === Constants.GR4VY_ID) {
                paymentInstrument.paymentTransaction.setTransactionID(transactionData.id);
                paymentInstrument.custom.gr4vyPaymentMethod = transactionData.payment_method.method;
                paymentInstrument.custom.gr4vyPaymentMethodScheme = gr4vyPaymentMethodScheme;
                break;
            }
        }
    } catch (e) {
        gr4vyLogger.error('Error on updating gr4vy order status details for orderNo.' + order.getOrderNo());
    }
}

/**
 * updates order
 * @param {dw.order} currentOrder - order.
 * @param {string} transactionDetails - transactionDetails
 * @returns {*} transactionData
 */
function updateGr4vyOrderDetails(currentOrder, transactionDetails) {
    var Order = require('dw/order/Order');
    var order = currentOrder;
    var result = { error: false };
    try {
        if (transactionDetails) {
            var callbackData = JSON.parse(transactionDetails);
            var APIDetails = gr4vyServiceWrapper.getTransactionDetails(callbackData.id);
            if (!APIDetails.error) {
                var transactionData = APIDetails.result;
                Transaction.wrap(function () {
                    if (transactionData.status === Constants.CAPTURE_SUCCEEDED) {
                        order.setPaymentStatus(Order.PAYMENT_STATUS_PAID);
                    }

                    if (transactionData.status === Constants.AUTHORIZATION_DECLINED || transactionData.status === Constants.AUTHORIZATION_FAILED) {
                        result.error = true;
                    } else if (transactionData.type === 'error' && transactionData.code === 'bad_request') {
                        // handle Gr4vy server transaction failure scenarios like amount mismatch in payload
                        result.error = true;
                    }

                    if (transactionData.status === Constants.PROCESSING || (transactionData.intent === Constants.CAPTURE && transactionData.status === Constants.CAPTURE_PENDING)) {
                        order.setExportStatus(Order.EXPORT_STATUS_NOTEXPORTED);
                    }
                    updateTransactionStatus(currentOrder, transactionData.status);
                    updateOrderDetails(order, APIDetails);
                });
                if (order.paymentInstruments.length === 0) {
                    gr4vyLogger.error('paymentInstrument missing for the order, orderNo.' + order.getOrderNo());
                    result.error = true;
                }
            } else {
                result.error = true;
            }
        } else {
            result.error = true;
        }
    } catch (e) {
        gr4vyLogger.error('Error on updating gr4vy order status details for orderNo.' + order.getOrderNo());
        gr4vyLogger.error('Error on updating gr4vy order status details.' + JSON.stringify(e));
        result.error = true;
    }

    if (order && result.error) {
        Transaction.wrap(function () { OrderMgr.failOrder(order, true); });
    }

    return result;
}
/**
 *
 * @param {string} Response -Responses in case of capture,refund or void
 * @returns {string} message -Response from gr4vy in the case of capture,refund and void
 */
function savePaymentResponse(Response) {
    var message = '';
    var response = '';
    try {
        delete Response.result.cart_items;
        response = JSON.stringify(Response.result);
        message += '\nGr4vy payment response : ' + response;
    } catch (e) {
        message = Response;
    }

    var length = Object.keys(message).length;
    if (length > 4000) {
        message = message.slice(0, 3999);
    }
    return message;
}

/**
 *
 * @param {string} req - Gr4vy Webhooks request which consists of eventtype,created time,
 * target type(transaction or refund) and targetId(transactionId).
 */
function updateGr4vyNotificationObject(req) {
    var notificationData = JSON.parse(req.body);
    var transactionId = 'transaction_id' in notificationData.target ? notificationData.target.transaction_id : notificationData.target.id;
    var refundId = 'transaction_id' in notificationData.target ? notificationData.target.id : '';

    if (transactionId) {
        var CustomObjectMgr = require('dw/object/CustomObjectMgr');
        var gr4vyNotificationId = notificationData.id;
        Transaction.wrap(function () {
            var customObject = CustomObjectMgr.createCustomObject('gr4vyNotification', gr4vyNotificationId);
            customObject.custom.gr4vyNotificationId = gr4vyNotificationId;
            customObject.custom.eventType = notificationData.type;
            customObject.custom.createdAt = notificationData.created_at;
            customObject.custom.targetType = notificationData.target.type;
            customObject.custom.targetId = transactionId;
            customObject.custom.refundId = refundId;
        });
    }
    gr4vyLogger.debug('Gr4vy notification payload:' + JSON.stringify(notificationData));
}
/**
* check order amount and gr4vy amount is the same to prevent multi-tab checkout issues.
 * @param {dw.order} order order.
 * @param {string} transactionDetails - transactionDetails
 * @returns {boolean} the validateAmount status.
 */
function validateGr4vyTransactionAmount(order, transactionDetails) {
    var validateAmount = false;
    try {
        if (transactionDetails) {
            var transactionData = JSON.parse(transactionDetails);
            var gr4vyAmount = transactionData ? transactionData.amount : 0;
            var totalGrossPrice = (order.getTotalGrossPrice()).multiply(100);
            if (gr4vyAmount === totalGrossPrice.value) {
                validateAmount = true;
            }
        }
        return validateAmount;
    } catch (e) {
        gr4vyLogger.error('Error on getting gr4vy transaction details for orderNo.' + order.getOrderNo());
        gr4vyLogger.error('Error on getting Gr4vy transaction details  details.' + JSON.stringify(e));
        return validateAmount;
    }
}


module.exports = {
    createBuyerInGr4vy: createBuyerInGr4vy,
    updateBuyerInGr4vy: updateBuyerInGr4vy,
    getGr4vyCartItems: getGr4vyCartItems,
    updateGr4vyNotificationObject: updateGr4vyNotificationObject,
    createClientEmbedToken: createClientEmbedToken,
    updateViewDataWithGr4vyData: updateViewDataWithGr4vyData,
    getGr4vyOrder: getGr4vyOrder,
    updateGr4vyOrderDetails: updateGr4vyOrderDetails,
    validateGr4vyTransactionAmount: validateGr4vyTransactionAmount,
    savePaymentResponse: savePaymentResponse,
    updateOrderDetails: updateOrderDetails,
    updateTransactionStatus: updateTransactionStatus
};
