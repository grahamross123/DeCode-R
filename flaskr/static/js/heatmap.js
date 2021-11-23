import { panzoom } from "./panzoom.js";
import { prob2rgba, pad, pixel2coord } from "./util.js";
import { showLabelsText, addSlideInfo } from "./ui.js";

export class Heatmap {
  constructor(tileView) {
    this.selectedLabels = [];
    this.tileView = tileView;
    this.addEventListeners();
    panzoom("#image-interactive", {
      bound: "none",
      scale_max: 40,
    });
    $(".image-box").css("height", $("#viewer-img").width());
    this.resetImage();
  }

  // Create an array of empty divs corresponding to the size of the predictions array
  createEmptyOverlay() {
    // Remove original predictions array
    $(".predictions").empty();
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

  // Add heatmaps to the select heatmaps list
  updateHeatmapsList() {
    let list = $("#heatmap-radio-list");
    list.empty();
    list.append(`
    <label class="dropdown-option">
      <input type="radio" name="dropdown-group" value="None" checked="checked"/>
      None
    </label>
    `);
    for (const mutation in this.predictionsDict) {
      list.append(`
      <label class="dropdown-option">
        <input type="radio" name="dropdown-group" value="${mutation}" />
        ${mutation}
      </label>
      `);
    }
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
    this.tileView.updateTileView(divId, this.slideId, this.name);
    this.addPredictionValues(coords);
    showLabelsText(divId, this);
    this.updateSelectedProb(coords);
  }

  addPredictionValues(coords) {
    let predictionValues = $("#prediction-values");
    predictionValues.empty();
    for (const mutation in this.predictionsDict) {
      predictionValues.append(`
      <div id="${mutation}">${mutation}: ${
        this.predictionsDict[mutation][coords[1]][coords[0]]
      }</div>
      `);
    }
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

  addEventListeners() {
    this.listenHeatmapDropdown();
    this.listenShowLabels();
    this.listenDblClick();
    this.listenResetImage();
    this.listenScroll();
    this.listenClickSlideButton();
  }

  loadNewSlide(slideId) {
    this.slideId = slideId;
    const params = new URLSearchParams({
      slideId: this.slideId,
    });
    fetch(`/heatmap/get-slide?${params.toString()}`, {
      method: "GET",
    })
      .then((res) => res.json())
      .then((slideData) => {
        this.loadSlideData(slideData);
      })
      .catch((err) => {
        console.error(err);
        return {};
      });
  }

  listenClickSlideButton() {
    $("#search-slides-list")
      .find("li")
      .click((event) => {
        this.loadNewSlide(event.target.id);
      });
  }

  updateImage(imageData) {
    let heatmapImg = $(".heatmap-img");
    heatmapImg.css("visibility", "visible");
    heatmapImg.attr("src", "data:image/jpeg;base64," + imageData);
  }

  loadSlideData(slideData) {
    this.updateImage(slideData["image"]);
    this.tileView.removeTileView();
    this.selectedLabels = [];
    this.labelsDict = slideData["labels"];
    this.name = slideData["name"];
    this.predictionsDict = slideData["predictions"];
    this.updateHeatmapsList();
    this.createEmptyOverlay();
    this.showLabels();
    this.resetImage();
    this.showLabels();
    addSlideInfo(this.name);
  }
}
