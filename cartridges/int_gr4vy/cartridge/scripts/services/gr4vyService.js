'use strict';

var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');
var gr4vyLogger = require('*/cartridge/scripts/util/gr4vyLogger').getGr4vyLogger();
var Constants = require('*/cartridge/scripts/util/gr4vyConstants');
var Gr4vyBearerTokenModel = require('*/cartridge/scripts/token/gr4vyBearerTokenModel');
var gr4vyBearerToken = new Gr4vyBearerTokenModel().generate();
var gr4vyService = {};
gr4vyService.getService = function (urlEndPoint, method) {
    var service = null;
    try {
        service = LocalServiceRegistry.createService(Constants.GR4VY_SERVICE_NAME, {
            createRequest: function (svc, params) {
                svc.setRequestMethod(method);
                svc.addHeader('content-type', 'application/json');
                svc.addHeader('accept', 'application/json');
                svc.addHeader('Authorization', 'Bearer ' + gr4vyBearerToken);
                svc.setURL(svc.getConfiguration().credential.URL + urlEndPoint);
                return JSON.stringify(params ? params.body : '');
            },
            parseResponse: function (svc, response) {
                return response;
            },
            getRequestLogMessage: function (request) {
                return request;
            },
            getResponseLogMessage: function (response) {
                return response.text;
            }
        });
    } catch (e) {
        gr4vyLogger.error('gr4vyService.getService():Unable to get service instance with name {0}', Constants.GR4VY_SERVICE_NAME);
    }
    return service;
};

module.exports = gr4vyService;
