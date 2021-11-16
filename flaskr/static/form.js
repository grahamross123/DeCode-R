import { configureGraph } from "./heatmap.js";

export function handleAddLabel(name) {
  $(document).ready(() => {
    let form = document.getElementById("label-form");
    form.addEventListener("submit", (event) => {
      event.preventDefault(); // prevent page from refreshing
      const formData = new FormData(event.target); // grab the data inside the form fields
      if (!$(".highlight")[0]) return; // If no cell is highlighted, don't post anything

      // Add warning if no label text is in label field
      if (!formData.get("label")) {
        let comment = $("#label-comment");
        comment.css("color", "red");
        comment.text("Please add a label");
        return;
      }

      let labelData = {
        label: formData.get("label"),
        coords: $(".highlight")[0].id,
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
            let comment = $("#label-comment");
            comment.css("color", "green");
            comment.text("Added label");
          }
        })
        .catch((err) => {
          console.error(err);
        });
    });
  });
}

export function handleRemoveLabel(name) {
  $(document).ready(() => {});
}
