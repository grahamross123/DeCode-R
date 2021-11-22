import { panzoom } from "./panzoom.js";
import { prob2rgba, pad, pixel2coord } from "./util.js";

export class Heatmap {
  constructor(predictionsDict, labelsDict, name, imageData) {
    this.selectedLabels = [];
    this.labelsDict = labelsDict;
    this.name = name;
    this.magnification = 10;
    this.predictionsDict = predictionsDict;
    this.imageData = imageData;
    this.tile_mag; // Magnification of tile image relative to slide view before transform
    // Add template variables to global scope
    panzoom("#image-interactive", {
      bound: "none",
      scale_max: 40,
    });
    this.createEmptyOverlay();
    this.addAllEventListeners();
    $(".image-box").css("height", $("#viewer-img").width());
    this.resetImage();
  }

  // Create an array of empty divs corresponding to the size of the predictions array
  createEmptyOverlay() {
    let predictionsArray = Object.values(this.predictionsDict)[0];
    const heightPct = 100 / predictionsArray.length;
    const widthPct = 100 / predictionsArray[0].length;
    let predDiv = $("#image-interactive").find(".predictions");
    for (let i = 0; i < predictionsArray.length; i++) {
      let row = document.createElement("span");
      row.style.display = "block";
      row.style.height = heightPct + "%";
      row.style.width = "100%";
      for (let j = 0; j < predictionsArray[i].length; j++) {
        let pred = document.createElement("div");
        pred.classList.add("tile");
        pred.id = pad(j, 4) + pad(i, 4); // Add coordinates to the id
        pred.style.width = widthPct + "%";
        pred.style.height = "100%";
        row.appendChild(pred);
      }
      predDiv.append(row);
    }
  }

  listenAddLabel() {
    let form = document.getElementById("label-form");
    form.addEventListener("submit", (event) => {
      this.handleAddLabel(event);
    });
  }

  handleAddLabel(event) {
    // TODO: adding a unique label doesn't update the select labels dropdown
    // i.e. need to refresh page to see it

    event.preventDefault(); // prevent page from refreshing
    const formData = new FormData(event.target); // grab the data inside the form fields
    if (!$(".highlight")[0]) return; // If no cell is highlighted, don't post anything
    var coords = $(".highlight")[0].id;
    var label = formData.get("label");
    // Add warning if no label text is in label field
    if (!formData.get("label")) {
      return;
    }
    let labelData = {
      label: label,
      coords: coords,
      name: this.name,
    };
    fetch("/heatmap/add-label", {
      method: "POST",
      body: JSON.stringify(labelData),
      headers: new Headers({
        "content-type": "application/json",
      }),
    })
      .then((res) => {
        if (res.status === 200) {
          // Clear the label input
          document.getElementById("label-input").value = "";
          // Add the new label to the global variable labelsDict
          if (this.labelsDict[coords]) {
            this.labelsDict[coords].push(label);
          } else {
            this.labelsDict[coords] = [label];
          }
          // Add the new label to the current list of labels
          this.addLabelsText(label, coords);
        }
      })
      .catch((err) => {
        console.error(err);
      });
  }

  // Adds a label to the comment box given a label name and coordinates
  addLabelsText(label, divId) {
    var labelItem = $(`<li class='label-item'></li>`);
    var labelText = $(`<div class="label-text float-l">${label}</div>`);
    var button = $(
      `<button class="label-button float-r margin-l">Delete</button>`
    );
    button.on("click", (event) => {
      this.handleDeleteLabel(event, divId);
    });
    labelItem.append(labelText);
    labelItem.append(button);
    $("#label-list").append(labelItem);
  }

