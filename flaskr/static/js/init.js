import { Heatmap } from "./heatmap.js";
import { TileView } from "./tileView.js";
import { initUi } from "./ui.js";

const SLIDE_ID1 = 12111;
const SLIDE_ID2 = 13008;

export function initAll() {
  let tileView = new TileView();
  let heatmap = new Heatmap(tileView);
  initUi(heatmap);
  $("#load-image1").click(() => {
    heatmap.loadNewSlide(SLIDE_ID1);
  });
  $("#load-image2").click(() => {
    heatmap.loadNewSlide(SLIDE_ID2);
  });
}
