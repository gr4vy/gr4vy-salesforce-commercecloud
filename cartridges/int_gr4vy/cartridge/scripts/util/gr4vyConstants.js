'use strict';

// Constants used in gr4vy integration
module.exports = {
    URL_ENDPOINT_CREATE_BUYER: '/buyers',
    GR4VY_SERVICE_NAME: 'Gr4vyAPI',
    URL_ENDPOINT_TRANSACTION: '/transactions',
    GR4VY_ID: 'Gr4vy',
    METHOD_GET: 'GET',
    METHOD_POST: 'POST',
    METHOD_PUT: 'PUT',
    TOKEN_HEADER_CUSTOM_CACHE_ID: 'JWTTokenHeader',
    GR4VYPREFERENCE_CUSTOM_CACHE_ID: 'gr4vyPreferences',
    TOKEN_CLAIMS_ISS: 'SFCC-Gr4vyIntegration',
    TOKEN_EXPIRY_TIME_IN_MINUTES: 30,
    TOKEN_DEFAULT_SCOPES: ['*.read'],
    TOKEN_SIGNATURE_ALGORITHM: 'SHA512withRSA',
    BEARER_TOKEN_SCOPE: ['*.read', '*.write'],
    URL_ENDPOINT_CAPTURE: '/capture',
    URL_ENDPOINT_REFUND: '/refunds',
    URL_ENDPOINT_VOID: '/void',
    EMBED_TOKEN_SCOPE: ['embed'],
    CAPTURE_SUCCEEDED: 'capture_succeeded',
    AUTHORIZATION_DECLINED: 'authorization_declined',
    AUTHORIZATION_FAILED: 'authorization_failed',
    AUTHORIZATION_SUCCEEDED: 'authorization_succeeded',
    PROCESSING: 'processing',
    CAPTURE: 'capture',
    CAPTURE_PENDING: 'capture_pending'
};
