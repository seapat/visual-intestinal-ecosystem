# Additional Python Code to perform small computations

# merge two tsv files into one json file
# Input: 2 tsv files (1 metadata, 1 bacteria)
# output: 1 json file

import pandas as pd
metadata = pd.read_csv("ecosystem_Metadata.tsv", delimiter="\t")
bacteria = pd.read_csv("ecosystem_HITChip.tsv", delimiter="\t")
bacteria = bacteria.drop(bacteria.columns[[0]], axis=1)  # remove column with SampleIDs -> use Sample IDs from metadata.

# dataframe including all columns of both files in one level
all_data = pd.concat([metadata, bacteria], axis=1)
all_data.to_csv("All_Data.csv")
#print(all_data)

# Creating a new column "bacterias" within the metadata dataframe
# for each (i,bacterias) cell (i=0 -> len(metadata.SampleID)) insert the i-th row of bacteria
metadata['Bacteria'] = ""
metadata['Bacteria'] = metadata['Bacteria'].astype(object)
for index, row in metadata.iterrows():
    metadata.at[index, 'Bacteria'] = bacteria.iloc[[index]]

metadata.to_csv("Complete_Data.csv")   # convert to csv
metadata = metadata.to_json("Complete_Data.json", orient="records")  # convert to json format, this takes a while.
