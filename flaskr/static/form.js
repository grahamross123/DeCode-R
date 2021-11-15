$(document).ready(() => {
  let form = $("#label-form");
  form.on("submit", (event) => {
    event.preventDefault(); // prevent page from refreshing
    const formData = new FormData(); // grab the data inside the form fields
    console.log(event);
    fetch("/heatmap", {
      // assuming the backend is hosted on the same server
      method: "POST",
      body: formData,
    }).then(function (response) {});
  });
});
