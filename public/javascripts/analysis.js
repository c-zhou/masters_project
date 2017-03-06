/**
 * Created by michaelhall on 5/3/17.
 */

var getStartedButton    = $('#getStarted'),
    fadeTime            = 600,
    readPathsForm       = $('#readPathsForm'),
    startAnalysisButton = $('#startAnalysis'),
    chartContainer      = $('#chartContainer'),
    stopAnalysisButton  = $('#stopAnalysis');

var socket;

// open the websocket connection.
// fade out the get started button when clicked and fade in the read path entry box
getStartedButton.click(function(){
	// open the websocket connection and store the socket in a variable to be used elsewhere
	socket = io.connect(location.href);

	$(this).fadeOut(fadeTime, function(){
		readPathsForm.fadeIn(fadeTime);
	});
});

// When the user submits the path, get that path and send to the analysis route,
// fade out the form and reveal the start button
readPathsForm.submit(function(e){
	// prevents default action of form
	e.preventDefault();

	//TODO - error handling for when the text fields are empty. Add folder chooser.

	// send the path to the server
	socket.emit('paths', {
		pathToReads: $('#readsPath').val(), // path to the user's reads
		pathToVirus: $('#virusPath').val() // path to virus database
	});

	$(this).fadeOut(fadeTime, function(){
		startAnalysisButton.fadeIn(fadeTime);
	});
});

// When the user clicks start, hide the start button and reveal the stop button and
// div that the chart will be added to. Then, start the child process and plotting.
startAnalysisButton.click(function(){
	console.log("Start button Clicked");

	socket.emit('startAnalysis');

	$(this).fadeOut(fadeTime, function(){
		stopAnalysisButton.fadeIn(fadeTime);
		chartContainer.fadeIn(fadeTime);
	});
});

// When the stop button is clicked, kill the child process running the species typing and
// close the websocket.
stopAnalysisButton.click(function(){
	console.log("Stop button clicked");
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