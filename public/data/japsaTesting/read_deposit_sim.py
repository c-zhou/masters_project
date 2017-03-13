# script to simulate nanopore depositing reads into folder

"""
Arguments to script should look like:
python read_deposit_sim.py dir1 dir2 dirN dest
dirX - refers to any directory you want to copy reads from
dest - directory where the reads should be deposited

"""
from shutil import copyfile
import sys
import os
import random
import time
SLEEP_TIME = 0.05 # number of seconds to wait between each copy of file

dest_dir = sys.argv[-1]

src_dirs = sys.argv[1:-1]


def get_fast5_files(dirs):
    """

    :param dirs: string or list of directories where fast5 files are located
    :return: a (nested) list of all fast5 files found in dirs
    """
    output_list = []

    for directory in list(dirs):
        # walk down into any subfolders of the given directory
        for root, dirs, files in os.walk(directory):
            for file in files:
                if file.endswith(".fast5"):
                    output_list.append(os.path.join(root, file))

    return output_list


all_files = get_fast5_files(src_dirs)
# shuffle the list of files - simulates a real experiment
random.shuffle(all_files)
print("{0} files in total.".format(len(all_files)))

for file in all_files:
    dst = os.path.join(dest_dir, file.split("/")[-1])
    copyfile(file, dst)
    time.sleep(SLEEP_TIME)


#/Users/m.hall/Downloads/FCH_731ebola
#/Users/m.hall/Dropbox/Documents/Streamformatics/CoinLab_Streamformatics/public/data/japsaTesting/zika_library2_12plex
#/Users/m.hall/Dropbox/Documents/Streamformatics/CoinLab_Streamformatics/public/data/japsaTesting/testZika/pass
