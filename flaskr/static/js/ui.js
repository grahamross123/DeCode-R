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

export function initUi() {
  handleSearchSlidesButton();
  handleCurrentSlideButton();
  handleCurrentTileButton();
}
