/**
 * Created by m.hall on 21/2/17.
 */
// TODO: update progress bar for upload from URL

// var uploadFileButton = $('.huge.ui.green.button');
//
// // Triggers the hidden file input when user clicks on upload button
// uploadFileButton.on("click", function(){
// 	$("#upload-input").click();
// });
//

//
// // sends a POST request for local file upload
// $("#upload-input").on("change", function(){
// 	var files = $(this).get(0).files;
//
// 	if (files.length > 0){
// 		// One or more files selected, process upload
//
// 		var formData = new FormData();
//
// 		// loop through all the selected files
// 		for (var i = 0; i < files.length; i++){
// 			var file = files[i];
//
// 			// add the files to formData object for the data payload
// 			formData.append("uploadFile", file, file.name);
// 		}
//
// 		// AJAX request that will POST the data to our /upload endpoint
// 		$.ajax({
// 			url: "/upload",
// 			type: "POST",
// 			data: formData,
// 			processData: false,
// 			contentType: false,
// 			success: function(data){
// 				console.log("upload successful!");
// 			},

// 		});
// 	}
// });


// Drag and drop box
var $form     = $('.box'),
    $input    = $form.find('input[type="file"]'),
    $label    = $form.find('label'),
    $errorMsg = "FILE UPLOAD ERROR",
    showFiles = function(files) {
	    $label.text(files.length > 1 ? ($input.attr('data-multiple-caption') || '').replace('{count', files.length) : files[0].name);
    };

var progress    = $('#progress'),
    progressBar = $('#progress__bar');

var urlForm = $('#upload-url'),
    urlEntry = $('#url-entry');


var isAdvancedUpload = function() {
	var div = document.createElement('div');
	// testing if browser supports drag and drop events
	return (('draggable' in div) || ('ondragstart' in div && 'ondrop' in div)) &&
			// check the FormData interface which is forming a programmatic object of the files
		'FormData' in window &&
			// detect if browser supports DataTransfer object for file uploading
		'FileReader' in window;
}();



// allows us to style the form depending on whether the browser supports drag and drop
if (isAdvancedUpload) {
	$form.addClass('has-advanced-upload');

	//This part deals with adding and removing classes to the form on the different states like when
	// the user is dragging a file over the form. Then, catching those files when they are dropped.
	var droppedFiles = false;

	$form.on('drag dragstart dragend dragover dragenter dragleave drop', function(e) {
		// prevent any unwanted behaviors for the assigned events across browsers.
		e.preventDefault();
		e.stopPropagation();
	})
		.on('dragover dragenter', function() {
			$form.addClass('is-dragover');
		})
		.on('dragleave dragend drop', function() {
			$form.removeClass('is-dragover');
		})
		.on('drop', function(e) {
			// returns the list of files that were dropped
			droppedFiles = e.originalEvent.dataTransfer.files;
		});
}

$form.on('submit', function(e) {
	if ($form.hasClass('is-uploading')) return false;

	$form.addClass('is-uploading')
		.removeClass('is-error');

	if (isAdvancedUpload) {
		// ajax for modern browsers
		e.preventDefault();

		// colects data from all the form inputs
		var ajaxData = new FormData();

		if (droppedFiles) {
			$.each(droppedFiles, function(i, file) {
				ajaxData.append($input.attr('name'), file, file.name);
			});
		}
		console.log("Ajax data = " + ajaxData);

		$.ajax({
			url: '/upload',
			type: 'POST',
			data: ajaxData,
			cache: false,
			processData: false,
			contentType: false,
			complete: function() {
				$form.removeClass('is-uploading');
			},
			success: function(data, textStatus) {
				$form.addClass(data === 'success' ? 'is-success' : 'is-error');
				if (data !== 'success') console.log("Error " + data + textStatus);
			},
			error: function(jqXHR, textStatus, errorThrown) {
				console.log(textStatus);
				console.log(errorThrown);

			},
			xhr: function(){
				// Logic to update the progress bar
				var xhr = new XMLHttpRequest();

				// listen to the 'progress' event
				xhr.upload.addEventListener('progress', function(e){

					if (e.lengthComputable){
						//	Calculate the percentage of upload complete
						var percentComplete = e.loaded / e.total;
						percentComplete = parseInt(percentComplete * 100);
						updateProgressBar(percentComplete);
						// //	update the progress bar with the new percentage
						// progressBar.text(percentComplete + "%")
						// 	.width(percentComplete + "%");
						//
						// // updating the progress bar's percent so as to cause colour drawChart
						// progress.attr('data-percent', percentComplete);
						//
						// //	once the upload reaches 100%, set the progress bar text to done
						// if (percentComplete === 100){
						// 	progressBar.html("Done");
						// }
					}
				}, false);

				return xhr;
			}
		});
	} else {
		// ajax for legacy browsers
		var iframeName = 'uploadiframe' + new Date().getTime(),
		    $iframe    = $('<iframe name="' + iframeName + '" style="display: none;"></iframe>iframe>');

		$('body').append($iframe);
		$form.attr('target', iframeName);

		$iframe.one('load', function() {
			var data = JSON.parse($iframe.contents().find('body').text());
			$form.removeClass('is-uploading')
				.addClass(data.success == true ? 'is-success' : 'is-error')
				.removeAttr('target');
			if (!data.success) console.log(data.error);
			$form.removeAttr('target');
			$iframe.remove();
		});
	}
});

