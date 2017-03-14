/**
 * Created by m.hall on 14/3/17.
 */
// a constructor for the metadata that will be stored for each file uploaded
var Metadata = function(filePaths, data) {
	this.id = new Date().getTime();
	this.filePaths = filePaths;
	this.data = data;
};

module.exports = Metadata;