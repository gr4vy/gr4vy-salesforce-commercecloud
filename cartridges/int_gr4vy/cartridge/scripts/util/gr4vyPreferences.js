'use strict';

var Site = require('dw/system/Site');
var CacheMgr = require('dw/system/CacheMgr');
var gr4vyConstants = require('*/cartridge/scripts/util/gr4vyConstants');
var gr4vyLogger = require('*/cartridge/scripts/util/gr4vyLogger').getGr4vyLogger();
var siteCustomPreferences = Site.getCurrent().preferences.custom;
var customCacheGr4vyPreferences = CacheMgr.getCache(gr4vyConstants.GR4VYPREFERENCE_CUSTOM_CACHE_ID);
var gr4vyPreferences = {};
var variableCache;

/**
 * Returns custom site preference - callback function
 * @returns {*} site preferences
 */
function putGr4vyPreferences() {
    var gr4vySitePreferences = {
        isGr4vyEnabled: siteCustomPreferences.isGr4vyEnabled,
        gr4vyEmbedScriptURL: siteCustomPreferences.gr4vyEmbedScriptURL || '',
        gr4vyMetadata: siteCustomPreferences.gr4vyMetadata || '',
        gr4vyPaymentSource: siteCustomPreferences.gr4vyPaymentSource.value || '',
        gr4vyDisplay: siteCustomPreferences.gr4vyDisplay.value || '',
        gr4vyStore: siteCustomPreferences.gr4vyStore.value || '',
        gr4vyIntent: siteCustomPreferences.gr4vyIntent,
        gr4vyStatementDescriptor: siteCustomPreferences.gr4vyStatementDescriptor || '',
        gr4vyId: siteCustomPreferences.gr4vyId,
        gr4vyEnvironment: siteCustomPreferences.gr4vyEnvironment.value || '',
        gr4vyRequireSecurityCode: siteCustomPreferences.gr4vyRequireSecurityCode,
        gr4vyPEMThumbprint: siteCustomPreferences.gr4vyPEMThumbprint || '',
        gr4vyPrivateKey: siteCustomPreferences.gr4vyPrivateKey || '',
        gr4vyColors: siteCustomPreferences.gr4vyColors,
        gr4vyFonts: siteCustomPreferences.gr4vyFonts,
        gr4vyBordersWidths: siteCustomPreferences.gr4vyBordersWidths,
        gr4vyRadii: siteCustomPreferences.gr4vyRadii,
        gr4vyFocusRing: siteCustomPreferences.gr4vyFocusRing
    };
    return gr4vySitePreferences;
}

/**
 * Returns custom site preference
 * @param {string} preference preferce
 * @returns {*} site preferences
 */
function getcacheGr4vyPreferences(preference) {
    var cachedGr4vyPreferences = variableCache;
    if (!cachedGr4vyPreferences) {
        try {
            if (customCacheGr4vyPreferences) {
                variableCache = cachedGr4vyPreferences = customCacheGr4vyPreferences.get(Site.current.ID, function () {
                    return putGr4vyPreferences();
                });
            }
        } catch (e) {
            variableCache = cachedGr4vyPreferences = variableCache || putGr4vyPreferences();
            gr4vyLogger.error('getcacheGr4vyPreferences() : Error Occurred while retrieving from Custom Cache. Error Details : ' + e.message);
        }
    }

    return preference in cachedGr4vyPreferences ? cachedGr4vyPreferences[preference] : '';
}

/**
 * To check gr4vy is enabled or not.
 * @return {boolean} value.
 */
gr4vyPreferences.isGr4vyEnabled = function () {
    return getcacheGr4vyPreferences('isGr4vyEnabled');
};

// TODO: preference for Embed UI
gr4vyPreferences.getGr4vyEmbedScriptURL = function () {
    return getcacheGr4vyPreferences('gr4vyEmbedScriptURL');
};
// preference for Embed UI

/**
 * To get the Gr4vy metadata.
 * @return {string} The Gr4vy metadata.
 */
gr4vyPreferences.getMetaData = function () {
    var metadata = getcacheGr4vyPreferences('gr4vyMetadata');
    var parsedValue = {};
    try {
        if (metadata) {
            parsedValue = JSON.parse(metadata);
        }
    } catch (e) {
        gr4vyLogger.error('Error parsing metadata' + JSON.stringify(e));
    }
    return parsedValue;
};