// remove submit button and submit on drop
$form.on('drop', function(e) {
	droppedFiles = e.originalEvent.dataTransfer.files;
	showFiles(droppedFiles);
	$form.trigger('submit');
});

$input.on('change', function(e) {
	$form.trigger('submit');
});

// display the files the client has selected to upload

$input.on('change', function(e) {
	showFiles(e.target.files);
});


urlForm.submit(function(e) {
	e.preventDefault();

	console.log(urlEntry.val());

	var data = {
		urls: []
	};

	// could loop through text and push to data.url

	data.urls.push(urlEntry.val());


	var socket = io.connect(location.href);

	socket.emit('urls', data);

	socket.on('progress', function(prog) {
		// console.log(prog);
		updateProgressBar(prog)
	});


	// $.ajax({
	// 	url: '/upload',
	// 	type: 'POST',
	// 	data: JSON.stringify(data),
	// 	cache: false,
	// 	processData: false,
	// 	contentType: 'application/json',
	// 	complete: function() {
	// 		console.log("COMPLETE!");
	// 		// remove text from the url entry textbox
	// 		urlEntry.val('');
	// 	},
	// 	success: function(data, textStatus) {
	// 		console.log("SUCCESS!");
	// 	},
	// 	error: function(jqXHR, textStatus, errorThrown) {
	// 		console.log(textStatus);
	// 		console.log(errorThrown);
	//
	// 	},
	// 	xhr: function() {
	// 		// Logic to update the progress bar
	// 		var xhr = new XMLHttpRequest();
	//
	// 		// listen to the 'progress' event
	// 		xhr.addEventListener('progress', function (e, chunk) {
	// 			console.log(chunk);
	//
	// 			if (e.lengthComputable) {
	// 				//	Calculate the percentage of upload complete
	// 				var percentComplete = e.loaded / e.total;
	// 				percentComplete = parseInt(percentComplete * 100);
	//
	// 				//	update the progress bar with the new percentage
	// 				progressBar.text(percentComplete + "%")
	// 					.width(percentComplete + "%");
	//
	// 				// updating the progress bar's percent so as to cause colour drawChart
	// 				progress.attr('data-percent', percentComplete);
	//
	// 				//	once the upload reaches 100%, set the progress bar text to done
	// 				if (percentComplete === 100) {
	// 					progressBar.html("Done");
	// 				}
	// 			}
	// 		}, false);
	//
	// 		return xhr;
	// 	}
	// });


});

function updateProgressBar(val) {
	//	update the progress bar with the new percentage
	progressBar.text(val + "%")
		.width(val + "%");

	// updating the progress bar's percent so as to cause colour drawChart
	progress.attr('data-percent', val);

	//	once the upload reaches 100%, set the progress bar text to done
	if (val === 100){
		progressBar.html("Done");
	}
}


// Reset the progress bar to 0% when the user selects to upload another file
$form.on("submit", function(){
	$("#progress__bar").text("0%")
		.width("0%");
});