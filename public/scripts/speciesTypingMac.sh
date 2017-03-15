#!/bin/bash
#Usage: speciesTyping.sh folder_of_f5 path_to_virusDB

folder=$1
sdb=$2

jsa.np.npreader -realtime --fail --folder $folder --output - 2> /dev/null | bwa mem -t 4 -k11 -W20 -r10 -A1 -B1 -O1 -E1 -L0 -Y -K 10000 $sdb/genomeDB.fasta - 2> /dev/null | jsa.np.rtSpeciesTyping -web -bam - -index $sdb/speciesIndex --read 100 -time 0 -out - 
