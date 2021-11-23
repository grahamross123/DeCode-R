import csv
import os

PREDICTION_FOLDER = "/Volumes/ddt/working/DeepHiPa/resources/models/omero0_inception_v3_lr0.1_mag20_patch299x299/epoch_50_1634309293/maps/"
SLIDE_NAME = "K252_PR005"


def get_predictions(slide_name):
  predictions_dict = {}
  for filename in os.listdir(PREDICTION_FOLDER):
    if not "tsv" in filename:
      continue
    if slide_name in filename:
      for mutation in ["BAP1", "PBRM1"]:
        predictions_dict[mutation] = read_predictions(PREDICTION_FOLDER + filename)
  return predictions_dict

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

print(get_predictions(SLIDE_NAME))