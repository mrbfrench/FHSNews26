document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("basketball");
  const ctx = canvas.getContext("2d");

  const image = new Image();
  image.src = "../img/hoop.png";

  image.onload = () => {
    ctx.drawImage(image, 10, 10, 150, 100);

    // ctx.beginPath();
    // ctx.rect(10, 10, 150, 100);
    // ctx.stroke();
  };
});