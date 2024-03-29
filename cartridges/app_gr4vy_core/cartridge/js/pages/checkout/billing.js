'use strict';

var ajax = require('../../ajax'),
    formPrepare = require('./formPrepare'),
    giftcard = require('../../giftcard'),
    util = require('../../util'),
    // Gr4vy - Begin
    gr4vy = require('../../../../../int_gr4vy_controllers/cartridge/client/default/js/checkout/gr4vy'),
    Constants = require('../../../../../int_gr4vy/cartridge/scripts/util/gr4vyConstants');
    // Gr4vy - End
/**
 * @function
 * @description Fills the Credit Card form with the passed data-parameter and clears the former cvn input
 * @param {Object} data The Credit Card data (holder, type, masked number, expiration month/year)
 */
function setCCFields(data) {
    var $creditCard = $('[data-method="CREDIT_CARD"]');
    $creditCard.find('input[name$="creditCard_owner"]').val(data.holder).trigger('change');
    $creditCard.find('select[name$="_type"]').val(data.type).trigger('change');
    $creditCard.find('input[name*="_creditCard_number"]').val(data.maskedNumber).trigger('change');
    $creditCard.find('[name$="_month"]').val(data.expirationMonth).trigger('change');
    $creditCard.find('[name$="_year"]').val(data.expirationYear).trigger('change');
    $creditCard.find('input[name$="_cvn"]').val('').trigger('change');
}

/**
 * @function
 * @description Updates the credit card form with the attributes of a given card
 * @param {String} cardID the credit card ID of a given card
 */
function populateCreditCardForm(cardID) {
    // load card details
    var url = util.appendParamToURL(Urls.billingSelectCC, 'creditCardUUID', cardID);
    ajax.getJson({
        url: url,
        callback: function (data) {
            if (!data) {
                window.alert(Resources.CC_LOAD_ERROR);
                return false;
            }
            setCCFields(data);
        }
    });
}

/**
 * @function
 * @description Changes the payment method form depending on the passed paymentMethodID
 * @param {String} paymentMethodID the ID of the payment method, to which the payment method form should be changed to
 */
function updatePaymentMethod(paymentMethodID) {
    var $paymentMethods = $('.payment-method');
    $paymentMethods.removeClass('payment-method-expanded');

    var $selectedPaymentMethod = $paymentMethods.filter('[data-method="' + paymentMethodID + '"]');
    if ($selectedPaymentMethod.length === 0) {
        $selectedPaymentMethod = $('[data-method="Custom"]');
    }
    $selectedPaymentMethod.addClass('payment-method-expanded');

    // ensure checkbox of payment method is checked
    $('input[name$="_selectedPaymentMethodID"]').removeAttr('checked');
    $('input[value=' + paymentMethodID + ']').prop('checked', 'checked');

    formPrepare.validateForm();
}

/**
 * @function
 * @description loads billing address, Gift Certificates, Coupon and Payment methods
 */
