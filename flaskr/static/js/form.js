import { labelsDict, name } from "./heatmap.js";

export function listenAddLabel() {
  let form = document.getElementById("label-form");
  form.addEventListener("submit", (event) => {
    handleAddLabel(event);
  });
}

function handleAddLabel(event) {
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
    name: name,
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
        if (labelsDict[coords]) {
          labelsDict[coords].push(label);
        } else {
          labelsDict[coords] = [label];
        }
        // Add the new label to the current list of labels
        addCommentBoxLabel(label, coords);
      }
    })
    .catch((err) => {
      console.error(err);
    });
}

function handleDeleteLabel(event, divId) {
  let label = $(event.target).siblings(".label-text").text();
  fetch("/heatmap/remove-label", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label: label, coords: divId, name: name }),
  })
    .then((res) => {
      if (res.status === 200) {
        removeCommentBoxLabel(label);
        labelsDict[divId].pop();
        // Delete the key in the dict if there are no labels
        if (labelsDict[divId].length === 0) {
          delete labelsDict[divId];
        }
      }
    })
    .catch((err) => {
      console.error(err);
    });
}

// Removes a label from the comment box given the label name
function removeCommentBoxLabel(label) {
  $("#label-list")
    .find(`div:contains("${label}"):first`)
    .closest("li")
    .remove();
}

// Adds a label to the comment box given a label name and coordinates
export function addCommentBoxLabel(label, divId) {
  var labelItem = $(`<li class='label-item'></li>`);
  var labelText = $(`<div class="label-text float-l">${label}</div>`);
  var button = $(
    `<button class="label-button float-r margin-l">Delete</button>`
  );
  button.on("click", (event) => {
    handleDeleteLabel(event, divId);
  });
  labelItem.append(labelText);
  labelItem.append(button);
  $("#label-list").append(labelItem);
}
