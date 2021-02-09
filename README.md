# Visualisation of Human intestinal Ecosystem data

Group Project for "Visualisation of Biological Data" at Uni Tuebingen

## About the course

cited from the course descritpion:

"The goal of this lecture is that you will learn to understand the visual analysis process and know basic methods of information visualization, including the "do's" and
"don'ts" of visualization. You will know methods to visualize diverse biological data like genomics or transcriptomics data and you will be able to chose suitable visualizations based on the type of data and the given analysis task. In the exercises, you will learn how to design and develop complex, interactive visual analytics applications in small teams."

## Goals

The goal is to visualise the potential impact of different human characteristics on the composition of their  intestinal microbiome. This is achieved via comparison of test subjects with different manifestations of those characteristics.

## Dependencies

- [Python 3](https://www.python.org/)
- [Pandas](https://pandas.pydata.org/)
- [D3.js version 6](https://d3js.org/)
- [Flask](https://flask.palletsprojects.com/en/1.1.x/)

## Starting the development server

In order to be able to start the development server, you need to have Python 3 installed on your system and a working internet connection, so that you can install python packages and the website can load its dependencies (D3.js, Google Fonts, JQuery).

### Installing Python Packages
`py` is the command line alias for Python on Windows Systems. On debian-based systems, replace with `python3`, on MacOS, the alias is `python`.
```shell
py -m pip install flask
py -m pip install pandas
py -m pip install numpy
```

### Running the server
Inside the project root folder, run
```shell
py flaskServer.py
```
`Ctrl + C` to stop the server.
