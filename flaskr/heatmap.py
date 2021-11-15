from flask import Blueprint, render_template, jsonify, url_for, request, Response
import random
from PIL import Image
import base64
import io
import csv
from flaskr.db import get_db


bp = Blueprint("heatmap", __name__, url_prefix="/heatmap")
IMG_PATH = './flaskr/static/images/slide2.jpeg'
PRED_PATH_BAP1 = './flaskr/static/predictions_BAP1.tsv'
PRED_PATH_PBRM1 = './flaskr/static/predictions_PBRM1.tsv'
GROUND_TRUTH = {"PBRM1": 1, "BAP1": 0}
REGION_NAME = "Region Name"


@bp.route('', strict_slashes=False)
def tiles():
  predictions = create_all_predictions()
  return render_template(
    "heatmap.html", 
    predictions=predictions, 
    slide_image=load_slide(IMG_PATH),
    ground_truth=GROUND_TRUTH,
    name=REGION_NAME
    )
    

@bp.route('/label', methods=["POST"])
def add_label():
  req = request.get_json()
  db = get_db()
  try:
    # Check if slide is already added
    slides = db.execute(
            "SELECT * FROM slides where slide_name=?",
            (req['name'],),
            )
    slide = slides.fetchone()

    # Add slide if not already in slides table
    if not slide:
      db.execute("INSERT INTO slides (slide_name) VALUES (?)", (req['name'],))
      db.commit()

    # Check if tile is already added
    else:
      slide_id = slide["id"]
      tiles = db.execute("SELECT * FROM tiles where slide_id=? AND coords=?", (slide_id, req['coords']))
      tile = tiles.fetchone()

      # If tile doesn't exist in db, add it with new label
      if not tile:
        db.execute(
          "INSERT INTO tiles (slide_id, coords, label) VALUES (?, ?, ?)", 
          (slide_id, req['coords'], req['label'])
          )
        db.commit()
        
      # Otherwise, update the existing label
      else:
        db.execute(
          "UPDATE tiles SET label=? WHERE slide_id=? AND coords=?", 
          (slide_id, req['coords'], req['label'])
          )
        db.commit()

  except Exception as e:
    print(e)

  return Response(status=200)



def create_all_predictions():
  predictions = {}
  predictions["BAP1"] = read_predictions(PRED_PATH_BAP1)
  predictions["PBRM1"] = read_predictions(PRED_PATH_PBRM1)
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