#!/bin/bash
#Usage: speciesTyping.sh folder_of_f5 path_to_virus_db

folder=$1
sdb=$2


##sdb=/DataOnline/Data/Bacterial_Genome/Eskape/SpeciesTyping/Bacteria/
##


jsa.np.npreader -realtime -GUI --fail --folder $folder --output - 2> npreader.log | bwa mem -t 4 -k11 -W20 -r10 -A1 -B1 -O1 -E1 -L0 -Y -K 10000 $sdb/genomeDB.fasta $fq 2> /dev/null | jsa.np.rtSpeciesTyping -bam - -index $sdb/speciesIndex --read 100 -time 0 -out species.dat 2> species.log 