  handleDeleteLabel(event, divId) {
    let label = $(event.target).siblings(".label-text").text();
    fetch("/heatmap/remove-label", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: label, coords: divId, name: this.name }),
    })
      .then((res) => {
        if (res.status === 200) {
          this.removeLabelsText(label);
          this.labelsDict[divId].pop();
          // Delete the key in the dict if there are no labels
          if (this.labelsDict[divId].length === 0) {
            delete this.labelsDict[divId];
          }
        }
      })
      .catch((err) => {
        console.error(err);
      });
  }

  removeLabelsText(label) {
    $("#label-list")
      .find(`div:contains("${label}"):first`)
      .closest("li")
      .remove();
  }

  // Colour the prediction divs according to the prediction array
  colourOverlay(predictions, empty) {
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

  showLabels() {
    $("#image-interactive")
      .find(".predictions")
      .children()
      .each((i, row) => {
        [...row.children].forEach((cell, j) => {
          if (this.labelsDict[cell.id]) {
            let isIncluded = this.labelsDict[cell.id].some((ai) =>
              this.selectedLabels.includes(ai)
            );
            if (isIncluded) {
              cell.classList.add("label");
            }
          }
        });
      });
  }

  hideLabels() {
    $("#image-interactive").find(".label").removeClass("label");
  }

  listenIncreaseMag() {
    $("#magnification-button").click((event) => {
      // TODO: After increasing magnification, reload the image
      if (event.target.innerText === "x 10") {
        event.target.innerText = "x 20";
        this.magnification = 20;
      } else if (event.target.innerText === "x 20") {
        event.target.innerText = "x 40";
        this.magnification = 40;
      } else if (event.target.innerText === "x 40") {
        event.target.innerText = "x 10";
        this.magnification = 10;
      }
      if (this.tile_mag) this.updateTileZoom();
    });
  }

  listenShowLabels() {
    this.listenSelectAll();
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
      this.selectedLabels = [];
      for (var i = 0; i < dropdownItems.length; i++) {
        if (
          dropdownItems[i].type == "checkbox" &&
          dropdownItems[i].checked == true
        ) {
          this.selectedLabels.push(dropdownItems[i].value);
        }
      }
      this.hideLabels();
      if (this.selectedLabels) {
        this.showLabels();
      }
    });
  }

  // Listen for the select all button in the dropdown menu
  listenSelectAll() {
    $("#select-all").on("change", (event) => {
      this.toggleSelectAll(event.target);
    });
  }

  // Check / uncheck all boxes in dropdown menu
  toggleSelectAll(source) {
    let checkboxes = $("#labels-checkbox-list").find("input");
    for (let i = 0; i < checkboxes.length; i++) {
      checkboxes[i].checked = source.checked;
    }
  }

  // Listen for a change in the radio form and update the heatmap overlay accordingly
  listenHeatmapDropdown() {
    this.listenSelectAll();
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
        this.colourOverlay(this.predictionsDict["BAP1"], true);
        return;
      }
      this.colourOverlay(this.predictionsDict[value], false);
    });
  }

  showLabelsText(divId) {
    $("#label-list").empty();
    $("#label-comment").empty();
    if (this.labelsDict[divId]) {
      this.labelsDict[divId].forEach((label) => {
        this.addLabelsText(label, divId);
      });
    }
    $("#label-form").css("display", "block");
  }

  highlightDiv(divId) {
    // Remove original highlight
    $(".highlight").removeClass("highlight");
    // Add new highlight
    $("#" + divId).addClass("highlight");
  }

  updateSelectedProb(coords) {
    let heatmapInputs = $("#heatmap-radio-list").find("input");
    for (let i = 0; i < heatmapInputs.length; i++) {
      let mutation = heatmapInputs[i].value;
      if (mutation === "None") continue;
      let probability = this.predictionsDict[mutation][coords[1]][coords[0]];
      $("#" + mutation).text(
        mutation + ": " + Math.round(probability * 1000) / 1000
      );
    }
  }

  updateTileView(divId) {
    const params = new URLSearchParams({
      name: this.name,
      tileId: divId,
      mag: this.magnification,
    });
    fetch(`/heatmap/get-tile?${params.toString()}`, {
      method: "GET",
    })
      .then((res) => res.json())
      .then((image) => {
        document.getElementById(
          "viewer-img"
        ).src = `data:image/jpeg;base64,${image["data"]}`;
        this.tile_mag = image["mag"];
        this.updateTileZoom();
        $("#viewer-tile-highlight").css("display", "block");
      })

      .catch((err) => {
        console.error(err);
      });
  }

  updateTileZoom() {
    $("#viewer-img-box").css(
      "transform",
      `matrix(${this.magnification / this.tile_mag}, 0, 0, ${
        this.magnification / this.tile_mag
      }, 0, 0)`
    );
  }

  // Handles double clicking on the interactive image
  handleDblClick(event) {
    this.hideLabels();
    this.showLabels();
    let imageInteractive = document.getElementById("image-interactive");
    let coords = pixel2coord(
      event.offsetX,
      event.offsetY,
      imageInteractive.offsetWidth,
      imageInteractive.offsetHeight,
      this.predictionsDict["BAP1"][0].length,
      this.predictionsDict["BAP1"].length
    );
    let divId = pad(coords[0], 4) + pad(coords[1], 4);
    this.highlightDiv(divId);
    this.updateTileView(divId, 10);
    this.showLabelsText(divId);
    this.updateSelectedProb(coords);
  }

  listenDblClick() {
    $("#image-interactive").dblclick((event) => {
      this.handleDblClick(event);
    });
  }

  listenResetImage() {
    $("#reset-image-button").click(() => {
      this.resetImage();
      this.setZoomIndicator();
    });
  }

  resetImage() {
    let img = $(".heatmap-img");
    let imgInt = $(".image-interactive");
    let box = $(".image-box");
    if (img.height() > img.width()) {
      img.css("height", "100%");
      imgInt.css("height", "100%");
      imgInt.css("left", box.width() / 2 - img.width() / 2 + "px");
      imgInt.css("top", "0px");
    } else {
      img.css("width", "100%");
      imgInt.css("width", "100%");
      imgInt.css("top", box.height() / 2 - img.height() / 2 + "px");
      imgInt.css("left", "0px");
    }
    imgInt.css("transform", "matrix(1, 0, 0, 1, 0, 0");
  }

  listenScroll() {
    $(".image-box").on("mousewheel", this.setZoomIndicator);
  }

  setZoomIndicator() {
    let obj = $(".image-interactive");
    let transformMatrix =
      obj.css("-webkit-transform") ||
      obj.css("-moz-transform") ||
      obj.css("-ms-transform") ||
      obj.css("-o-transform") ||
      obj.css("transform");
    let matrix = transformMatrix.replace(/[^0-9\-.,]/g, "").split(",");
    let zoom = Math.round(matrix[0] * 100) / 100;
    $("#magnification-display").text("Magnification: " + zoom + "x");
  }

  addAllEventListeners() {
    this.listenHeatmapDropdown();
    this.listenShowLabels();
    this.listenAddLabel();
    this.listenDblClick();
    this.listenIncreaseMag();
    this.listenResetImage();
    this.listenScroll();
    $("#load-image").click(() => {
      this.loadImage(this.imageData);
      this.resetImage();
    });
  }

  loadImage(imageData) {
    $(".heatmap-img").attr("src", "data:image/jpeg;base64," + imageData);
  }
}
