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



if __name__ == '__main__':
    app.run(debug=True, port=6001)
