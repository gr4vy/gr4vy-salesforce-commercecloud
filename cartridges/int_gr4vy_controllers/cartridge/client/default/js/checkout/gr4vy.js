'use strict';

/**
 * Initialize the gr4vy payment UI.
 * Before payment create, review the billing data and create payment instrument.
 * Abort payment in case of any issues.
 */
function initializeGr4vyPayment() {
    var token = $("#gr4vy-data").data('token');
    var gr4vyId = $("#gr4vy-data").data('gr4vyid');
    var environment = $("#gr4vy-data").data('environment');
    var intent = $("#gr4vy-data").data('intent');
    var store = $("#gr4vy-data").data('store') ? $("#gr4vy-data").data('store') : false;
    var metadata = $("#gr4vy-data").data('metadata');
    var paymentSource = $("#gr4vy-data").data('paymentsource');
    var display = $("#gr4vy-data").data('display');
    var statementDescriptor = $("#gr4vy-data").data('statementdescriptor');
    var requireSecurityCode = $("#gr4vy-data").data('requiresecuritycode') ? $("#gr4vy-data").data('requiresecuritycode') : false;
    var amount = parseInt($("#gr4vy-data").data('amount'));
    var currency = $("#gr4vy-data").data('currency');
    var country = $("#gr4vy-data").data('country').toUpperCase();
    var locale = $("#gr4vy-data").data('locale');
    var buyerId = $("#gr4vy-data").data('buyerid');
    var cartItems = $("#gr4vy-data").data('cartitems');
    var gr4vyFonts = $("#gr4vy-data").data('gr4vy-fonts');
    var gr4vyColors = $("#gr4vy-data").data('gr4vy-colors');
    var gr4vyGr4vyBorderWidths = $("#gr4vy-data").data('gr4vy-border-widths');
    var gr4vyGr4vyRadii = $("#gr4vy-data").data('gr4vy-radii');
    var gr4vyGr4vyFocusRing = $("#gr4vy-data").data('gr4vy-focus-ring');
    var handleGr4vyRedirect = $("#gr4vy-data").data('handle-redirect');

    var options = {};
    options = token ? {...options, token} : options;
    options = gr4vyId ? {...options, gr4vyId} : options;
    options = environment ? {...options, environment} : options;
    options = metadata ? {...options, metadata} : options;
    options = paymentSource ? {...options, paymentSource} : options;
    options = display ? {...options, display} : options;
    options = statementDescriptor ? {...options, statementDescriptor} : options;
    options = requireSecurityCode ? {...options, requireSecurityCode} : options;
    options = {...options, intent};
    options = {...options, store};

    var orderIdentifier;

    var embed = gr4vy.setup({
        ...options,
		element: ".gr4vy-container",
		amount,
		currency,
        country,
        locale,
		buyerId,
        cartItems,
        theme: {
            colors: gr4vyColors ? gr4vyColors : '',
            borderWidths: gr4vyGr4vyBorderWidths ? gr4vyGr4vyBorderWidths : '',
            radii: gr4vyGr4vyRadii ? gr4vyGr4vyRadii : '',
            fonts: gr4vyFonts ? gr4vyFonts : '',
            shadows: gr4vyGr4vyFocusRing ? gr4vyGr4vyFocusRing : ''
        },
		onBeforeTransaction: async (metadata) => {
			try {
                orderIdentifier = '';
				var getOrderId = new Promise((resolve, reject) => {
                    $.ajax({
                        url: $('.place-order').data('action')+'?isGr4vyOrder='+true,
                        method: 'POST',
                        success: function (data) {
                            if (data.error) {
                                if (data.cartError) {
                                    $('.error-form').show();
                                    $('.error-form').text(data.errorMessage);
                                    $('body').trigger('gr4vyCheckout:reIntialize');
                                } else {
                                    window.location.href = data.continueUrl;
                                }
                            } else if(data.orderID){
                                orderIdentifier = data.orderID;
								resolve(data)
                            } else {
                                window.location.reload();
                            }
                        },
                        error: function (err) {
                            console.log(err);
                            throw new Error("Error. Please try again");
                        }
                    });
				});
				const orderData = await getOrderId;
				return {
                    externalIdentifier: orderData.orderID,
                    shippingDetailsId: orderData.shippingDetailsId
				}
			} catch(err) {
				console.log(err);
                throw new Error("Error. Please try again");
			}
		  },
		onComplete: function (transaction) {
            $.ajax({
                url: handleGr4vyRedirect,
                method: 'POST',
                data: {
                    transaction: JSON.stringify(transaction),
                    orderID: transaction.externalIdentifier
                },
                success: function (data) {
                    if (data.error) {
                        if (data.cartError) {
                            window.location.href = data.redirectUrl;
                        }
                        if (data.errorMessage) {
                            $('.error-form').show();
                            $('.error-form').text(data.errorMessage);
                        } else {
                            window.location.href = data.redirectUrl;
                        }
                    } else {
                        var redirect = $('<form>')
                            .appendTo(document.body)
                            .attr({
                                method: 'POST',
                                action: data.continueUrl
                            });

                        $('<input>')
                            .appendTo(redirect)
                            .attr({
                                name: 'orderID',
                                value: data.orderID
                            });

                        $('<input>')
                            .appendTo(redirect)
                            .attr({
                                name: 'orderToken',
                                value: data.orderToken
                            });

                        redirect.submit();
                    }
                },
                error: function (err) {
                    console.log(err);
                }
            });
        },
        onEvent: function (customEvent, transaction) {
            if (customEvent === 'transactionFailed' || customEvent === 'transactionCancelled' || customEvent === 'apiError') {
                var orderID = orderIdentifier;
                if (transaction) {
                    if (transaction.externalIdentifier) {
                        orderID = transaction.externalIdentifier;
                    }
                    if (transaction.type === 'error' && transaction.code === 'bad_request') {
                        orderID = orderIdentifier;
                    }
                }
                $.ajax({
                    url: handleGr4vyRedirect,
                    method: 'POST',
                    data: {
                        transaction: JSON.stringify(transaction),
                        orderID: orderID
                    },
                    success: function (data) {
                        if(data.error && data.redirectUrl) {
                            window.location.href = data.redirectUrl;
                        }
                    }
                });
            }
        }
    });

	return embed;
}

