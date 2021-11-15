export function handleLabelForm(name) {
  $(document).ready(() => {
    let form = document.getElementById("label-form");
    form.addEventListener("submit", (event) => {
      event.preventDefault(); // prevent page from refreshing
      const formData = new FormData(event.target); // grab the data inside the form fields
      if (!$(".highlight")[0]) return; // If no cell is highlighted, don't post anything
      let labelData = {
        label: formData.get("label"),
        coords: $(".highlight")[0].id,
        name: name,
      };
      fetch("/heatmap/label", {
        method: "POST",
        body: JSON.stringify(labelData),
        headers: new Headers({
          "content-type": "application/json",
        }),
      });
    });
  });
}
