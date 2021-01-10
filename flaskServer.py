# Sean Klein 5575709

from flask import Flask, render_template, redirect, url_for, request, send_from_directory
import os
import pandas as pd

app = Flask(__name__)
app.config['DEBUG'] = True

##############
# App routes #
##############

@app.route('/')
def index():
    return redirect(url_for('base'))

@app.route('/base' , methods=["POST", "GET"])
def base():
    return render_template('base.html')

@app.route('/home' , methods=["POST", "GET"])
def home():
    data = combine_tsv()
    return render_template('home.html', jsonTable = data)

@app.route('/metadata' , methods=["POST", "GET"])
def metadata():
    return render_template('metadata.html')

@app.route('/analysis' , methods=["POST", "GET"])
def analysis():
    return render_template('analysis.html')

@app.route('/about' , methods=["POST", "GET"])
def about():
    return render_template('about.html')

#favicon support for old browsers according to https://flask.palletsprojects.com/en/1.1.x/patterns/favicon/
@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'static'),
                               'favicon.ico', mimetype='image/vnd.microsoft.icon')

##############
# Functions  #
##############

def combine_tsv(data_meta = "static/ecosystem_Metadata.tsv", data_bacteria = "static/ecosystem_HITChip.tsv"):
    # Additional Python Code to perform small computations

    # merge two tsv files into one json file
    # Input: 2 tsv files (1 metadata, 1 bacteria)
    # output: 1 json file

    import pandas as pd
    metadata = pd.read_csv(data_meta, delimiter="\t", index_col="SampleID")
    bacteria = pd.read_csv(data_bacteria, delimiter="\t", index_col="SampleID")

    # dataframe including all columns of both files in one level
    all_data = pd.concat([metadata, bacteria], axis=1)
    #all_data.to_csv("All_Data.csv")
    #print(all_data)

    # Creating a new column "bacterias" within the metadata dataframe
    # for each (i,bacterias) cell (i=0 -> len(metadata.SampleID)) insert the i-th row of bacteria
    metadata['Bacteria'] = ""
    metadata['Bacteria'] = metadata['Bacteria'].astype(object)
    for index, row in metadata.iterrows():
        metadata.at[index, 'Bacteria'] = bacteria.loc[[index]]

    # find out if we have more than one data point per subject (we do):
    # all_data.groupby("SubjectID").size().to_frame().groupby(by=0).size()
    # the paper says they took the first sample if several were available
    # (see Methods -> Sample collection),
    # so we should probably do the same:
    subject_times = metadata[["SubjectID", "Time"]].groupby("SubjectID").min()
    # pd.merge removes indexes if they are not used for the join, so this step
    # needs to take place when we do not need the SampleIDs anymore.
    metadata = pd.merge(
        left  = subject_times,
        right = metadata,
        how   ='inner',
        on    = ["SubjectID", "Time"]
    )

    #metadata.to_csv("Complete_Data.csv")   # convert to csv
    metadata = metadata.to_json(orient="records")  # convert to json format, this takes a while. # removed from to_json(): "Complete_Data.json",

    return metadata

if __name__ == '__main__':
    app.run(debug=True, port=6001)
