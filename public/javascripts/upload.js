/**
 * Created by m.hall on 21/2/17.
 */
// TODO: update progress bar for upload from URL

var uploadFileButton = $(".huge.ui.green.button");

// Triggers the hidden file input when user clicks on upload button
uploadFileButton.on("click", function(){
	$("#upload-input").click();
});

// Reset the progress bar to 0% when the user selects to upload another file
uploadFileButton.on("click", function(){
	$(".bar").text("0%")
		.width("0%");
});

// sends a POST request for local file upload
$("#upload-input").on("change", function(){
	var files = $(this).get(0).files;

	if (files.length > 0){
		// One or more files selected, process upload

		var formData = new FormData();

		// loop through all the selected files
		for (var i = 0; i < files.length; i++){
			var file = files[i];

			// add the files to formData object for the data payload
			formData.append("uploadFile", file, file.name);
		}

		// AJAX request that will POST the data to our /upload endpoint
		$.ajax({
			url: "/upload",
			type: "POST",
			data: formData,
			processData: false,
			contentType: false,
			success: function(data){
				console.log("upload successful!");
			},
			xhr: function(){
				// Logic to update the progress bar
				// create an XMLHttpRequest
				var xhr = new XMLHttpRequest();

				// listen to the 'progress' event
				xhr.upload.addEventListener('progress', function(evt){

					if (evt.lengthComputable){
					//	Calculate the percentage of upload complete
						var percentComplete = evt.loaded / evt.total;
						percentComplete = parseInt(percentComplete * 100);

					//	update the progress bar with the new percentage
						$(".bar").text(percentComplete + "%")
							.width(percentComplete + "%");

						// updating the progress bar's percent so as to cause colour change
						$(".indicating.progress").attr("data-percent", percentComplete);

					//	once the upload reaches 100%, set the progress bar text to done
						if (percentComplete === 100){
							$(".bar").html("Done");
						}
					}
				}, false);

				return xhr;
			}
		});
	}
});

