import random
import time

with open("stream.txt", "a") as open_file:
    for i in range(5):
        rand_int = random.randint(50, 99)
        rand_float = random.uniform(50, 99)
        open_file.write("{0}\t{1}\n".format(rand_int, rand_float))
        print(i)
        time.sleep(5)
    