exports.init = function () {
    var $checkoutForm = $('.checkout-billing');
    var $addGiftCert = $('#add-giftcert');
    var $giftCertCode = $('input[name$="_giftCertCode"]');
    var $addCoupon = $('#add-coupon');
    var $couponCode = $('input[name$="_couponCode"]');
    var $selectPaymentMethod = $('.payment-method-options');
    var selectedPaymentMethod = $selectPaymentMethod.find(':checked').val();

    //Gr4vy-Begin: initialize gr4vy payment
    selectedPaymentMethod = $(".isGr4vyEnabled").val() ? Constants.GR4VY_ID : selectedPaymentMethod;
    if(selectedPaymentMethod === Constants.GR4VY_ID) {
        var embed = gr4vy.initializeGr4vyPayment();
    }
    var isFormvalid = $(".isFormvalid").val() == 'true' ? true : false;
    $('form.checkout-billing').submit(function (e) {
        isFormvalid = $(".isFormvalid").val() == 'true' ? true : false;
        if ($('.payment-method.payment-method-expanded').attr('data-method') === Constants.GR4VY_ID && isFormvalid) {
            var $form = $('.checkout-billing');
            e.preventDefault();
            var addtionalData = '&isFormvalid=' + isFormvalid;
            $.ajax({
                url: $form.attr('action'),
                type: 'GET',
                data: $form.serialize() + addtionalData,
                success: function (data) {
                    if (data && data.cartError) {
                        window.location.href = data.continueURL;
                    } else if (data && data.validationError) {
                        $(".isFormvalid").val('false');
                        $('form.checkout-billing').submit();
                    }  else {
                        embed.submit();
                    }
                }
            });
        }
    });

    $('body').on('gr4vyCheckout:reIntialize', function (e) {
        embed = gr4vy.initializeGr4vyPayment();
    });
    //Gr4vy-End
    
    formPrepare.init({
        formSelector: 'form[id$="billing"]',
        continueSelector: '[name$="billing_save"]'
    });

    // default payment method to 'CREDIT_CARD'
    updatePaymentMethod((selectedPaymentMethod) ? selectedPaymentMethod : 'CREDIT_CARD');
    $selectPaymentMethod.on('click', 'input[type="radio"]', function () {
        updatePaymentMethod($(this).val());
    });

    // select credit card from list
    $('#creditCardList').on('change', function () {
        var cardUUID = $(this).val();
        if (!cardUUID) {return;}
        populateCreditCardForm(cardUUID);

        // remove server side error
        $('.required.error').removeClass('error');
        $('.error-message').remove();
    });

    $('#check-giftcert').on('click', function (e) {
        e.preventDefault();
        var $balance = $('.balance');
        if ($giftCertCode.length === 0 || $giftCertCode.val().length === 0) {
            var error = $balance.find('span.error');
            if (error.length === 0) {
                error = $('<span>').addClass('error').appendTo($balance);
            }
            error.html(Resources.GIFT_CERT_MISSING);
            return;
        }

        giftcard.checkBalance($giftCertCode.val(), function (data) {
            if (!data || !data.giftCertificate) {
                $balance.html(Resources.GIFT_CERT_INVALID).removeClass('success').addClass('error');
                return;
            }
            $balance.html(Resources.GIFT_CERT_BALANCE + ' ' + data.giftCertificate.balance).removeClass('error').addClass('success');
        });
    });

    $addGiftCert.on('click', function (e) {
        e.preventDefault();
        var code = $giftCertCode.val(),
            $error = $checkoutForm.find('.giftcert-error');
        if (code.length === 0) {
            $error.html(Resources.GIFT_CERT_MISSING);
            return;
        }

        var url = util.appendParamsToUrl(Urls.redeemGiftCert, {giftCertCode: code, format: 'ajax'});
        $.getJSON(url, function (data) {
            var fail = false;
            var msg = '';
            if (!data) {
                msg = Resources.BAD_RESPONSE;
                fail = true;
            } else if (!data.success) {
                msg = data.message.split('<').join('&lt;').split('>').join('&gt;');
                fail = true;
            }
            if (fail) {
                $error.html(msg);
                return;
            } else {
                window.location.assign(Urls.billing);
            }
        });
    });

    $addCoupon.on('click', function (e) {
        e.preventDefault();
        var $error = $checkoutForm.find('.coupon-error'),
            code = $couponCode.val();
        if (code.length === 0) {
            $error.html(Resources.COUPON_CODE_MISSING);
            return;
        }

        var url = util.appendParamsToUrl(Urls.addCoupon, {couponCode: code, format: 'ajax'});
        $.getJSON(url, function (data) {
            var fail = false;
            var msg = '';
            if (!data) {
                msg = Resources.BAD_RESPONSE;
                fail = true;
            } else if (!data.success) {
                msg = data.message.split('<').join('&lt;').split('>').join('&gt;');
                fail = true;
            }
            if (fail) {
                $error.html(msg);
                return;
            }

            //Gr4vy-Begin: reload page after applying the coupon
            if (data.success) {
                window.location.assign(Urls.billing);
            }
            //Gr4vy-End
        });
    });

    // trigger events on enter
    $couponCode.on('keydown', function (e) {
        if (e.which === 13) {
            e.preventDefault();
            $addCoupon.click();
        }
    });
    $giftCertCode.on('keydown', function (e) {
        if (e.which === 13) {
            e.preventDefault();
            $addGiftCert.click();
        }
    });
};
