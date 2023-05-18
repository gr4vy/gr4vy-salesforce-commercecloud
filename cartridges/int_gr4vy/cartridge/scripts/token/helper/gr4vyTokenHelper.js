'use strict';

var CacheMgr = require('dw/system/CacheMgr');
var Site = require('dw/system/Site');
var Signature = require('dw/crypto/Signature');
var StringUtils = require('dw/util/StringUtils');
var UUIDUtils = require('dw/util/UUIDUtils');

var gr4vyLogger = require('*/cartridge/scripts/util/gr4vyLogger').getGr4vyLogger();
var gr4vyConstants = require('*/cartridge/scripts/util/gr4vyConstants');
var gr4vyPreferences = require('*/cartridge/scripts/util/gr4vyPreferences');

/**
 * This function replaces non URL safe characters in a Base64 encoded string
 * with corresponding URL safe characters
 *
 * @param {string} encStr - Encoded string to be processed
 * @returns {string} URL safe string
 */
function convertEncodedStringToURLSafe(encStr) {
    var urlSafeString = encStr;
    urlSafeString = urlSafeString.replace(/=/g, '');
    urlSafeString = urlSafeString.replace(/\+/g, '-');
    urlSafeString = urlSafeString.replace(/\//g, '_');
    return urlSafeString;
}

/**
 * This function returns a url safe base 64 encoded string
 *
 * @param {string} str - String to be encoded
 * @returns {string} URL safe base 64 encoded string
 */
function getBase64URLEncode(str) {
    var base64EncStr = StringUtils.encodeBase64(str);
    return convertEncodedStringToURLSafe(base64EncStr);
}

/**
 * Private function
 * Generates the JWT Header JSON
 *
 * @returns{string} - Stringified version of JWT Header JSON
 */
function generateJWTHeaderJSON() {
    return JSON.stringify({
        typ: 'JWT',
        alg: 'RS512',
        kid: gr4vyPreferences.getPEMThumbprint()
    });
}

/**
 * Private function
 * Retrieves the JWT Header from Custom cache and creates an entry if one does not exist.
 * The value returned is URL safe base64 encoded.
 *
 * @returns {Object} JWT Header JSOn
 */
function getEncodedJWTHeader() {
    var header = '';
    try {
        var jwtTokenHeaderCache = CacheMgr.getCache(gr4vyConstants.TOKEN_HEADER_CUSTOM_CACHE_ID);
        if (jwtTokenHeaderCache) {
            var jwtTokenHeader = jwtTokenHeaderCache.get(Site.current.ID, function () {
                return generateJWTHeaderJSON();
            });
            header = jwtTokenHeader;
        }
    } catch (e) {
        gr4vyLogger.error('generateJWTHeader() : Error Occurred while retrieving from Custom Cache. Error Details : ' + e.message);
        header = generateJWTHeaderJSON();
    }
    return getBase64URLEncode(header);
}

/**
 * Private function
 * Generates the JWT Claims JSON
 * The value returned is URL safe base64 encoded.
 *
 * @param {Object} data - JSON object holding data required for creating claims
 * @param {string} amount - Amount to be set (if applicable for API)
 *
 * @returns {Object} - JWT Claims JSON
 */
function generateEncodedJWTClaims(data) {
    var currentTime = new Date().getTime();
    var currentTimeInSeconds = new Number((new Number(currentTime / 1000)).toFixed()); //eslint-disable-line
    var expiryTimeInSeconds = currentTimeInSeconds + (gr4vyConstants.TOKEN_EXPIRY_TIME_IN_MINUTES * 60);

    var uniqueIdentifier = UUIDUtils.createUUID();

    var scopes = gr4vyConstants.TOKEN_DEFAULT_SCOPES;
    if (data && 'scopes' in data) {
        scopes = data.scopes;
    }

    var claims = {
        iss: gr4vyConstants.TOKEN_CLAIMS_ISS,
        nbf: currentTimeInSeconds,
        exp: expiryTimeInSeconds,
        jti: uniqueIdentifier,
        scopes: scopes
    };

    var claimsDataAttr = {};
    if (data) {
        if ('buyerID' in data) {
            claimsDataAttr.buyer_id = data.buyerID;
        }
        if ('amount' in data) {
            claimsDataAttr.amount = data.amount;
        }
        if ('currency' in data) {
            claimsDataAttr.currency = data.currency;
        }
        if ('cartItems' in data) {
            claimsDataAttr.cartItems = data.cartItems;
        }
        if ('metadata' in data) {
            claimsDataAttr.metadata = data.metadata;
        }
        claims.embed = claimsDataAttr;
    }

    return getBase64URLEncode(JSON.stringify(claims));
}

/**
 * Private function
 * Generates JWT Signature
 *
 * @param {Object} encJWTHeader - Encoded JWT header
 * @param {Object} encJWTClaims - Encoded JWT Claims
 *
 * @returns {string} Signature generated
 */
function generateEncodedJWTSignature(encJWTHeader, encJWTClaims) {
    try {
        var privateKey = gr4vyPreferences.getPrivateKey();
        privateKey = privateKey.replace(/\n/g, '');

        var contentToSign = encJWTHeader + '.' + encJWTClaims;
        var contentToSignEnc = getBase64URLEncode(contentToSign);

        var signature = new Signature();
        var token = signature.sign(contentToSignEnc, privateKey, gr4vyConstants.TOKEN_SIGNATURE_ALGORITHM);
        // The signed token provided by SFCC is already base 64 encoded hence we only need to get
        // a URL safe version of the same
        token = convertEncodedStringToURLSafe(token);

        return token;
    } catch (e) {
        gr4vyLogger.error('generateEncodedJWTSignature() : Error Occurred while generating signature. Error Details : ' + e.message);
    }
    return '';
}

/**
 * Generates JWT Token to be set in Authorization header for API calls and Embed checkout
 *
 * @param {Object} data - JSON object with buyer id, amount and scope wherever applicable.
 * Sample JSON
 * { 'buyerID': '<<Buyer ID', amount: '<<amount as string>>', currency: '<<currency>>', cartItems: '<<as per Gr4vy documentation>>'}
 *
 * @returns {string} JWT Token
 */
function generateToken(data) {
    try {
        var base64EncHeader = getEncodedJWTHeader();
        var base64EncClaims = generateEncodedJWTClaims(data);

        if (base64EncHeader && base64EncClaims) {
            var base64EncSignature = generateEncodedJWTSignature(base64EncHeader, base64EncClaims);
            if (base64EncSignature) {
                return base64EncHeader + '.' + base64EncClaims + '.' + base64EncSignature;
            }
        }
    } catch (e) {
        gr4vyLogger.error('generateToken() : Error Occurred while generating JWT. Error Details : ' + e.message);
    }
    gr4vyLogger.error('generateToken() : JWT token was not generated');
    return null;
}

module.exports = {
    generateToken: generateToken
};
