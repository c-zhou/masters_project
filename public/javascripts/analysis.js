/**
 * Created by michaelhall on 5/3/17.
 */
// ajax get url


$('#start-form').submit(function(e){

    console.log("AJAX event triggered...");

    $.ajax({
        url: "/analysis/start",
        type: "POST",
        data: $('#readsPath'),
        processData: false,
        contentType: false,
        success: function(data){
            console.log("SUCCESS!!!!");
            console.log(data);
        }
    });

});