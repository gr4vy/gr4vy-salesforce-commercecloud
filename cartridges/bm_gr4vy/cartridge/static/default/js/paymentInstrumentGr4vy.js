(function($){
    /**
     * It is used to manipulate the Gr4vy payment instruments on payments tab of an order
     */
    function initialize() {
        $('.gr4vy-transaction-table').parent().hide();
        $('<div class="gr4vy-payment-info"></div>').insertAfter($('.gr4vy-transaction-table').parent());
        $('.gr4vy-payment-info').html($('.gr4vy-transaction-table').html());
    }
    initialize();
}(jQuery));
