# Mario Rauh 3916968
# Sean Klein 5575709

from flask import Flask, render_template, redirect, url_for, request, send_from_directory
import os
import pandas as pd
import numpy as np
import json
from werkzeug.utils import secure_filename

UPLOAD_FOLDER = '/UploadFiles'   # path to directory in which uploaded files will be saved
allowed_extensions = {'txt', 'csv', 'tsv'}

app = Flask(__name__)
app.config['DEBUG'] = True

##############
# App routes #
##############

@app.route('/')
def index():
    return redirect(url_for('home'))

@app.route('/home' , methods=["POST", "GET"])
def home():
    (data, species_list) = visualizeData()
    return render_template('home.html', jsonTable = data, species = species_list)

@app.route('/metadata' , methods=["POST", "GET"])
def metadata():
    return render_template('metadata.html', data=get_metadata_all())

@app.route('/analysis' , methods=["POST", "GET"])
def analysis():
    (data, species_list) = visualizeData()
    return render_template('analysis.html', jsonTable = data, species = species_list)

@app.route('/about' , methods=["POST", "GET"])
def about():
    return render_template('about.html')

#favicon support for old browsers according to https://flask.palletsprojects.com/en/1.1.x/patterns/favicon/
@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'static'),
                               'favicon.ico', mimetype='image/vnd.microsoft.icon')

@app.route('/getfile', methods=['POST'])
def upload_files():
    if request.method == 'POST':
        metafile = request.files['meta']
        bacteriafile = request.files['bacteria']

        filename_meta = secure_filename(metafile.filename)
        filename_bacteria = secure_filename(bacteriafile.filename)

        if metafile == "":
            if bacteriafile == "":
                return home()

        metafile.save(os.path.join("UploadFiles", "meta.csv"))
        bacteriafile.save(os.path.join("UploadFiles", "bact.csv"))

        return home()

    else:
        result = request.args.get['meta']

    return result

##############
# Functions  #
##############

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_extensions

def combine_tsv(metadata, bacteria):
    # Additional Python Code to perform small computations

    # merge two tsv files into one json file
    # Input: 2 tsv files (1 metadata, 1 bacteria)
    # output: 1 json file
    '''
    import pandas as pd
    metadata = pd.read_csv(data_meta, delimiter="\t", index_col="SampleID")
    bacteria = pd.read_csv(data_bacteria, delimiter="\t", index_col="SampleID")
'''

    species_list = [b for b in bacteria.columns]

    # normalize bacteria dataframe
    bacteria = (bacteria - bacteria.min())/(bacteria.max() - bacteria.min())

    # dataframe including all columns of both files in one level
    all_data = pd.concat([metadata, bacteria], axis=1)

    # find out if we have more than one data point per subject (we do):
    # all_data.groupby("SubjectID").size().to_frame().groupby(by=0).size()
    # the paper says they took the first sample if several were available
    # (see Methods -> Sample collection),
    # so we should probably do the same:
    # get only first sample of every subject
    all_data = all_data.loc[all_data.groupby("SubjectID")["Time"].idxmin()]

    all_data = all_data.to_json(orient="records")  # convert to json format

    return (all_data, species_list)

def get_metadata_all(data_meta = "static/ecosystem_Metadata.tsv"):
    metadata = pd.read_csv(data_meta, delimiter="\t", index_col="SampleID")
    # get only first sample of every subject
    metadata = metadata.loc[metadata.groupby("SubjectID")["Time"].idxmin()]
    # drop unnecessary columns
    metadata = metadata.drop(['ProjectID', 'Time', 'SubjectID'], axis=1)
    metadata.columns = ["Age", "Sex", "Nationality", "DNA extraction method", "Diversity", "BMI group"]
    return metadata.to_json(orient="records")

def get_metadata(data_meta = "static/ecosystem_Metadata.tsv"):
    metadata = pd.read_csv(data_meta, delimiter="\t", index_col="SampleID")
    # get only first sample of every subject
    metadata = metadata.loc[metadata.groupby("SubjectID")["Time"].idxmin()]
    # drop unnecessary columns
    metadata = metadata.drop(['ProjectID', 'Time', 'SubjectID'], axis=1)

    # create bins for age and diversity
    age_bins = pd.cut(metadata['Age'],bins=np.arange(0,101,20), labels=["<21", "21-40", "41-60", "61-80", ">80"])
    diversity_bins = pd.cut(metadata['Diversity'],bins=np.linspace(metadata["Diversity"].min(), metadata["Diversity"].max(), 6), labels=["very low", "low", "medium", "high", "very high"], include_lowest=True)

    def count_occurences(c):
        x = metadata[c]
        if x.name == "Age":
            df = x.groupby(age_bins).size()
        elif x.name == "Diversity":
            df = x.groupby(diversity_bins).size()
        else:
            df = x.groupby(x).size()
        df.index.name = "label"
        df.name = "value"
        return df.reset_index()
#    return [count_occurences(c).to_json(orient="records") for c in metadata.columns]
    return {c: json.loads(count_occurences(c).to_json(orient="records")) for c in metadata.columns}



def visualizeData():
    '''
    data_meta = "static/ecosystem_Metadata.tsv"
    data_bacteria = "static/ecosystem_HITChip.tsv"

    import pandas as pd
    metadata = pd.read_csv(data_meta, delimiter="\t", index_col="SampleID")
    bacteria = pd.read_csv(data_bacteria, delimiter="\t", index_col="SampleID")

    return combine_tsv(metadata, bacteria)
    '''
    if os.path.isfile("UploadFiles/meta.csv") and os.path.isfile("UploadFiles/bact.csv"):

        data_meta = "UploadFiles/meta.csv"
        data_bacteria = "UploadFiles/bact.csv"
        
        # we need a try because uploadfiles creates empty files if no file is added but upload button is pressed
        try:

            metadata = pd.read_csv(data_meta, delimiter="\t", index_col="SampleID")
            bacteria = pd.read_csv(data_bacteria, delimiter="\t", index_col="SampleID")

            return combine_tsv(metadata, bacteria)

        except:
            

            data_meta = "static/ecosystem_Metadata.tsv"
            data_bacteria = "static/ecosystem_HITChip.tsv"

            metadata = pd.read_csv(data_meta, delimiter="\t", index_col="SampleID")
            bacteria = pd.read_csv(data_bacteria, delimiter="\t", index_col="SampleID")

            return combine_tsv(metadata, bacteria)


    else:

        data_meta = "static/ecosystem_Metadata.tsv"
        data_bacteria = "static/ecosystem_HITChip.tsv"

        metadata = pd.read_csv(data_meta, delimiter="\t", index_col="SampleID")
        bacteria = pd.read_csv(data_bacteria, delimiter="\t", index_col="SampleID")

        return combine_tsv(metadata, bacteria)

if __name__ == '__main__':
    app.run(debug=True, port=6001)
