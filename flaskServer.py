# Mario Rauh 3916968
# Sean Klein 5575709

from flask import Flask, render_template, redirect, url_for, request, send_from_directory
import os
import pandas as pd
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
    return redirect(url_for('base'))

@app.route('/base' , methods=["POST", "GET"])
def base():
    return render_template('base.html')

@app.route('/home' , methods=["POST", "GET"])
def home():
    (data, species_list) = visualizeData()
    return render_template('home.html', jsonTable = data, species = species_list)

@app.route('/metadata' , methods=["POST", "GET"])
def metadata():
    return render_template('metadata.html')

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
    subject_times = metadata[["SubjectID", "Time"]].groupby("SubjectID").min()
    # pd.merge removes indexes if they are not used for the join, so this step
    # needs to take place when we do not need the SampleIDs anymore.
    all_data = pd.merge(
        left  = subject_times,
        right = all_data,
        how   ='inner',
        on    = ["SubjectID", "Time"]
    )

    all_data = all_data.to_json(orient="records")  # convert to json format

    return (all_data, species_list)

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