/**
 * To get the Capture first transaction status.
 * @return {string} The Capture first transaction status.
 */
gr4vyPreferences.getPaymentSource = function () {
    return getcacheGr4vyPreferences('gr4vyPaymentSource');
};

/**
 * To get the Filter for the payment methods displayed.
 * @return {string} The Filter for the payment methods displayed.
 */
gr4vyPreferences.getDisplay = function () {
    return getcacheGr4vyPreferences('gr4vyDisplay');
};

/**
 * To get the Store Payment Methods.
 * @return {string} The Store Payment Methods.
 */
gr4vyPreferences.getStore = function () {
    var store = getcacheGr4vyPreferences('gr4vyStore');
    store = (store !== null) ? store : '';
    var storeParsed = '';
    switch (store) {
        case 'true':
            storeParsed = true;
            break;
        case 'false':
            storeParsed = false;
            break;
        case 'ask':
            storeParsed = 'ask';
            break;
        default:
            storeParsed = 'ask';
    }
    return storeParsed;
};

/**
 * To get the Manual Capture Enabled status.
 * @return {string} The Manual Capture Enabled status.
 */
gr4vyPreferences.getIntent = function () {
    return getcacheGr4vyPreferences('gr4vyIntent');
};

/**
 * To get the statement information
 * @return {string} The statement information.
 */
gr4vyPreferences.getStatementDescriptor = function () {
    var statementDescriptor = getcacheGr4vyPreferences('gr4vyStatementDescriptor');
    var parsedValue = '';
    try {
        if (statementDescriptor) {
            parsedValue = JSON.parse(statementDescriptor);
        }
    } catch (e) {
        gr4vyLogger.error('Error parsing statementDescriptor' + JSON.stringify(e));
    }
    return parsedValue;
};

/**
 * To get the gr4vyId
 * @return {string} The gr4vyId
 */
gr4vyPreferences.getGr4vyId = function () {
    return getcacheGr4vyPreferences('gr4vyId');
};

/**
 * To get the Gr4vy environment mode
 * @return {string} The Gr4vy environment mode
 */
gr4vyPreferences.getEnvironment = function () {
    return getcacheGr4vyPreferences('gr4vyEnvironment');
};

/**
 * To get the Require Security Code status
 * @return {string} The Gr4vy Require Security Code status
 */
gr4vyPreferences.getRequireSecurityCode = function () {
    return getcacheGr4vyPreferences('gr4vyRequireSecurityCode');
};

gr4vyPreferences.getPEMThumbprint = function () {
    return getcacheGr4vyPreferences('gr4vyPEMThumbprint');
};

gr4vyPreferences.getPrivateKey = function () {
    return getcacheGr4vyPreferences('gr4vyPrivateKey');
};

/* For the embed ui theme options.
* @return {Object} The Gr4vy Styling Object.
*/
gr4vyPreferences.getGr4vyStylingObject = function () {
    var stylingGr4vyColors = getcacheGr4vyPreferences('gr4vyColors');
    var stylingGr4vyFonts = getcacheGr4vyPreferences('gr4vyFonts');
    var stylingGr4vyBorderWidths = getcacheGr4vyPreferences('gr4vyBordersWidths');
    var stylingGr4vyRadii = getcacheGr4vyPreferences('gr4vyRadii');
    var stylingGr4vyFocusRing = getcacheGr4vyPreferences('gr4vyFocusRing');

    var stylingObject = {
        stylingGr4vyFonts: stylingGr4vyFonts ? JSON.parse(stylingGr4vyFonts) : '',
        stylingGr4vyColors: stylingGr4vyColors ? JSON.parse(stylingGr4vyColors) : '',
        stylingGr4vyBorderWidths: stylingGr4vyBorderWidths ? JSON.parse(stylingGr4vyBorderWidths) : '',
        stylingGr4vyRadii: stylingGr4vyRadii ? JSON.parse(stylingGr4vyRadii) : '',
        stylingGr4vyFocusRing: stylingGr4vyFocusRing ? JSON.parse(stylingGr4vyFocusRing) : ''
    };

    return stylingObject;
};

module.exports = gr4vyPreferences;
