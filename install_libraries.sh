#!/bin/bash

# Loop through each line in lib.txt and install the libraries
while IFS= read -r library; do
  koyeb install "$library"
done < lib.txt
