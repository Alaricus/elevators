const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let images = {};
let gameActive = false;
let before = Date.now();
let delta = null;
const player = new Player();
const elevators = [
  new Elevator(100.0, 2.0, ctx.canvas.height/1.5, 'down'),
  new Elevator(275.0, 3.5, ctx.canvas.height/2, 'up'),
  new Elevator(450.0, 5.5, ctx.canvas.height/6, 'up'),
  new Elevator(625.0, 7.5, ctx.canvas.height/3, 'down'),
];
const floors = [
  new Floor(0.0, 550.0, 85.0, 64.0),
  new Floor(738.0, 100.0, 74.0, 32.0),
];
const sprites = [
  new Sprite(0, 0, 66, 50, 2, 22),
  new Sprite(0, 50, 66, 50, 2, 22),
  new Sprite(0, 100, 99, 92, 3, 8),
  new Sprite(0, 192, 99, 92, 3, 8),
];

window.onload = () => {
  const imgNames = ['car', 'background', 'sprite', 'spikes', 'spikes2'];
  loadImages(imgNames, () => {
    gameActive = true;
    main();
  });
};

const centerText = (txt) => (ctx.canvas.width - ctx.measureText(txt).width) / 2;
const loadImages = (names, callback) => {
  names.forEach((name, index) => {
    images[name] = new Image();
    images[name].onload = () => index + 1 === names.length && callback();
    images[name].src = `${name}.png`;
  });
};

const main = () => {
  window.onfocus = () => {
    gameActive = true;
    before = Date.now();
  };

  window.onblur = () => {
    gameActive = false;
  };

  if (gameActive) {
    const now = Date.now();
    delta = now - before;
    update(delta/1000);
    draw();
    before = now;
  };

  requestAnimationFrame(main);
};

const draw = () => {
  ctx.drawImage(images.background, 0, 0);
  elevators.forEach(evevator => evevator.draw());

  // Should eventually create an assets or doodads object for this
  // Also, 'repeat-x' doesn't work and tileing starts at 0.0 not at rectangle
  ctx.fillStyle = ctx.createPattern(images.spikes, 'repeat');
  ctx.fillRect(0, 578, ctx.canvas.width, 34);
  ctx.fillStyle = ctx.createPattern(images.spikes2, 'repeat');
  ctx.fillRect(0, 0, ctx.canvas.width, 34);

  player.draw();
};

const update = (delta) => {
  player.update(delta);
  elevators.forEach(evevator => evevator.update());
  sprites.forEach(sprite => sprite.update());
};

