// Create a random array of predictions for testing
function createRandomPredictions(width, height) {
  var result = [];
  for (var i = 0; i < width; i++) {
    result[i] = [];
    for (var j = 0; j < height; j++) {
      result[i][j] = Math.random();
    }
  }
  result[0][8] = null;
  return result;
}

// Function to use 2D prediction array to populate the image with coloured divs
function createOverlay(predictions, graphId) {
  const heightPct = 100 / predictions.length;
  const widthPct = 100 / predictions[0].length;
  let predDiv = $("#" + graphId).find(".predictions");
  // Delete the overlay existing overlay
  removeOverlay(graphId);
  for (let i = 0; i < predictions.length; i++) {
    let row = document.createElement("span");
    row.style.display = "block";
    row.style.height = heightPct + "%";
    row.style.width = "100%";
    for (let j = 0; j < predictions[i].length; j++) {
      let pred = document.createElement("div");
      pred.classList.add("tile");
      if (predictions[i][j] === "nan") {
        pred.style.backgroundColor = "black";
      } else {
        pred.style.backgroundColor = prob2rgba(predictions[i][j], 0.5);
      }
      pred.style.width = widthPct + "%";
      pred.style.height = "100%";
      row.appendChild(pred);
    }
    predDiv.append(row);
  }
}

function prob2rgba(prob, opacity) {
  if (prob < 0.5) {
    let colour = (0.5 - prob) * 255;
    return `rgb(${colour}, ${colour}, 255, ${opacity}`;
  }
  if (prob >= -0.5) {
    let colour = (0.5 - prob) * 255;
    return `rgba(255, ${colour}, ${colour}, ${opacity})`;
  }
}

function removeOverlay(graphId) {
  $("#" + graphId)
    .find(".predictions")
    .empty();
}

// Listen for a change in the radio form and update the graph overlay accordingly
function listenFormChange(predictionsDict) {
  $(document).ready(() => {
    $(document).on("change", (event) => {
      let value = event.target.value;
      let graphId = $(event.target).closest(".col")[0].id;
      // Don't add an overlay if "none" is selected
      if (value === "None") {
        removeOverlay(graphId);
        return;
      }
      createOverlay(predictionsDict[value], graphId);
    });
  });
}

function addGraph(imgPath, mutations, idx) {
  radioForm = "";
  mutations.forEach((mutation, idx) => {
    radioFormItem = `
    <input type="radio" id="${mutation}" name="overlay" value="${mutation}"
    <label for="${mutation}">${mutation}</label><br />
    `;
    radioForm += radioFormItem;
  });
  let graphHTML =
    `
    <div class="col" id=${"graph" + idx}>
      <div class="padding">
        <div class="image-box float-l">
          <img
            class="image"
            src="data:image/jpeg;base64,${imgPath}"
            alt="Scan"
          />
          <div class="predictions"></div>
        </div>
        <form id=${"form" + idx}>
          <input type="radio" id="None" name="overlay" value="None" checked />
          <label for="none">None</label><br />
          ` +
    radioForm +
    `
        </form>
        <button onclick="deleteGraph(this)">Remove</button>
      </div>
    </div>
  `;
  $(".row").append(graphHTML);
}

function deleteGraph(elem) {
  $(elem).closest(".col").remove();
}

// $("document").ready(() => {
//   let predictions = createRandomPredictions(10, 20);
//   createOverlay(predictions);
// });