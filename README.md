# Streamformatics

Repository for the the web-platform developed during my Master of Bioinformatics project at University of Queensland.

This platform consists of two major microbial genomics tools: 

## Real-time species identification and resistance profiling

Code for this aspect of the platform is named 'analysis' i.e `analysis.js` or `analysis.css`.

For information on how to set up and operate this, refer to the [wiki entry](https://github.com/mbhall88/streamformatics/wiki/Real-time-species-identification-and-resistance-profiling).

## Automated microbial genomic analysis pipeline

### File upload

Code for this aspect of the platform is named 'upload' i.e `upload.ejs` or `upload.css`.

For further information on the file upload section, refer to the [wiki entry](https://github.com/mbhall88/streamformatics/wiki/MicroManage---file-upload).

### Visualisation of multiple sequence alignment

Code for this aspect of the platform is named 'dashboard' i.e `dashboard.js` or `dashboard.ejs`.

For further information on this tool, refer to the [wiki entry](https://github.com/mbhall88/streamformatics/wiki/MicroManage---multiple-sequence-alignment-visualisation)

## Installation

You must first have Node.js installed. If you don't already have Node installed you can do so by folllowing the instructions [here](https://nodejs.org/en/). 

For installing via package managers: 

* If are you are using Mac and `homebrew` this is as simple as just running `brew install node` (you may also ask you to install `XCode`). 
* On Linux, check out [this page](https://nodejs.org/en/download/package-manager/). 
* For instructions on a Windows, check out [this guide](http://blog.teamtreehouse.com/install-node-js-npm-windows).

After you have Node installed, on the command-line, navigate to the directory where you would like to install this repository and run the following:

```
git clone https://github.com/mbhall88/streamformatics.git
cd streamformatics
npm install
```

To run the server locally you can either run `nodemon` or `node app.js` from the root directory of the repository.

By default this server should be accessible on port 3000. Open a web browser and enter `localhost:3000/` into the address bar.
