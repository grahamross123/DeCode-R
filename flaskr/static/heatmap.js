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
      pred.id = i + pad(j, 4); // Add coordinates to the id
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

function addLabels(labelsDict) {
  $("#image-interactive")
    .find(".predictions")
    .children()
    .each((i, row) => {
      [...row.children].forEach((cell, j) => {
        if (labelsDict[cell.id]) {
          cell.classList.add("label");
        }
      });
    });
}

function removeLabels() {
  $("#image-interactive").find(".label").removeClass("label");
}

function listenShowLabels(labelsDict) {
  $(document).ready(() => {
    $("#labels-checkbox").on("change", (event) => {
      if ($("#labels-checkbox").is(":checked")) {
        addLabels(labelsDict);
      } else {
        removeLabels();
      }
    });
  });
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
    $("#heatmap-dropdown").on("change", (event) => {
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

function showCommentBox(divId, labelsDict) {
  $("#label-list").empty();
  if (labelsDict[divId]) {
    labelsDict[divId].forEach((label) => {
      var labelItem = $(`<li class='label-item'></li>`);
      var labelText = $(`<div class="label-text float-l">${label}</div>`);
      var button = $(`<button class="float-l margin-l">Delete</button>`);
      button.on("click", (event) => {
        handleDeleteLabel(event, divId);
      });
      labelItem.append(labelText);
      labelItem.append(button);
      $("#label-list").append(labelItem);
    });
  } else {
  }
  $("#label-form").css("visibility", "visible");
}

function handleDeleteLabel(event, divId) {
  let label = $(event.target).siblings(".label-text").text();
  let name = document.head.querySelector("[property~=name][content]").content;
  fetch("/heatmap/remove-label", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label: label, coords: divId, name: name }),
  })
    .then((res) => {
      if (res.status === 200) {
      }
    })
    .catch((err) => {
      console.error(err);
    });
}

function highlightDiv(x, y, labelsDict) {
  let divId = x + pad(y, 4);
  // Remove original highlight
  $(".highlight").removeClass("highlight");
  // Add new highlight
  $("#" + divId).addClass("highlight");
  showCommentBox(divId, labelsDict);
}

function addClickCoords(predictionsDict, labelsDict) {
  $(document).ready(function () {
    $("#image-interactive").dblclick(function (event) {
      let coords = pixel2coord(
        event.offsetX,
        event.offsetY,
        this.offsetWidth,
        this.offsetHeight,
        predictionsDict["BAP1"][0].length,
        predictionsDict["BAP1"].length
      );
      highlightDiv(coords[1], coords[0], labelsDict);
      let selectedFilter = $("#heatmap-form").find(":selected").text();
      if (selectedFilter === "None") return;
      let current = predictionsDict[selectedFilter][coords[1]][coords[0]];
      $("#current").text("Current: " + Math.round(current * 1000) / 1000);
    });
  });
}

export function configureGraph(predictionsDict, labelsDict) {
  panzoom("#image-interactive", {
    bound: "outer",
  });
  listenFormChange(predictionsDict);
  addClickCoords(predictionsDict, labelsDict);
  createEmptyOverlay(predictionsDict["BAP1"], "graph");
  listenShowLabels(labelsDict);
  $(document).ready(() => {
    $(".image-box").css("height", $(".image-interactive").height());
  });
}
