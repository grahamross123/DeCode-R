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
  labels = {}
  # Obtain all labels for the current slide
  try:
    db = get_db()
    # Obtain all tiles on the current slide which have a label
    tiles_query = db.execute("""
      SELECT tiles.coords, labels.label FROM tile_labels 
      JOIN labels ON labels.id = tile_labels.label_id
      JOIN tiles ON tiles.id = tile_labels.tile_id
      JOIN slides ON tiles.slide_id = slides.id
      WHERE slides.slide_name = ?
      """, (REGION_NAME,))
    tile_labels = tiles_query.fetchall()
    for tile in tile_labels:
      if tile['coords'] in labels:
        labels[tile['coords']].append(tile['label'])
      else:
        labels[tile["coords"]] = [tile["label"]]
  except TypeError as e:
    print(e)
  return render_template(
    "heatmap.html", 
    predictions=predictions, 
    slide_image=load_slide(IMG_PATH),
    ground_truth=GROUND_TRUTH,
    name=REGION_NAME,
    labels=labels
    )
    
@bp.route('/remove-label', methods=["POST"])
def remove_label():
  req = request.get_json()
  print(req)
  try: 
    db = get_db()
    db.execute("""
      DELETE FROM tile_labels
      WHERE id IN (
        SELECT tile_labels.id FROM tile_labels
        JOIN labels ON labels.id = tile_labels.label_id
        JOIN tiles ON tiles.id = tile_labels.tile_id
        JOIN slides ON tiles.slide_id = slides.id
        WHERE slides.slide_name=? AND tiles.coords=? AND labels.label=?
      )
    """,
    (req['name'], req['coords'], req['label']))
    db.commit()
  except db.IntegrityError as e:
    print(e)
    return Response(status=500)

  return Response(status=200)


@bp.route('/add-label', methods=["POST"])
def add_label():
  req = request.get_json()
  db = get_db()
  # Check for valid input
  if len(req['label']) <= 0:
    return Response(status=400)

  try:
    # Check if slide is already added
    slides = db.execute(
            "SELECT * FROM slides WHERE slide_name=?",
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
      tiles = db.execute("SELECT * FROM tiles WHERE slide_id=? AND coords=?", (slide_id, req['coords']))
      tile = tiles.fetchone()
      # If tile doesn't exist in db, add it with new label
      if not tile:
        db.execute(
          "INSERT INTO tiles (slide_id, coords) VALUES (?, ?)", 
          (slide_id, req['coords'])
          )
        db.commit()
    
    # Check if label exists
    labels = db.execute("SELECT * FROM labels WHERE label=?", (req['label'],))
    label = labels.fetchone()
    if not label:
      db.execute("INSERT INTO labels (label) VALUES (?)", (req['label'],))
      db.commit()

    tile = db.execute("SELECT id FROM tiles WHERE slide_id=(SELECT id FROM slides WHERE slide_name=?) AND coords=?", (req['name'], req['coords']))
    tile_id = tile.fetchone()['id']
    label = db.execute("SELECT id FROM labels WHERE label=?", (req['label'],))
    label_id = label.fetchone()['id']
    # Add the new label
    db.execute(
      "INSERT INTO tile_labels (tile_id, label_id) VALUES (?, ?)",
      (tile_id, label_id))
    db.commit()

  except db.IntegrityError as e:
    print(e)
    return Response(status=500)

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