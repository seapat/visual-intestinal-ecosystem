# Additional Python Code to perform small computations

# merge two tsv files into one json file
# Input: 2 tsv files (1 metadata, 1 bacteria)
# output: 1 json file

import pandas as pd
metadata = pd.read_csv("../static/ecosystem_Metadata.tsv", delimiter="\t", index_col="SampleID")
bacteria = pd.read_csv("../static/ecosystem_HITChip.tsv", delimiter="\t", index_col="SampleID")

# dataframe including all columns of both files in one level
all_data = pd.concat([metadata, bacteria], axis=1)
all_data.to_csv("All_Data.csv")

# find out if we have more than one data point per subject (we do):
# all_data.groupby("SubjectID").size().to_frame().groupby(by=0).size()
# the paper says they took the first sample if several were available
# (see Methods -> Sample collection),
# so we should probably do the same:
subject_times = all_data[["SubjectID", "Time"]].groupby("SubjectID").min()
all_relevant_data = pd.merge(
    left  = subject_times,
    right = all_data,
    how   ='inner',
    on    = ["SubjectID", "Time"]
)

all_relevant_data.to_csv("Relevant_Data.csv")   # convert to csv
json_export = all_relevant_data.to_json("Relevant_Data.json", orient="records")  # convert to json format, this takes a while.
