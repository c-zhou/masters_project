/**
 * Created by m.hall on 23/3/17.
 */
const spawn = require('child_process').spawn,
      path  = require('path'),
	  ST_INDEX_NAME = 'speciesIndex',
	  RP_DB_NAME = 'DB.fasta',
	  ST_DB_NAME = 'genomeDB.fasta';


// child process constructor for npReader
function run_npReader(pathData) {
	console.log('npReader called at ' + new Date());

	var npReaderArgs = [
		    '--realtime', // run the program in real-time mode
		    '--fail', // get sequence reads from the fail folder
		    '--folder=' + pathData.pathToInput, // the folder containing base-called reads
		    '--output=-' // output to stdout (this is default but included for clarity)
	    ],
	    npReaderOptions = {
		    cwd: pathData.pathForOutput, // where to run the process
		    stdio: ['pipe', 'pipe', 'pipe'] // stdin stdout stderr types (could use 'ignore')
	    };

	return spawn('jsa.np.npreader', npReaderArgs, npReaderOptions);
}

// child process constructor for bwa
// pipeTo can take values 'ST'for speciesTyping or 'RP' for resistance profiling
function run_bwa(pathData, pipeTo, startFrom) {
	console.log('bwa called at ' + new Date());

	var dbPath;
	if (pipeTo.toUpperCase() === 'ST') dbPath = path.join(pathData.pathToDB, ST_DB_NAME);
	else if (pipeTo.toUpperCase() === 'RP') dbPath = path.join(pathData.pathToResDB, RP_DB_NAME);
	else console.log("ERROR: INCORRECT pipeTo OPTION GIVEN!");

	// if user provided fastq, analysis starts from bwa and the input to bwa is set as the fastq
	// file specified by client. otherwise, input is from stdin (-).
	var readFrom = (startFrom) ? pathData.pathToInput : '-';

	var bwaArgs = [
			'mem', // run bwa mem
		    '-t 4', // number of threads
		    '-v 3', // output all normal messages
		    '-k 11', // min. seed length
		    '-W 20', // discard a chain if seeded bases shorter than INT
		    '-r 10', // look for internal seeds inside a seed longer than {-k} * FLOAT
		    '-A 1', // mismatch score
		    '-B 1', // penalty for mismatch - optimised for np
		    '-O 1', // gap open penalty - optimised for nanopore
		    '-E 1', // gap extension penalty
		    '-L 0', // penalty for 5'- and 3'-end clipping - optimised for np
		    '-Y', // use soft clipping for supplementary alignments
		    '-K 10000', // buffer length in bp (not documented)
		    dbPath, // ref sequence/db
		    readFrom // read file from
	    ],
	    bwaOptions = {
		    cwd: pathData.pathForOutput, // where to run the process
		    stdio: ['pipe', 'pipe', 'pipe'] // stdin stdout stderr types (could use 'ignore')
	    };

	return spawn('bwa', bwaArgs, bwaOptions);
}

// child process constructor for real-time species typing
function run_speciesTyping(pathData) {
	console.log('species typing called at ' + new Date());

	var specTypingArgs = [
		    '--web', // output is in JSON format for use in the web app viz
		    '--bamFile=-', // read BAM from stdin
		    '--indexFile=' + path.join(path.dirname(pathData.pathToDB), ST_INDEX_NAME), // index file
		    '--read=100', // min. number of reads between analysis
		    '--time=3', // min. number of secs between analysis
		    '--output=-' // output to stdout
	    ],
	    specTypingOptions = {
		    cwd: pathData.pathForOutput, // where to run the process
		    stdio: ['pipe', 'pipe', 'pipe'] // stdin stdout stderr types (could use 'ignore')
	    };

	return spawn('jsa.np.rtSpeciesTyping', specTypingArgs, specTypingOptions);
}

function run_resProfiling(pathData) {
	console.log('resistance profiling called at ' + new Date());

	var resProfilingArgs = [
		'--output=-', // output to stdout
	    '--bamFile=-', // read BAM from stdin
	    '--resDB=' + pathData.pathToResDB, // path to resistance database
	    '--tmp=tmp/resTest' // temporary folder so data doesnt need to be stored in memory
	],
	    resProfilingOptions = {
		    cwd: pathData.pathForOutput, // where to run the process
		    stdio: ['pipe', 'pipe', 'pipe'] // stdin stdout stderr types (could use 'ignore')
	    };

	return spawn('jsa.np.rtResistGenes', resProfilingArgs, resProfilingOptions);
}

module.exports = {
	run_npReader: run_npReader,
	run_bwa: run_bwa,
	run_speciesTyping: run_speciesTyping,
	run_resProfiling: run_resProfiling
};