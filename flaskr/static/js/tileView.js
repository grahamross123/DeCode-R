export class TileView {
  constructor() {
    this.tile_mag; // Magnification of tile image relative to slide view before transform
    this.magnification = 10;
    this.listenIncreaseMag();
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

  updateTileView(divId, slideId, slideName) {
    const params = new URLSearchParams({
      slideName: slideName,
      slideId: slideId,
      tileId: divId,
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
        $("#viewer-img").css("display", "block");
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

  removeTileView() {
    $("#viewer-tile-highlight").css("display", "none");
    $("#viewer-img").removeAttr("src");
    $("#viewer-img").css("display", "none");
  }
}
