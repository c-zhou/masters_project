/**
 * Created by michaelhall on 5/3/17.
 */

var getStartedButton    = $('#getStarted'),
    fadeTime            = 750,
    readPathsForm       = $('#readPathsForm'),
    startAnalysisButton = $('#startAnalysis'),
    stopAnalysisButton  = $('#stopAnalysis');


// fade out the get started button when clicked and fade in the read path entry box
getStartedButton.click(function(){
	console.log("Get Started button clicked");
	$(this).fadeOut(fadeTime, function(){
		readPathsForm.fadeIn(fadeTime);
	});
});


readPathsForm.submit(function(e){
	// prevents default action of form
	e.preventDefault();
	console.log("Read path form submitted!");
	var pathToReads = $('#readsPath').val();
	console.log("User has reads located in " + pathToReads);
	$(this).fadeOut(fadeTime, function(){
		startAnalysisButton.fadeIn(fadeTime);
	});
});























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