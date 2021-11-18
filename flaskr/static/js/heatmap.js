import { panzoom } from "./panzoom.js";
import { listenAddLabel, handleDeleteLabel } from "./form.js";
import { prob2rgba, pad, pixel2coord } from "./util.js";

var selectedLabels = [];
export var labelsDict;
export var name;
var magnification;

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
function colourOverlay(predictions, empty) {
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
        if (labelsDict[cell.id]) {
          let isIncluded = labelsDict[cell.id].some((ai) =>
            selectedLabels.includes(ai)
          );
          if (isIncluded) {
            cell.classList.add("label");
          }
        }
      });
    });
}

function hideLabels() {
  $("#image-interactive").find(".label").removeClass("label");
}

function listenIncreaseMag() {
  $("#magnification-button").click((event) => {
    // TODO: After increasing magnification, reload the image
    if (event.target.innerText === "x 10") {
      event.target.innerText = "x 20";
      magnification = 20;
    } else if (event.target.innerText === "x 20") {
      event.target.innerText = "x 40";
      magnification = 40;
    } else if (event.target.innerText === "x 40") {
      event.target.innerText = "x 10";
      magnification = 10;
    }
  });
}

function listenShowLabels() {
  listenSelectAll();
  $(document).click(() => {
    $("#labels-checkbox-list").removeClass("active");
    $("#labels-label").removeClass("active");
  });
  $("#labels-label").click((event) => {
    event.stopPropagation();
    $("#labels-label").toggleClass("active");
    $("#labels-checkbox-list").toggleClass("active");
  });
  $("#labels-checkbox-list").click((event) => {
    event.stopPropagation();
  });
  $("#labels-checkbox-list").on("change", (event) => {
    let dropdownItems = $(".dropdown-option").find("input");
    selectedLabels = [];
    for (var i = 0; i < dropdownItems.length; i++) {
      if (
        dropdownItems[i].type == "checkbox" &&
        dropdownItems[i].checked == true
      ) {
        selectedLabels.push(dropdownItems[i].value);
      }
    }
    hideLabels();
    if (selectedLabels) {
      showLabels();
    }
  });
}

// Listen for the select all button in the dropdown menu
function listenSelectAll() {
  $("#select-all").on("change", (event) => {
    toggleSelectAll(event.target);
  });
}

// Check / uncheck all boxes in dropdown menu
function toggleSelectAll(source) {
  let checkboxes = $("#labels-checkbox-list").find("input");
  for (let i = 0; i < checkboxes.length; i++) {
    checkboxes[i].checked = source.checked;
  }
}

// Listen for a change in the radio form and update the graph overlay accordingly
function listenHeatmapDropdown(predictionsDict) {
  listenSelectAll();
  $(document).click(() => {
    $("#heatmap-radio-list").removeClass("active");
    $("#heatmap-label").removeClass("active");
  });
  $("#heatmap-label").click((event) => {
    event.stopPropagation();
    $("#heatmap-label").toggleClass("active");
    $("#heatmap-radio-list").toggleClass("active");
  });
  $("#heatmap-radio-list").click((event) => {
    event.stopPropagation();
  });
  $("#heatmap-radio-list").on("change", (event) => {
    let value = event.target.value;
    // Add empty overlay if "none" is selected
    if (value === "None") {
      colourOverlay(predictionsDict["BAP1"], true);
      return;
    }
    colourOverlay(predictionsDict[value], false);
  });
}

// Removes a label from the comment box given the label name
export function removeCommentBoxLabel(label) {
  $("#label-list")
    .find(`div:contains("${label}"):first`)
    .closest("li")
    .remove();
}

// Adds a label to the comment box given a label name and coordinates
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
  if (labelsDict[divId]) {
    labelsDict[divId].forEach((label) => {
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

function updateSelectedProb(coords, predictionsDict) {
  let selectedFilter = $("#heatmap-radio-list").find("input:checked").val();
  if (selectedFilter === "None") return;
  let current = predictionsDict[selectedFilter][coords[1]][coords[0]];
  $("#current").text("Current: " + Math.round(current * 1000) / 1000);
}

function updateTileView(divId) {
  const params = new URLSearchParams({
    name: name,
    tileId: divId,
    mag: magnification,
  });
  fetch(`/heatmap/get-tile?${params.toString()}`, {
    method: "GET",
  })
    .then((res) => res.json())
    .then((data) => {
      document.getElementById(
        "viewer-img"
      ).src = `data:image/jpeg;base64,${data}`;
    })
    .catch((err) => {});
}

// Handles double clicking on the interactive image
function handleDblClick(event, predictionsDict) {
  hideLabels();
  showLabels();
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
  updateTileView(divId, 10);
  showCommentBox(divId);
  updateSelectedProb(coords, predictionsDict);
}

function listenDblClick(predictionsDict) {
  $("#image-interactive").dblclick(function (event) {
    handleDblClick(event, predictionsDict);
  });
}

export function initHeatmap(predictionsDict, _labelsDict, _name) {
  // Add template variables to global scope
  labelsDict = _labelsDict;
  name = _name;
  panzoom("#image-interactive", {
    bound: "none",
  });
  createEmptyOverlay(predictionsDict["BAP1"], "graph");
  listenHeatmapDropdown(predictionsDict);
  listenShowLabels();
  listenAddLabel();
  listenDblClick(predictionsDict);
  listenIncreaseMag();
  //$(".image-box").css("height", $(".image-interactive").height());
  $(".image-box").css("height", $("#viewer-img").width());
  $("#viewer-img").css("height", $("#viewer-img").width());
}