function Player() {
  this.x = 25.0;
  this.y = 350.0;
  this.oldY = 0.0;
  this.width = 33.0;
  this.height = 50.0;
  this.speed = 200.0;
  this.velX = 0.0;
  this.velY = 0.0;
  this.gravity = 17.0;
  this.friction = 0.95;
  this.money = 10000000.0;
  this.moneySpent = 0.0;
  this.input = {a: false, d: false, w: false, space: false};
  this.facing = 'right';
  this.isInShaft = null;
  this.isJumping = false;
  this.jumpTime = null;
  this.aboveCar = null;
  this.belowCar = null;
  this.collidedWithTop = null;
  this.collidedWithBottom = null;
  this.isDead = false;
  this.won = false;

  this.applyInput = () => {
    this.oldY = this.y;
    if (this.input.a) {
      this.velX = -this.speed;
      this.facing = 'left';
      this.money -= 10000.0;
      this.moneySpent += 10000.0;
    };

    if (this.input.d) {
      this.velX = this.speed;
      this.facing = 'right';
      this.money -= 10000.0;
      this.moneySpent += 10000.0;
    };

    if (!this.input.a && !this.input.d) {
      this.velX *= this.friction;
    };

    if (this.input.w && !this.isJumping && this.jumpTime <= Date.now() - 500) {
      this.isJumping = true;
      this.jumpTime = Date.now();
      this.velY = -this.speed * 2.5;
      this.money -= 50000.0;
      this.moneySpent += 50000.0;
    };

    if (this.input.space && this.isDead) {
      this.isDead = false;
      this.money -= 500000.0;
      this.moneySpent += 500000.0;
      if (this.money <= 0) {
        this.money = 5000.0;
      };
      this.moneySpent = 0.0;
    };

    if (this.input.space && this.money <= 0 && !this.isDead) {
      this.money = 1000000;
    };

    if (this.input.space && this.won) {
      this.won = false;
      this.moneySpent = 0.0;
    };
  };

  this.calculatePositions = (delta) => {
    this.velY += this.gravity;
    handleCarCollisions(this);
    this.x += this.velX * delta;
    this.y += this.velY * delta;
    handleWallCollisions(this);
    checkVictory(this);
    if (this.y === this.oldY) {
      this.isJumping = false;
      this.velY = 0.0;
    };
  };

  this.update = (delta) => {
    if (this.isDead || this.money <= 0 || this.won) {
      this.x = 25.0;
      this.y = 350.0;
      this.oldY = 0.0;
      this.velX = 0.0;
      this.velY = 0.0;
      this.input.a = false;
      this.input.d = false;
      this.input.w = false;
      this.isJumping = false;
      this.isInShaft = null;
      this.jumpTime = null;
      this.aboveCar = null;
      this.belowCar = null;
      this.collidedWithTop = null;
      this.collidedWithBottom = null;
      this.applyInput();
    } else {
      this.applyInput();
      this.calculatePositions(delta);
      this.money -= this.velX;
      this.money -= this.velY;
      this.moneySpent += this.velX;
      this.moneySpent += this.velY;
    };
  };

  this.draw = () => {
    if (this.isDead) {
      ctx.fillStyle = 'rgba(225, 0, 0, 0.65)';
      ctx.alpha;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.font = '30px "Verdana"';
      ctx.fillStyle = 'white';
      ctx.shadowColor = 'black';
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.shadowBlur = 7;
      ctx.fillText('You died. It\'s the haters\' fault. Naturally.', centerText('You died. It\'s the haters\' fault. Naturally.'), 150);
      ctx.fillText('But you have a CONTRACT!', centerText('But you have a CONTRACT!'), 300);
      ctx.font = '20px "Verdana"';
      ctx.fillText('At least you claimed to.', centerText('At least you claimed to.'), 350);
      ctx.font = '30px "Verdana"';
      ctx.fillText('Press the spacebar and try again.', centerText('Press the spacebar and try again.'), 450);
    } else if (this.money <= 0) {
      ctx.fillStyle = 'rgba(249, 231, 6, 0.65)';
      ctx.alpha;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.font = '40px "Verdana"';
      ctx.fillStyle = 'white';
      ctx.shadowColor = 'black';
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.shadowBlur = 7;
      ctx.fillText('What, you ran out of dough?', centerText('What, you ran out of dough?'), 150);
      ctx.font = '30px "Verdana"';
      ctx.fillText('Meh, you\'ll get more. A sucker\'s born every minute.', centerText('Meh, you\'ll get more. A sucker\'s born every minute.'), 300);
      ctx.font = '20px "Verdana"';
      ctx.fillText('Tell them a cool story about a new contract.', centerText('Tell them a cool story about a new contract.'), 350);
      ctx.font = '30px "Verdana"';
      ctx.fillText('Press the spacebar and try again.', centerText('Press the spacebar and try again.'), 450);
      ctx.font = '20px "Verdana"';
      ctx.fillText('(They just sent you another millon!)', centerText('(They just sent you another millon!)'), 500);
    } else if (this.won) {
      ctx.fillStyle = 'rgba(0, 153, 51, 0.65)';
      ctx.alpha;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.font = '40px "Verdana"';
      ctx.fillStyle = 'white';
      ctx.shadowColor = 'black';
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.shadowBlur = 7;
      ctx.fillText('Yes! You did it! You arrived!', centerText('Yes! You did it! You arrived!'), 150);
      ctx.font = '30px "Verdana"';
      ctx.fillText('What do you mean they didn\'t want to talk to you?', centerText('What do you mean they didn\'t want to talk to you?'), 300);
      ctx.font = '20px "Verdana"';
      ctx.fillText('Don\'t they know about your contract with them?', centerText('Don\'t they know about your contract with them?'), 350);
      ctx.font = '30px "Verdana"';
      ctx.fillText('Press the spacebar and try again.', centerText('Press the spacebar and try again.'), 450);
      ctx.font = '20px "Verdana"';
      ctx.fillText('Perhaps you haven\'t spammed them enough?', centerText('Perhaps you haven\'t spammed them enough?'), 500);
    } else {
      ctx.shadowColor = 'rgba(0, 0, 0, 0)'; // this is a hack, I dont like it
      ctx.shadowBlur = 0;
      ctx.font = '15px "Verdana"';
      ctx.fillStyle = 'yellow';
      ctx.fillText('OTHER PEOPLE\'S MONEY: $' + Math.round(this.money * 100) / 100, 290, 13);
      switch (this.facing) {
        case 'right':
          if (this.isJumping) {
            sprites[2].image = images.sprite;
            sprites[2].destinationX = this.x;
            sprites[2].destinationY = this.y;
            sprites[2].draw();
          } else {
            sprites[0].image = images.sprite;
            sprites[0].destinationX = this.x;
            sprites[0].destinationY = this.y;
            sprites[0].draw();
          }
          break;
        case 'left':
          if (this.isJumping) {
            sprites[3].image = images.sprite;
            sprites[3].destinationX = this.x;
            sprites[3].destinationY = this.y;
            sprites[3].draw();
          } else {
            sprites[1].image = images.sprite;
            sprites[1].destinationX = this.x;
            sprites[1].destinationY = this.y;
            sprites[1].draw();
          }
          break;
      };
    };
  };
};

