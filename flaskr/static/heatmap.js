import { panzoom } from "./panzoom.js";

// Create an array of empty divs corresponding to the size of the predictions array
function createEmptyOverlay(predictions) {
  const heightPct = 100 / predictions.length;
  const widthPct = 100 / predictions[0].length;
  let predDiv = $("#image-interactive").find(".predictions");
  for (let i = 0; i < predictions.length; i++) {
    let row = document.createElement("span");
    row.style.display = "block";
    row.style.height = heightPct + "%";
    row.style.width = "100%";
    for (let j = 0; j < predictions[i].length; j++) {
      let pred = document.createElement("div");
      pred.classList.add("tile");
      pred.id = pad(i, 4) + pad(j, 4); // Add coordinates to the id
      pred.style.width = widthPct + "%";
      pred.style.height = "100%";
      row.appendChild(pred);
    }
    predDiv.append(row);
  }
}

// Colours the prediction divs according to the prediction array
function createOverlay(predictions, empty) {
  for (let i = 0; i < predictions.length; i++) {
    for (let j = 0; j < predictions[0].length; j++) {
      let cell = $("#image-interactive").find(".predictions").children()[i]
        .children[j];
      if (!empty) {
        if (predictions[i][j] === "nan") {
          cell.style.backgroundColor = "black";
        } else {
          cell.style.backgroundColor = prob2rgba(predictions[i][j], 0.5);
        }
      } else {
        cell.style.backgroundColor = "transparent";
      }
    }
  }
}

function prob2rgba(prob, opacity) {
  if (prob < 0.5) {
    let colour = prob * 2 * 255;
    return `rgb(${colour}, ${colour}, 255, ${opacity}`;
  }
  if (prob >= 0.5) {
    let colour = (1 - prob) * 2 * 255;
    return `rgba(255, ${colour}, ${colour}, ${opacity})`;
  }
}

// Listen for a change in the radio form and update the graph overlay accordingly
function listenFormChange(predictionsDict) {
  $(document).ready(() => {
    $("#heatmap-form").on("change", (event) => {
      let value = event.target.value;
      // Add empty overlay if "none" is selected
      if (value === "None") {
        createOverlay(predictionsDict["BAP1"], true);
        return;
      }
      createOverlay(predictionsDict[value], false);
    });
  });
}

function pad(num, size) {
  num = num.toString();
  while (num.length < size) num = "0" + num;
  return num;
}

function pixel2coord(x, y, width, height, ncols, nrows) {
  let xcoord = (x / width) * ncols;
  let ycoord = (y / height) * nrows;
  return [Math.floor(xcoord), Math.floor(ycoord)];
}

function highlightDiv(x, y) {
  let divId = pad(x, 4) + pad(y, 4);
  // Remove original highlight
  $(".highlight").removeClass("highlight");
  // Add new highlight
  $("#" + divId).addClass("highlight");
}

function addClickCoords(predictionsDict) {
  $(document).ready(function () {
    $("#image-interactive").dblclick(function (event) {
      let coords = pixel2coord(
        event.offsetX,
        event.offsetY,
        this.offsetWidth,
        this.offsetHeight,
        predictionsDict["BAP1"][0].length, // TODO: Add support for multiple rows / cols for different mutations
        predictionsDict["BAP1"].length
      );
      highlightDiv(coords[1], coords[0]);
      let selectedFilter = $("#heatmap-form").find(":selected").text();
      if (selectedFilter === "None") return;
      let current = predictionsDict[selectedFilter][coords[1]][coords[0]];
      $("#current").text("Current: " + Math.round(current * 1000) / 1000);
    });
  });
}

export function configureGraph(predictionsDict) {
  panzoom("#image-interactive", {
    bound: "outer",
  });
  listenFormChange(predictionsDict);
  addClickCoords(predictionsDict);
  createEmptyOverlay(predictionsDict["BAP1"], "graph");
  $(document).ready(() => {
    $(".image-box").css("height", $(".image-interactive").height());
  });
}
