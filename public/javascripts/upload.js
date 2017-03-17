/**
 * Created by m.hall on 21/2/17.
 */
var $form        = $('.box'),
    $input       = $form.find('input[type="file"]'),
    socket,
    boxBtn       = $('.box__button'),
    urlDiv       = $('#upload-url-elements'),
    $label       = $form.find('label'),
    stopBtn      = $('#stopUploadButton'),
    urlForm      = $('#upload-url'),
    fileDiv      = $('#upload-file-elements'),
    progress     = $('#progress'),
    urlEntry     = $('#url-entry'),
    fileStep     = $('#file-step'),
    fieldSet     = $('#fileFieldset'),
	progressBar  = $('#progress__bar'),
	completeDiv  = $('#complete-options'),
	progressDiv  = $('#upload-progress-elements'),
	metadataForm = $('#metadata-form'),
	completeStep = $('#complete-step'),
	urlUploadBtn = $('#url-upload-button'),
	metadataStep = $('#metadata-step'),
    fileUploadXHR;


// this function needs to be defined first as code below depends on it being available
var isAdvancedUpload = function() {
	var div = document.createElement('div');
	// testing if browser supports drag and drop events
	return (('draggable' in div) || ('ondragstart' in div && 'ondrop' in div)) &&
		// check the FormData interface which is forming a programmatic object of the files
		'FormData' in window &&
		// detect if browser supports DataTransfer object for file uploading
		'FileReader' in window;
};



// ============================================================================
// METADATA FORM
// ============================================================================

var inductionElements = $('.reveal-if-induction'),
	metadata;


// on metadata form submit, show file selectors, hide all others
metadataForm.submit(function(e) {
	e.preventDefault();
	[metadataForm, fileDiv, urlDiv].forEach(nextView);
	[metadataStep, fileStep].forEach(nextStep);
});

// $(document).ready(showInduction($('#induction')));

function showInduction(checkbox){
	if (checkbox.checked) {
		inductionElements.fadeIn();
		// jquery default is block which messes up the semantic ui form
		inductionElements.css('display', 'flex');
		inductionElements.find('input').attr('required', true); // make fields required
	} else {
		inductionElements.fadeOut();
		// remove values from fields and make them not required anymore
		inductionElements.find('input').val('').removeAttr('required');
	}
}


// ============================================================================
// UPLOAD LOCAL FILE FORM LOGIC AND DRAG AND DROP BOX
// ============================================================================

// allows us to style the form depending on whether the browser supports drag and drop
if (isAdvancedUpload()) {
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

	disableUpload();

	$form.addClass('is-uploading')
		.removeClass('is-error');

	updateProgressBar(0);

	enableStopButton();

	// on file upload start, show progress bar, hide all others
	fileFormSubmit(e);

	if (isAdvancedUpload()) {
		// ajax for modern browsers
		e.preventDefault();

		// collects data from all the form inputs
		var ajaxData = new FormData();
		ajaxData.append('metadata', metadataForm.serialize());

		if (droppedFiles) { // add all files to the form that will be sent to the server
			$.each(droppedFiles, function(i, file) {
				ajaxData.append($input.attr('name'), file, file.name);
			});
		}

		fileUploadXHR = $.ajax({
			url: '/upload',
			type: 'POST',
			data: ajaxData,
			cache: false,
			processData: false,
			contentType: false,
			complete: function() {
				$form.removeClass('is-uploading');
				boxBtn.hide();
				enableUpload();
				$label.html('<strong>Choose a file</strong> <span class="box__dragndrop"> or drag it here</span>.');
				// on file upload complete, show complete form, hide all others
				toCompleteFormView();
			},
			success: ajaxSuccess,
			error: ajaxErrorHandler,
			xhr: ajaxXHR
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
			toCompleteFormView();
		});
	}
});

// remove submit button and submit on drop
$form.on('drop', function(e) {
	droppedFiles = e.originalEvent.dataTransfer.files;
	showFiles(droppedFiles);
	boxBtn.show();
});

// starts upload of file as soon as it is dropped.
$input.on('change', function(e) {
	droppedFiles = e.target.files;

	// display the files the client has selected to upload
	showFiles(e.target.files);

	// show the upload button
	boxBtn.show();
});

