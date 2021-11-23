from flask import Blueprint, render_template, request, Response, jsonify
from PIL import Image
import base64
import io
import csv
from flaskr.db import get_db
from flaskr.Omero import Omero
from flaskr.util import decrypt_credentials
import os


bp = Blueprint("heatmap", __name__, url_prefix="/heatmap")
IMG_PATH = './flaskr/static/images/slide.jpeg'
PRED_PATH_BAP1 = './flaskr/static/predictions_BAP1.tsv'
PRED_PATH_PBRM1 = './flaskr/static/predictions_PBRM1.tsv'
GROUND_TRUTH = {"PBRM1": 1, "BAP1": 0}
REGION_NAME = "Region Name"

PROJECT_ID = 355
PREDICTION_FOLDER = "/Volumes/ddt/working/DeepHiPa/resources/models/omero0_inception_v3_lr0.1_mag20_patch299x299/epoch_50_1634309293/maps/"


def omero_init():
  host = 'ssl://omero-prod.camp.thecrick.org'
  pri_key_file = os.path.expanduser('~/omero.pri.key')
  credentials_filename = '.omero_credentials'
  usr, pwd = decrypt_credentials(pri_key_file, credentials_filename)
  omero = Omero(host, usr, pwd)
  omero.connect()
  omero.switch_user_group()
  return omero

omero = omero_init()

@bp.route('', strict_slashes=False)
def tiles():
  return render_template(
    "heatmap.html", 
    all_labels=get_all_labels(),
    slides=get_slide_names()
    )

    
@bp.route('/remove-label', methods=["POST"])
def remove_label():
  req = request.get_json()
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
        LIMIT 1
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
    db.execute("INSERT INTO slides (slide_name) VALUES (?)", (req['name'],))
    db.commit()
    print("Added slide")
  except db.IntegrityError as e:
    print("Slide already added")

  slide_id = db.execute("SELECT * FROM slides WHERE slide_name=?", (req['name'],))
  slide_id = slide_id.fetchone()["id"]

  try:
    db.execute(
          "INSERT INTO tiles (slide_id, coords) VALUES (?, ?)", 
          (slide_id, req['coords'])
          )
    db.commit()
    print("Tile added")
  except db.IntegrityError as e:
    print("Tile already added")

  label_id = db.execute("SELECT id FROM labels WHERE label=?", (req['label'],))
  label_id = label_id.fetchone()['id']

  tile_id = db.execute("SELECT id FROM tiles WHERE slide_id=(SELECT id FROM slides WHERE slide_name=?) AND coords=?", (req['name'], req['coords']))
  tile_id = tile_id.fetchone()['id']

  db.execute(
    "INSERT INTO tile_labels (tile_id, label_id) VALUES (?, ?)",
    (tile_id, label_id))
  db.commit()

  return Response(status=200)


@bp.route('/get-tile')
def get_tile():
  slide_id = request.args.get('slideId')
  tile_id = request.args.get('tileId')
  slide_name = request.args.get('slideName')
  image = omero.open_image(slide_id)
  predictions = get_single_prediction(slide_name)
  nrows = len(predictions)
  ncols = len(predictions[0])
  N_TILES = 3
  # coords = (int(tile_id[:-4]) - ntiles//2, int(tile_id[-4:]) - ntiles//2)
  fx = (int(tile_id[:-4]) - N_TILES // 2) / ncols
  fy = (int(tile_id[-4:]) - N_TILES // 2) / nrows
  fw = N_TILES / ncols
  fh = N_TILES/ nrows
  tile = omero.get_segment(image, fx, fy, fw, fh)
  mag = max(nrows, ncols) / N_TILES
  pil_img = Image.fromarray(tile)
  buff = io.BytesIO()
  pil_img.save(buff, format="JPEG")

  image_string = base64.b64encode(buff.getvalue()).decode("utf-8")
  return jsonify({"mag": mag, "data": image_string})


@bp.route('/get-slide')
def get_slide():
  slide_id = request.args.get("slideId")
  image_obj = omero.open_image(slide_id)
  slide_image = load_slide_omero(image_obj)
  slide_name = image_obj.getName()
  return jsonify({
    "image": slide_image, 
    "predictions": get_predictions(slide_name), 
    "ground-truth": GROUND_TRUTH,
    "name": slide_name,
    "labels": get_labels(slide_name),
    })

def get_single_prediction(slide_name):
  for filename in os.listdir(PREDICTION_FOLDER):
    if not "tsv" in filename:
      continue
    if slide_name in filename:
      return read_predictions(PREDICTION_FOLDER + filename)

def get_predictions(slide_name):
  predictions_dict = {}
  for filename in os.listdir(PREDICTION_FOLDER):
    if not "tsv" in filename:
      continue
    if slide_name in filename:
      for mutation in ["BAP1", "PBRM1"]:
        if mutation in filename:
          predictions_dict[mutation] = read_predictions(PREDICTION_FOLDER + filename)
  return predictions_dict

def get_slide_names():
  slides = []
  image_objects = omero.get_project_images(PROJECT_ID)
  for image_object in image_objects:
    image_name = image_object.getName()
    if "macro" in image_name or "label" in image_name:
      continue
    # if any(image_name in prediction_file for prediction_file in os.listdir(PREDICTION_FOLDER)):
    slides.append({"name": image_name, "id": image_object.getId()})
  return slides


def load_slide(path):
  img = Image.open(path)
  data = io.BytesIO()
  img.save(data, "JPEG")
  encoded_img_data = base64.b64encode(data.getvalue())
  return encoded_img_data.decode("utf-8")


def load_slide_omero(image):
    thumb_x = image.getSizeX() / 20
    thumb_y = image.getSizeY() / 20
    image_bytes = omero.extract_thumbnail(image, (thumb_x, thumb_y))
    data = io.BytesIO(image_bytes)
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


def get_all_labels():
  all_labels = []
  # Obtain all labels for the current slide
  try:
    db = get_db()
    # Obtain all labels in the labels table
    labels_query = db.execute("SELECT label FROM labels")
    for label in labels_query.fetchall():
      all_labels.append(label["label"])
  except Exception as e:
    print(e)
  return all_labels


def get_labels(region_name):
  # Obtain all labels for the current slide
  labels = {}
  try:
    db = get_db()
    # Obtain all tiles on the current slide which have a label
    tiles_query = db.execute("""
      SELECT tiles.coords, labels.label FROM tile_labels 
      JOIN labels ON labels.id = tile_labels.label_id
      JOIN tiles ON tiles.id = tile_labels.tile_id
      JOIN slides ON tiles.slide_id = slides.id
      WHERE slides.slide_name = ?
      """, (region_name,))
    tile_labels = tiles_query.fetchall()
    for tile in tile_labels:
      if tile['coords'] in labels:
        labels[tile['coords']].append(tile['label'])
      else:
        labels[tile["coords"]] = [tile["label"]]
  except Exception as e:
    print(e)

  return labels