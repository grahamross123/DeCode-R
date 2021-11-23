function handleSearchSlidesButton() {
  $("#search-slides-button").click((event) => {
    $(".btn-active").removeClass("btn-active");
    $(".tab-active").removeClass("tab-active");
    event.target.classList.add("btn-active");
    $("#search-slides-tab").addClass("tab-active");
  });
}
function handleCurrentSlideButton() {
  $("#current-slide-button").click((event) => {
    $(".btn-active").removeClass("btn-active");
    $(".tab-active").removeClass("tab-active");
    event.target.classList.add("btn-active");
    $("#current-slide-tab").addClass("tab-active");
  });
}
function handleCurrentTileButton() {
  $("#current-tile-button").click((event) => {
    $(".btn-active").removeClass("btn-active");
    $(".tab-active").removeClass("tab-active");
    event.target.classList.add("btn-active");
    $("#current-tile-tab").addClass("tab-active");
  });
}

function listenAddLabel(heatmap) {
  let form = document.getElementById("label-form");
  form.addEventListener("submit", (event) => {
    handleAddLabel(event, heatmap);
  });
}

function handleAddLabel(event, heatmap) {
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
    name: heatmap.name,
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
        if (heatmap.labelsDict[coords]) {
          heatmap.labelsDict[coords].push(label);
        } else {
          heatmap.labelsDict[coords] = [label];
        }
        // Add the new label to the current list of labels
        addLabelsText(label, coords, heatmap);
      }
    })
    .catch((err) => {
      console.error(err);
    });
}

// Adds a label to the comment box given a label name and coordinates
function addLabelsText(label, divId, heatmap) {
  var labelItem = $(`<li class='label-item'></li>`);
  var labelText = $(`<div class="label-text float-l">${label}</div>`);
  var button = $(
    `<button class="label-button float-r margin-l">Delete</button>`
  );
  button.on("click", (event) => {
    handleDeleteLabel(event, divId, heatmap);
  });
  labelItem.append(labelText);
  labelItem.append(button);
  $("#label-list").append(labelItem);
}

function handleDeleteLabel(event, divId, heatmap) {
  let label = $(event.target).siblings(".label-text").text();
  fetch("/heatmap/remove-label", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label: label, coords: divId, name: heatmap.name }),
  })
    .then((res) => {
      if (res.status === 200) {
        removeLabelsText(label);
        heatmap.labelsDict[divId].pop();
        // Delete the key in the dict if there are no labels
        if (heatmap.labelsDict[divId].length === 0) {
          delete heatmap.labelsDict[divId];
        }
      }
    })
    .catch((err) => {
      console.error(err);
    });
}

export function addSlideInfo(title) {
  $("#slide-title").text("Region: " + title);
}

function removeLabelsText(label) {
  $("#label-list")
    .find(`div:contains("${label}"):first`)
    .closest("li")
    .remove();
}

export function showLabelsText(divId, heatmap) {
  $("#label-list").empty();
  $("#label-comment").empty();
  if (heatmap.labelsDict[divId]) {
    heatmap.labelsDict[divId].forEach((label) => {
      addLabelsText(label, divId, heatmap);
    });
  }
  $("#label-form").css("display", "block");
}

export function initUi(heatmap) {
  handleSearchSlidesButton();
  handleCurrentSlideButton();
  handleCurrentTileButton();
  listenAddLabel(heatmap);
}
