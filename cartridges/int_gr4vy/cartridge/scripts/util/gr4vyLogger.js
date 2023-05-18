'use strict';

/**
 * Returns a logger instance for Gr4vy
 *
 * @returns{Object} - Logger instance
 */
function getGr4vyLogger() {
    var Logger = require('dw/system/Logger');
    return Logger.getLogger('gr4vy', 'gr4vy.integration');
}

module.exports = {
    getGr4vyLogger: getGr4vyLogger
};
