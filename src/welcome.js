$(document).ready(function () {
    $("#welcomePanel").css('display', 'block');
});

function hideWelcomePanel(){
    $(document).ready(function () {
        $("#welcomePanel").fadeOut();
    });
}

mapController.onMapReayHandlers.push(hideWelcomePanel);