stopBtn.click(function(e) {
	if (fileUploadXHR) {
		// abort xhr request
		fileUploadXHR.abort();
		disableStopButton();
		updateProgressBar(0);
	}
});

// ============================================================================
// UPLOAD FROM URL FORM LOGIC
// ============================================================================

// when user presses the upload button on the URL input box...
urlForm.submit(function(e) {
    e.preventDefault();

    var data = {
    	urls: [],
	    metadata: metadataForm.serialize()
    };

	disableUpload();

	// Reset the progress bar to 0% when the user selects to upload another file
	updateProgressBar(0);

	// enable stop button
	enableStopButton();

	// on file upload start, show progress bar, hide all others
	fileFormSubmit(e);

	// open socket to server to send/receive data and add listeners/emitters
	openSocket();

    // could loop through text and push to data.url for multiple URLS
    data.urls.push(urlEntry.val());

	// send the data to the server using the 'urls' event
	socket.emit('formData', data);

});

// ============================================================================
// FUNCTIONS
// ============================================================================

function openSocket() {
    socket = io.connect(location.href);

    // when receiving progress from curl from the server, update the progress bar
    socket.on('progress', function(prog) {
        updateProgressBar(prog)
    });

    // listener for completion to clear text
    socket.on('downloadComplete', function() {
        urlEntry.val("");

        enableUpload();
	    // on file upload complete, show complete form, hide all others
        toCompleteFormView();
    });

    // emitter for stop button press
    stopBtn.click(function() {
        disableStopButton();
        socket.emit('kill');
        updateProgressBar(0);
        enableUpload();
        urlEntry.val("");
    });

    //check file type is ok
}

function enableStopButton() {
	stopBtn.prop('disabled', false);
}

function disableStopButton() {
	stopBtn.prop('disabled', true);
}

function disableUpload() {
	urlUploadBtn.prop('disabled', true)
		.toggleClass('loading');
	fieldSet.prop('disabled', true);
	$form.addClass('loading');
}

function enableUpload() {
	urlUploadBtn.prop('disabled', false)
		.toggleClass('loading');
	fieldSet.prop('disabled', false);
	$form.removeClass('loading');
}

function updateProgressBar(val) {
	//	update the progress bar with the new percentage
	progressBar.text((val === 0) ? "" :  val + "%")
		.width(val + "%");

	// updating the progress bar's percent so as to cause colour drawChart
	progress.attr('data-percent', val);

	//	once the upload reaches 100%, set the progress bar text to done
	if (val === 100){
		progressBar.html("Done");
	}
}

var ajaxErrorHandler = function(jqXHR, textStatus, errorThrown) {
	console.log(textStatus);
	console.log(errorThrown);
};

var ajaxSuccess = function(data, textStatus) {
	$form.addClass(data === 'success' ? 'is-success' : 'is-error');
	if (data !== 'success') console.log("Error " + data + textStatus);
};

var ajaxXHR = function(){ // logic to update progress bar
	var xhr = new XMLHttpRequest();

	// listen to the 'progress' event
	xhr.upload.addEventListener('progress', function(e){

		if (e.lengthComputable){
			//	Calculate the percentage of upload complete and update progress bar
			var percentComplete = e.loaded / e.total;
			percentComplete = parseInt(percentComplete * 100);
			updateProgressBar(percentComplete);
		}
	}, false);

	return xhr;
};

var showFiles = function(files) {
	var len = files.length;
	if (len > 1) {
		$label.text(($input.attr('data-multiple-caption') || '').replace('{count}', len))
	} else {
		$label.text(files[0].name)
	}
};

function toCompleteFormView() {
	[fileStep, completeStep].forEach(nextStep);
	[progressDiv, completeDiv].forEach(nextView);
	$('#complete-step .checkmark').addClass('green');
}

function nextStep(el) {
	el.toggleClass('active').toggleClass('disabled');
}

function nextView(el) {
	el.toggle('slow');
}

function fileFormSubmit(e) {
	e.preventDefault();
	[progressDiv, urlDiv, fileDiv].forEach(nextView);
}

