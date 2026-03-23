document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("basketball");
  const ctx = canvas.getContext("2d");
  ctx.rect(0, 0, 300, 400);
  ctx.fillStyle = "red";
    ctx.stroke();
    ctx.fill();
  const image = new Image();
  image.src = "../img/hoop.png";

  image.onload = () => {
    ctx.drawImage(image, 130, 50, 150, 100);

    ctx.beginPath();
    
   
  };
});