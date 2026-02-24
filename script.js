const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const title = document.getElementById('title');
const scoreText = document.getElementById('score-text');
const timerText = document.getElementById('timer-text');
const gameUI = document.getElementById('game-ui');
const info = document.getElementById('info');
const staminaBar = document.getElementById('stamina-bar');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Aset Audio & Visual
const imgMusuh = new Image(); imgMusuh.src = 'musuh.jpeg';
const imgFollow = new Image(); imgFollow.src = 'follow.png';

const sfxLangkah = new Audio('langkahkaki.mp3'); sfxLangkah.loop = true;
const sfxLock = new Audio('lock.mp3'); sfxLock.playbackRate = 5.0;
const sfxCountdown = new Audio('countdown.mp3');

// State Global
let gameState = "START";
let p = { x: 0, y: 0, light: true, opacity: 0, stamina: 100 };
let mouse = { x: canvas.width/2, y: canvas.height/2 };
let keys = {};

let score = 0;
let lightTimer = 30;
let lastTime = 0;
let countdownPlayed = false;

// Entitas
let enemies = [];
let followObj = { x: 0, y: 0, size: 20 };

window.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
window.addEventListener('keydown', (e) => {
    let key = e.key.toLowerCase();
    keys[key] = true;
    if (key === 'g' && gameState === "PLAY") toggleLight();
});
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

function toggleLight() {
    p.light = !p.light;
    sfxLock.currentTime = 0;
    sfxLock.play().catch(()=>{});
    if (!p.light) {
        sfxCountdown.pause();
        countdownPlayed = false;
    }
}

function spawnFollow() {
    let angle = Math.random() * Math.PI * 2;
    let dist = 500 + Math.random() * 600;
    followObj.x = p.x + Math.cos(angle) * dist;
    followObj.y = p.y + Math.sin(angle) * dist;
}

function spawnEnemy() {
    let angle = Math.random() * Math.PI * 2;
    let dist = 800 + Math.random() * 400;
    enemies.push({ 
        x: p.x + Math.cos(angle) * dist, 
        y: p.y + Math.sin(angle) * dist, 
        speed: 1.5 + Math.random() * 1.5
    });
}

