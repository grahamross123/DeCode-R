export function prob2rgba(prob, opacity) {
  if (prob < 0.5) {
    let colour = prob * 2 * 255;
    return `rgb(${colour}, ${colour}, 255, ${opacity}`;
  }
  if (prob >= 0.5) {
    let colour = (1 - prob) * 2 * 255;
    return `rgba(255, ${colour}, ${colour}, ${opacity})`;
  }
}

export function pad(num, size) {
  num = num.toString();
  while (num.length < size) num = "0" + num;
  return num;
}

export function pixel2coord(x, y, width, height, ncols, nrows) {
  let xcoord = (x / width) * ncols;
  let ycoord = (y / height) * nrows;
  return [Math.floor(xcoord), Math.floor(ycoord)];
}
