/**
 * Created by m.hall on 14/3/17.
 */
// a constructor for the metadata that will be stored for each file uploaded
var Metadata = function(filePaths, data) {
	this.sampleID = new Date().getTime();
	this.path = filePaths;
	this.data = data;
};

module.exports = Metadata;