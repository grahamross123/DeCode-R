import { panzoom } from "./panzoom.js";
import { listenAddLabel, handleDeleteLabel } from "./form.js";
import { prob2rgba, pad, pixel2coord } from "./util.js";

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

// Colour the prediction divs according to the prediction array
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

function showLabels() {
  $("#image-interactive")
    .find(".predictions")
    .children()
    .each((i, row) => {
      [...row.children].forEach((cell, j) => {
        if (window.labelsDict[cell.id]) {
          cell.classList.add("label");
        }
      });
    });
}

function hideLabels() {
  $("#image-interactive").find(".label").removeClass("label");
}

function listenShowLabels() {
  $("#labels-checkbox").on("change", (event) => {
    if ($("#labels-checkbox").is(":checked")) {
      showLabels();
    } else {
      hideLabels();
    }
  });
}

// Listen for a change in the radio form and update the graph overlay accordingly
function listenHeatmapDropdown(predictionsDict) {
  $("#heatmap-dropdown").on("change", (event) => {
    let value = event.target.value;
    // Add empty overlay if "none" is selected
    if (value === "None") {
      createOverlay(predictionsDict["BAP1"], true);
      return;
    }
    createOverlay(predictionsDict[value], false);
  });
}

export function removeCommentBoxLabel(label) {
  $("#label-list")
    .find(`div:contains("${label}"):first`)
    .closest("li")
    .remove();
}

export function addCommentBoxLabel(label, divId) {
  var labelItem = $(`<li class='label-item'></li>`);
  var labelText = $(`<div class="label-text float-l">${label}</div>`);
  var button = $(`<button class="float-l margin-l">Delete</button>`);
  button.on("click", (event) => {
    handleDeleteLabel(event, divId);
  });
  labelItem.append(labelText);
  labelItem.append(button);
  $("#label-list").append(labelItem);
}

function showCommentBox(divId) {
  $("#label-list").empty();
  let comment = $("#label-comment").empty();
  if (window.labelsDict[divId]) {
    window.labelsDict[divId].forEach((label) => {
      addCommentBoxLabel(label, divId);
    });
  }
  $("#label-form").css("visibility", "visible");
}

function highlightDiv(divId) {
  // Remove original highlight
  $(".highlight").removeClass("highlight");
  // Add new highlight
  $("#" + divId).addClass("highlight");
}

function handleDblClick(event, predictionsDict) {
  if ($("#labels-checkbox").is(":checked")) {
    hideLabels();
    showLabels();
  }
  let imageInteractive = document.getElementById("image-interactive");
  let coords = pixel2coord(
    event.offsetX,
    event.offsetY,
    imageInteractive.offsetWidth,
    imageInteractive.offsetHeight,
    predictionsDict["BAP1"][0].length,
    predictionsDict["BAP1"].length
  );
  let divId = coords[1] + pad(coords[0], 4);
  highlightDiv(divId);
  showCommentBox(divId);
  let selectedFilter = $("#heatmap-form").find(":selected").text();
  if (selectedFilter === "None") return;
  let current = predictionsDict[selectedFilter][coords[1]][coords[0]];
  $("#current").text("Current: " + Math.round(current * 1000) / 1000);
}

export function initHeatmap(predictionsDict, name) {
  panzoom("#image-interactive", {
    bound: "outer",
  });
  listenHeatmapDropdown(predictionsDict);
  createEmptyOverlay(predictionsDict["BAP1"], "graph");
  listenShowLabels();
  listenAddLabel(name);
  $("#image-interactive").dblclick(function (event) {
    handleDblClick(event, predictionsDict);
  });
  $(".image-box").css("height", $(".image-interactive").height());
}