function Elevator(sx, cs, cy, dir) {
  this.shaftX = sx;
  this.shaftY = 0.0;
  this.shaftHeight = ctx.canvas.height;
  this.shaftWidth = 100.0;
  this.carX = this.shaftX - 1.0;
  this.carY = cy;
  this.carOldY = 0.0;
  this.carDelta = 0.0;
  this.carHeight = 100.0;
  this.carWidth = this.shaftWidth + 2.0;
  this.carSpeed = cs;
  this.direction = dir;

  this.update = () => {
    this.carOldY = this.carY;
    if (this.direction === 'down') {
      if (this.carY >= this.shaftHeight - this.carHeight / 2.0) {
        this.direction = 'up';
      };
      this.carY += this.carSpeed;
    };

    if (this.direction === 'up') {
      if (this.carY <= this.shaftY - this.carHeight / 2.0) {
        this.direction = 'down';
      };
      this.carY -= this.carSpeed;
    };

    this.carDelta = this.carY - this.carOldY;
  };

  this.draw = () => {
    ctx.strokeStyle = 'black';
    ctx.strokeRect(this.shaftX+20.0,this.shaftY-5.0,this.shaftWidth-40.0,this.shaftHeight+10.0);
    ctx.drawImage(images.car,this.carX-14.0,this.carY-21.0);
  }
};

function Floor(fx, fy, fw, fh) {
  this.x = fx;
  this.y = fy;
  this.width = fw;
  this.height = fh;

  this.draw = () => {
    ctx.fillStyle = 'green';
    ctx.fillRect(this.x,this.y,this.width,this.height);
  };
}

function Sprite(x, y, w, h, frames, tpf) {
  this.image = null;
  this.x = x;
  this.y = y;
  this.width = w;
  this.height = h;
  this.destinationX = 0;
  this.destinationY = 0;
  this.index = 0;
  this.frames = frames;
  this.ticks = 0;
  this.ticksPerFrame = tpf || 0;

  this.update = () => {
    this.ticks++;
    if (this.ticks > this.ticksPerFrame) {
      this.ticks = 0;
      if (this.index < this.frames - 1) {
        this.index++;
      } else {
          this.index = 0;
      }
    }
  };

  this.draw = () => {
    ctx.drawImage(this.image, this.index * this.width / frames, this.y, this.width / this.frames, this.height, this.destinationX, this.destinationY, this.width / frames, this.height);
  };
};

document.addEventListener('keydown', e => onkey(e, e.keyCode, true));
document.addEventListener('keyup', e =>  onkey(e, e.keyCode, false));

const onkey = (e, key, pressed) => {
  switch(key) {
    case 65: player.input.a = pressed; e.preventDefault(); break;
    case 68: player.input.d = pressed; e.preventDefault(); break;
    case 87: player.input.w = pressed; e.preventDefault(); break;
    case 32: player.input.space = pressed; e.preventDefault(); break;
  };
};

