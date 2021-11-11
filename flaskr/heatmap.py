from flask import Blueprint, render_template, jsonify, url_for
import random
from PIL import Image
import base64
import io
import csv


bp = Blueprint("heatmap", __name__, url_prefix="/heatmap")
IMG_PATH = './flaskr/static/images/slide2.jpeg'
PRED_PATH_BAP1 = './flaskr/static/predictions_BAP1.tsv'
PRED_PATH_PBRM1 = './flaskr/static/predictions_PBRM1.tsv'


@bp.route("/")
def tiles():
  predictions = create_all_predictions()
  return render_template("heatmap.html", predictions=predictions, slide_image=load_slide(IMG_PATH))


def create_all_predictions():
  predictions = {}
  predictions["BAP1"] = read_predictions(PRED_PATH_BAP1)
  predictions["PBRM1"] = read_predictions(PRED_PATH_PBRM1)
  return predictions


def create_predictions(width, height):
  predictions = []
  for _ in range(height):
    prediction_row = []
    for _ in range(width):
      prediction_row.append(random.random())
    predictions.append(prediction_row)
  return predictions


def load_slide(path):
  img = Image.open(path)
  data = io.BytesIO()
  img.save(data, "JPEG")
  encoded_img_data = base64.b64encode(data.getvalue())
  return encoded_img_data.decode("utf-8")


def read_predictions(path):
  predictions = []
  with open(path, newline='') as f:
    read_tsv = csv.reader(f, delimiter="\t")
    for row in read_tsv:
      for i in range(len(row)):
          if row[i] != "nan":
            row[i] = float(row[i])
            row[i] = min(1, row[i])
            row[i] = max(0, row[i])
      predictions.append(row)
  return predictions