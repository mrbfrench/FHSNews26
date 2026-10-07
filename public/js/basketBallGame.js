var hoop;
var throwImage;
var guy;
var hitBar;
var hitMark;
var scoreText;
var timeText;
var endScreen;
var endText;
var frameNo = 0;
var hitMarkSpeed = 10;
var myBalls = [];
var startFrame = 0;
var score = 0;
var isEnd = false;

var gameArea = {
  canvas: null,
  context: null,
  interval: null,
  start: function () {
    this.canvas = document.getElementById("basketball");
    if (!this.canvas) {
      console.error("Canvas element not found");
      return;
    }
    this.canvas.width = 400;
    this.canvas.height = 350;
    this.context = this.canvas.getContext("2d");

    // Draw background
    this.context.fillStyle = "lightblue";
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.frameNo = 0;
    this.interval = setInterval(updateGameArea, 20);
  },
  stop: function () {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  },
  clear: function () {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.fillStyle = "lightblue";
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
};

function component(width, height, image, x, y, type, xSpeed) {
  this.width = width;
  this.height = height;
  this.x = x;
  this.y = y;
  this.angle = 0;
  this.speedX = 0;
  this.speedY = 0;
  this.gravity = 0.00;
  this.gravitySpeed = 0;
  this.type = type;

  if (type == "image" || type == "spin") {
    this.image = new Image();
    this.image.src = "../img/basketballgame/" + image;
  }

  this.update = function () {
    var ctx = gameArea.context;
    if (this.type == "image") {
      ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
    } else if (this.type == "spin") {
      ctx.save();
      ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
      ctx.rotate(this.angle);
      // ctx.drawImage(this.image, -this.width / 2, -this.height / 2, this.width, this.height);
      ctx.drawImage(this.image, -this.width / 2, -this.height / 2, this.width, this.height);
      ctx.restore();
    } else if (this.type == "text") {
      ctx.font = this.width + "px Arial";
      ctx.fillStyle = this.fillColor;
      ctx.fillText(this.text, this.x, this.y);
    } else {
      ctx.fillStyle = this.fillColor;
      ctx.fillRect(this.x, this.y, this.width, this.height);
    }
  };

  this.newPos = function () {
    this.gravitySpeed += this.gravity;
    this.x += this.speedX;
    this.y += this.speedY + this.gravitySpeed;
  };
}

function updateGameArea() {
  gameArea.clear();
  gameArea.frameNo += 1;


  if (!isEnd) {
    for (i = 0; i < myBalls.length; i++) {
      if (myBalls[i].x > 400) {
        myBalls.splice(i, 1);
      }
      myBalls[i].angle += 4 * Math.PI / 180;
      myBalls[i].update();
      myBalls[i].newPos();
    }


    hoop.update();
    guy.update();
    hitBar.update();
    hitMark.update();
    scoreText.text = "Score: " + score;
    scoreText.update();
    timeText.text = "Time: " + Math.floor(30 - gameArea.frameNo / 50);
    timeText.update();

    var randomOffset = Math.round(Math.random() * 4 - 2); // Random offset between -2 and 2

    if ((hitMark.x + hitMark.speedX) > 390 || (hitMark.x + hitMark.speedX) < 0) {
      hitMark.speedX *= -1;
      hitMark.speedX += randomOffset;
      if (Math.abs(hitMark.speedX) > 12) {
        hitMark.speedX = hitMark.speedX > 6 ? 12 : -12;
      }

    }
    if ((Math.abs(hitMark.speedX) < 7) && hitMark.speedX > 0) {
      hitMark.speedX = 7;
    } else if ((Math.abs(hitMark.speedX) < 7) && hitMark.speedX < 0) {
      hitMark.speedX = -7;
    } else if ((Math.abs(hitMark.speedX) > 13) && hitMark.speedX > 0) {
      hitMark.speedX = 13;
    } else if ((Math.abs(hitMark.speedX) > 13) && hitMark.speedX < 0) {
      hitMark.speedX = -13;
    }
    hitMark.newPos();
    shouldStopThrow();


    if ((Math.floor(30 - gameArea.frameNo / 50) <= 0) && !isEnd) {
      endGame();
    }
  } else{
    
    endScreen.update();
    endText.text = "Game Over! Final Score: " + score;
    endText.update();
  }
}

function startGame() {
  gameArea.stop();
  myBalls = [];
  score = 0;
  startFrame = 0;
  isEnd = false;
  hoop = new component(150, 150, "hoop.png", 265, 150, "image");
  guy = new component(50, 100, "idle.png", 0, 200, "image");
  hitBar = new component(400, 50, "hitbar.png", 0, 300, "image");
  hitMark = new component(10, 50, "white", 20, 300, "rect");
  scoreText = new component(20, 20, "white", 10, 20, "text");
  timeText = new component(20, 20, "white", 300, 20, "text");
  endScreen = new component(400, 350, "black", 0, 0, "rect");
  endText = new component(30, 75, "white", 20, 175, "text");

  hitMark.fillColor = "white";
  scoreText.fillColor = "white";
  timeText.fillColor = "white";
  endScreen.fillColor = "black";
  endText.fillColor = "white";
  hitMark.speedX = hitMarkSpeed;


  gameArea.start();
}

function throwBall() {
  if (!isEnd) {
    if (gameArea.frameNo > startFrame + 30) {
      myBalls.push(new component(30, 30, "ball.png", 7, 245, "spin"));
      if (hitMark.x >= 180 && hitMark.x <= 230) {
        myBalls[myBalls.length - 1].speedX = 3.5;
        score++;
      } else {
        myBalls[myBalls.length - 1].speedX = 2 + (hitMark.x / 50);
      }

      myBalls[myBalls.length - 1].speedY = -10;
      myBalls[myBalls.length - 1].gravity = 0.2;
      myBalls[myBalls.length - 1].angle = 25;
      startFrame = gameArea.frameNo;
      guy.image.src = "../img/basketballgame/throw.png";
    }
  }
}

function shouldStopThrow() {
  if (gameArea.frameNo > startFrame + 30) {
    guy.image.src = "../img/basketballgame/idle.png";
  }
}

function endGame() {
  if (score >= 25) {
    localStorage.setItem('themeUnlocked-pacers', true);
    switchTheme('pacers');
    alert("Congratulations! You won the game with a score of " + score + "!");
  }
  isEnd = true;
  }

function switchTheme(themeName) {
    const themeLink = document.getElementById('theme-style');
    const newThemePath = `themes/${themeName}.css`;
    if (themeLink.getAttribute('href') !== newThemePath) {
        themeLink.setAttribute('href', newThemePath);
    }
    localStorage.setItem('selectedTheme', themeName);
}