const handleWallCollisions = (p) => {
  if (p.y <= 0.0) {
    p.isDead = true;
  };

  if (p.y >= ctx.canvas.height - p.height) {
    p.isDead = true;
  };

  if (p.x <= 0.0) {
    p.x = 0.0;
  };

  if (p.x >= ctx.canvas.width - p.width) {
    p.x = ctx.canvas.width - p.width;
  };

  for (let i = 0; i < floors.length; ++i) { // checks collisions with floor objects on all sides
    if (p.x >= floors[i].x && p.x + p.width <= floors[i].x + floors[i].width) { // check if aligned w/ floor horizontally
      if (p.y + p.height >= floors[i].y && p.y < floors[i].y) { // touching or entering floor object from the above
        p.y = floors[i].y - p.height; // stop the player at the top
      };

      if (p.y <= floors[i].y + floors[i].height && p.y + p.height > floors[i].y + floors[i].height) { // ditto for bottom
        p.y = floors[i].y + floors[i].height + 1.0;
      };
    } else if (!(floors[i].y > p.y + p.height || floors[i].y + floors[i].height < p.y)) { // check if alligned with the sides vertically
      if (p.x + p.width >= floors[i].x && p.x < floors[i].x) { // touching or entering floor object from the right
        p.x = floors[i].x - p.width - 1.0; // stop the player at the right wall
      };

      if (p.x <= floors[i].x + floors[i].width && p.x + p.width > floors[i].x + floors[i].width) { // ditto for left
        p.x = floors[i].x + floors[i].width + 1.0;
      };
    };
  };
};

const handleCarCollisions = (p) => {
  for (let i = 0; i < elevators.length; ++i) {
    if (p.x + p.width > elevators[i].shaftX && p.x < elevators[i].shaftX + elevators[i].shaftWidth) { // check if player is within an elevator shaft
      p.isInShaft = i;
      if (p.y + p.height < elevators[i].carY) { // check if player is above a car
        p.aboveCar = i;
        p.belowCar = null;
      };

      if (p.y + p.height >= elevators[i].carY) { // check if player collided with the top of the car
        p.collidedWithTop = i;
        p.collidedWithBottom = null;
      };

      if (p.isInShaft === i && p.aboveCar === i && p.collidedWithTop === i) { // if these 3 are true (falling on top of the car) player dies
        p.isDead = true;
      };

      if (p.y > elevators[i].carY + elevators[i].carHeight) { // check if player is below a car
        p.belowCar = i;
        p.aboveCar = null;
      };

      if (p.y <= elevators[i].carY + elevators[i].carHeight) { // check if player collided with the bottom of the car
        p.collidedWithBottom = i;
        p.collidedWithTop = null;
      };

      if (p.isInShaft === i && p.belowCar === i && p.collidedWithBottom === i) { // if these 3 are true (hitting the bottom from below) player dies
        p.isDead = true;
      };

      if (p.aboveCar !== i && p.belowCar !== i) { // when neither above or below a car (but in the shaft) player is in the car
        if (p.y <= elevators[i].carY + 3.0) { // check if player's top is touching the car ceiling
          p.velY = p.gravity; // and make him fall to the floor
          if (elevators[i].direction === 'down') { // if the car is moving down
            p.velY += elevators[i].carDelta * 100; // make him fall to the floor faster to make up for car speed
          };
        } else if (p.y + p.height >= elevators[i].carY + elevators[i].carHeight) { // check if player bottom is touching the car floor
          if (p.velY >= elevators[i].carDelta) { // check if player's upwards velocity is higher than the car's
            p.velY = elevators[i].carDelta - p.gravity; // make him move at the speed of the car
            p.y = elevators[i].carY + elevators[i].carHeight - p.height; // and keep him on the floor
          };
          if (elevators[i].direction === 'down') {
            p.velY += elevators[i].carDelta * 100;
          };
          p.isJumping = false;
        } else {
          if (p.velY < 0) {
            p.isJumping = true;
          };
        };
      };
    } else {
      p.isInShaft = null;
    };
  };
};

const checkVictory = (p) => {
  if (p.y + p.height <= 100.0 && p.y > 0.0 && p.x + p.width > 780.0) { // checks if within the victory zone
    p.won = true;
  };
};
