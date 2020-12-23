# Sean Klein 5575709
from flask import Flask, render_template, redirect, url_for, request
import pandas as pd

app = Flask(__name__)
app.config['DEBUG'] = True

@app.route('/')
def index():
    return redirect(url_for('base'))

@app.route('/base' , methods=["POST", "GET"])
def base():
    return render_template('base.html')


if __name__ == '__main__':
    app.run(debug=True, port=6001)
