# Gr4vy 2022 Salesforce Commerce Cloud Cartridge

## Company Overview
A Gr4vy payment is a first-class object that has:

* a payment status that conforms to a unified payment lifecycle
* payment method information such as card details
* order details such as amount, line items and tax
* customer details such as contact information, shipping and billing address
* a Timeline of events created throughout the lifecycle of the payment

## Integration Overview
This repository contains the Gr4vy integrations with the Salesforce Commerce Cloud platform. There are two versions currently available for SiteGenesis Javascript Controller (SGJS) and Salesforce Reference Architecture (SFRA).

### Cartridges
* bm_gr4vy - includes functionality for Business Manager
* int_gr4vy - includes the base functionality used by SG controllers and SFRA
* int_gr4vy_controllers - includes SG Controllers specific logic
* int_gr4vy_sfra - includes SFRA specific logic

### SiteGenesis Javascript Controller (SGJC)
For the manual, please see the `Gr4vy_Controllers_Integration_Guide.docx` file in the `documentation` directory.

### Salesforce Reference Architecture (SFRA)
For the manual, please see the `Gr4vy_SFRA_Integration_Guide.docx` file in the `documentation` directory.

## NPM scripts
`npm install` - Install all of the local dependencies.
`npm run compile:js` - Compiles all .js files and aggregates them.
`npm run lint` - Execute linting for all CSS & JavaScript files in the project.

## Tests
### Unit tests
In order to run the unit tests, do the following steps in the root of the project.
1. `npm install`
2. `npm run test`
