# Sean Klein 5575709

from flask import Flask, render_template, redirect, url_for, request
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
    return render_template('home.html')

@app.route('/metadata' , methods=["POST", "GET"])
def metadata():
    return render_template('metadata.html')

@app.route('/analysis' , methods=["POST", "GET"])
def analysis():
    return render_template('analysis.html')

@app.route('/about' , methods=["POST", "GET"])
def about():
    return render_template('about.html')

##############
# Functions  #
##############

def combine_tsv(data_meta = "ecosystem_Metadata.tsv", data_bacteria = "ecosystem_HITChip.tsv"):
    # Additional Python Code to perform small computations

    # merge two tsv files into one json file
    # Input: 2 tsv files (1 metadata, 1 bacteria)
    # output: 1 json file

    import pandas as pd
    metadata = pd.read_csv(data_meta, delimiter="\t")
    bacteria = pd.read_csv(data_bacteria, delimiter="\t")
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

    return metadata

if __name__ == '__main__':
    app.run(debug=True, port=6001)