function startGame() {
    overlay.style.display = 'none';
    gameUI.style.display = 'flex';
    info.style.display = 'block';
    
    gameState = "PLAY";
    p.light = true; p.opacity = 1; p.stamina = 100; p.x = 0; p.y = 0;
    score = 0; lightTimer = 30; countdownPlayed = false;
    enemies = [];
    
    scoreText.innerText = score;
    spawnFollow();
    
    // PERUBAHAN: Mengurangi jumlah musuh awal menjadi 20
    for(let i=0; i<20; i++) spawnEnemy();
    
    sfxLock.play().catch(()=>{});
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function gameOver() {
    gameState = "OVER";
    sfxLangkah.pause();
    sfxCountdown.pause();
    
    overlay.style.display = 'flex';
    gameUI.style.display = 'none';
    info.style.display = 'none';
    
    title.innerText = "KAU TERTANGKAP";
    document.querySelector('#overlay p').innerHTML = `Kamu mengumpulkan <span class="blood-text">${score} Follow</span>.<br>Tapi mereka terlalu banyak...`;
    document.querySelector('button').innerText = "COBA LAGI";
}

function gameLoop(timestamp) {
    if (gameState !== "PLAY") return;
    let deltaTime = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    updateLogic(deltaTime);
    drawGraphics();
    requestAnimationFrame(gameLoop);
}

function updateLogic(dt) {
    let isMoving = false;
    let speed = 4;
    let isSprinting = keys['shift'] && p.stamina > 0;

    if (isSprinting && (keys['w'] || keys['s'] || keys['a'] || keys['d'] || keys['arrowup'] || keys['arrowdown'] || keys['arrowleft'] || keys['arrowright'])) {
        speed = 8;
        p.stamina -= 25 * dt;
    } else {
        p.stamina += 15 * dt;
    }
    if (p.stamina < 0) p.stamina = 0;
    if (p.stamina > 100) p.stamina = 100;
    staminaBar.style.width = p.stamina + '%';
    staminaBar.style.background = p.stamina > 20 ? '#00ffcc' : '#ff3333';

    if (keys['w'] || keys['arrowup']) { p.y -= speed; isMoving = true; }
    if (keys['s'] || keys['arrowdown']) { p.y += speed; isMoving = true; }
    if (keys['a'] || keys['arrowleft']) { p.x -= speed; isMoving = true; }
    if (keys['d'] || keys['arrowright']) { p.x += speed; isMoving = true; }

    if (isMoving) {
        sfxLangkah.playbackRate = isSprinting ? 2.0 : 1.0;
        if (sfxLangkah.paused) sfxLangkah.play().catch(()=>{});
    } else {
        sfxLangkah.pause();
    }

    let targetOpacity = p.light ? 1 : 0;
    p.opacity += (targetOpacity - p.opacity) * 0.1;

    if (p.light) {
        lightTimer -= dt;
        timerText.innerText = Math.ceil(lightTimer);

        if (lightTimer <= 5.5 && lightTimer > 0 && !countdownPlayed) {
            sfxCountdown.currentTime = 0;
            sfxCountdown.play().catch(()=>{});
            countdownPlayed = true;
        }

        if (lightTimer <= 0) {
            p.light = false;
            sfxLock.play().catch(()=>{});
            lightTimer = 30; 
            countdownPlayed = false;
        }
    }

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    let angleToMouse = Math.atan2(mouse.y - centerY, mouse.x - centerX);

    // Update Musuh
    for (let i = 0; i < enemies.length; i++) {
        let e = enemies[i];
        let dx = e.x - p.x;
        let dy = e.y - p.y;
        let dist = Math.sqrt(dx*dx + dy*dy);
        
        let angleToEnemy = Math.atan2(dy, dx);
        let angleDiff = Math.abs(angleToEnemy - angleToMouse);
        if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
        
        let isIlluminated = (p.opacity > 0.5) && (dist < 750) && (angleDiff < 0.65);

        // PERUBAHAN: Mengubah operator += menjadi -= agar musuh bergerak mendekati pemain (bukan menjauh)
        if (!isIlluminated && dist > 0) {
            e.x -= (dx / dist) * e.speed;
            e.y -= (dy / dist) * e.speed;
        }

        if (dist < 30 && !isIlluminated) {
            gameOver();
        }
    }

    let fdx = followObj.x - p.x;
    let fdy = followObj.y - p.y;
    if (Math.sqrt(fdx*fdx + fdy*fdy) < 30) {
        score++;
        scoreText.innerText = score;
        spawnFollow();
        spawnEnemy(); 
    }
}

function drawGraphics() {
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    ctx.save();
    let angleToMouse = Math.atan2(mouse.y - centerY, mouse.x - centerX);
    
    if (p.opacity > 0.05) {
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, 800, angleToMouse - 0.65, angleToMouse + 0.65);
        ctx.lineTo(centerX, centerY);
        ctx.clip(); 

        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 2;
        let offX = -p.x % 100; let offY = -p.y % 100;
        for (let x = offX; x < canvas.width; x += 100) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
        }
        for (let y = offY; y < canvas.height; y += 100) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
        }

        const grad = ctx.createRadialGradient(centerX, centerY, 50, centerX, centerY, 750);
        grad.addColorStop(0, `rgba(255, 255, 240, ${0.4 * p.opacity})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.restore();

    let fdx = followObj.x - p.x;
    let fdy = followObj.y - p.y;
    let angleToFollow = Math.atan2(fdy, fdx);
    
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angleToFollow);
    ctx.fillStyle = "rgba(255, 200, 0, 0.6)";
    ctx.beginPath();
    ctx.moveTo(40, 0); 
    ctx.lineTo(25, -7);
    ctx.lineTo(25, 7);
    ctx.fill();
    ctx.restore();

    let drawFollowX = centerX + (followObj.x - p.x);
    let drawFollowY = centerY + (followObj.y - p.y);
    if (imgFollow.complete && imgFollow.naturalWidth !== 0) {
        ctx.drawImage(imgFollow, drawFollowX - 15, drawFollowY - 15, 30, 30);
    } else {
        ctx.fillStyle = "cyan"; ctx.fillRect(drawFollowX - 10, drawFollowY - 10, 20, 20);
    }

    for (let i = 0; i < enemies.length; i++) {
        let e = enemies[i];
        let drawEnemyX = centerX + (e.x - p.x);
        let drawEnemyY = centerY + (e.y - p.y);
        
        if (imgMusuh.complete && imgMusuh.naturalWidth !== 0) {
            ctx.drawImage(imgMusuh, drawEnemyX - 25, drawEnemyY - 25, 50, 50);
        } else {
            ctx.fillStyle = "red"; ctx.fillRect(drawEnemyX - 20, drawEnemyY - 20, 40, 40);
        }
    }

    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(centerX, centerY, 8, 0, Math.PI*2); ctx.fill();
    
    const overlayGrad = ctx.createRadialGradient(centerX, centerY, 100, centerX, centerY, Math.max(canvas.width, canvas.height));
    overlayGrad.addColorStop(0, 'rgba(0,0,0,0)');
    overlayGrad.addColorStop(1, p.opacity < 0.2 ? 'rgba(0,0,0,1)' : 'rgba(0,0,0,0.85)');
    ctx.fillStyle = overlayGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}