function saveGr4vyData(data) {
    $("#gr4vy-data").data('token', data.gr4vyClientEmbedToken);
    $("#gr4vy-data").data('gr4vyid', data.gr4vyId);
    $("#gr4vy-data").data('environment', data.gr4vyEnvironment);
    $("#gr4vy-data").data('intent', data.gr4vyIntent);
    $("#gr4vy-data").data('store', data.gr4vyStore);
    $("#gr4vy-data").data('metadata', data.gr4vyMetadata);
    $("#gr4vy-data").data('paymentsource', data.gr4vyPaymentSource);
    $("#gr4vy-data").data('display', data.gr4vyDisplay);
    $("#gr4vy-data").data('statementdescriptor', data.gr4vyStatementDescriptor);
    $("#gr4vy-data").data('requiresecuritycode', data.gr4vyRequireSecurityCode);
    $("#gr4vy-data").data('amount', data.gr4vyTotalGrossPrice);
    $("#gr4vy-data").data('currency', data.gr4vyCurrencyCode);
    $("#gr4vy-data").data('country', data.address.countryCode);
    $("#gr4vy-data").data('locale', data.gr4vyLocale);
    $("#gr4vy-data").data('buyerid', data.gr4vyBuyerId);
    $("#gr4vy-data").data('cartitems', data.gr4vyCartItems.key);
    $("#gr4vy-data").data('gr4vy-fonts', data.gr4vyStylingObject.stylingGr4vyFonts);
    $("#gr4vy-data").data('gr4vy-colors', data.gr4vyStylingObject.stylingGr4vyColors);
    $("#gr4vy-data").data('gr4vy-border-widths', data.gr4vyStylingObject.stylingGr4vyBorderWidths);
    $("#gr4vy-data").data('gr4vy-radii', data.gr4vyStylingObject.stylingGr4vyRadii);
    $("#gr4vy-data").data('gr4vy-focus-ring', data.gr4vyStylingObject.stylingGr4vyFocusRing);
}

module.exports = {
    initializeGr4vyPayment: initializeGr4vyPayment,
    saveGr4vyData: saveGr4vyData
};