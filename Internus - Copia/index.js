const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

// Tornar ctx global para acessar em Player.js
window.ctx = ctx;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight * 0.85;

// Sistema de câmera
const camera = {
  x: 0,
  y: 0,
  width: canvas.width,
  height: canvas.height
};

// Estado do jogo
let currentLevel = null;
let player = null;
let isLoadingLevel = false;  // Flag para evitar múltiplos carregamentos

// Estado global do jogo
let gameState = {
  isPaused: false,           // Se jogo está pausado (tela final)
  showingEndScreen: false    // Se mostrando tela de fim
};

// Sistema de aceleração de queda
window.gravityMultiplier = 1.0;  // Multiplicador de gravidade (1.0 = normal, 2.0 = acelerado)

// Verificar se é a última fase
function isLastPhase(levelNumber) {
  // Atualizar este número conforme adicionar mais fases
  return levelNumber === 2;
}

// Mostrar tela final
function showEndScreen() {
  gameState.isPaused = true;
  gameState.showingEndScreen = true;
  console.log('🏁 JOGO FINALIZADO!');
}

// Reiniciar o jogo
function restartGame() {
  gameState.isPaused = false;
  gameState.showingEndScreen = false;
  currentLevel = null;
  player = null;
  isLoadingLevel = false;
  loadLevel(1);
  console.log('🔄 Jogo reiniciado!');
}

// Carregar fase
async function loadLevel(levelNumber) {
  try {
    console.log(`Iniciando carregamento da fase ${levelNumber}...`);
    const response = await fetch(`fases/fase${levelNumber}.json`);
    if (!response.ok) throw new Error(`Fase ${levelNumber} não encontrada`);
    
    currentLevel = await response.json();
    console.log(`Fase ${levelNumber} carregada com sucesso:`, currentLevel);
    
    // Inicializar player na posição de spawn
    player = new Player();
    if (currentLevel.playerSpawn) {
      player.position.x = currentLevel.playerSpawn.x;
      player.position.y = currentLevel.playerSpawn.y;
    }
    
    // Resetar câmera
    camera.x = 0;
    camera.y = 0;
    
    console.log(`Player criado na posição:`, player.position);
    return true;
  } catch (error) {
    console.error('Erro ao carregar fase:', error);
    return false;
  }
}

// Callback para transição de fase
window.onPhaseTransition = async function(nextPhaseNumber) {
  if (isLoadingLevel) return;  // Evitar múltiplos carregamentos simultâneos
  
  // Verificar se é última fase antes de transicionar
  if (isLastPhase(currentLevel.id)) {
    console.log('🏁 Última fase detectada!');
    showEndScreen();
    return;
  }
  
  isLoadingLevel = true;
  console.log('Transicionando para fase:', nextPhaseNumber);
  await loadLevel(nextPhaseNumber);
  isLoadingLevel = false;
};

// Renderizar blocos do mapa
function drawBlocks() {
  if (!currentLevel || !currentLevel.blocos) return;
  
  for (let block of currentLevel.blocos) {
    const screenX = block.x - camera.x;
    const screenY = block.y - camera.y;
    
    // Desenhar apenas blocos visíveis (otimização)
    if (screenX + block.width > 0 && screenX < canvas.width &&
        screenY + block.height > 0 && screenY < canvas.height) {
      
      // Cores específicas por tipo
      if (block.tipo === 'bloco_transicao') {
        ctx.fillStyle = '#FFFFFF';  // Branco
      } else if (block.tipo === 'bloco_lava') {
        ctx.fillStyle = block.cor || '#FF4500';
      } else {
        ctx.fillStyle = block.cor || '#8B4513';
      }

      ctx.fillRect(screenX, screenY, block.width, block.height);
      
      // Desenhar borda para visualizar melhor
      ctx.strokeStyle = '#654321';
      ctx.lineWidth = 2;
      ctx.strokeRect(screenX, screenY, block.width, block.height);
    }
  }
}

// Atualizar câmera para seguir o player
function updateCamera() {
  if (!player) return;
  
  // Câmera centraliza o player na tela
  const targetCameraX = player.position.x - camera.width / 3;
  const targetCameraY = player.position.y - camera.height / 3;
  
  // Suavizar movimento da câmera (interpolação)
  camera.x += (targetCameraX - camera.x) * 0.1;
  camera.y += (targetCameraY - camera.y) * 0.1;
  
  // Limites horizontais da câmera
  if (currentLevel) {
    if (camera.x < 0) camera.x = 0;
    if (camera.x + camera.width > currentLevel.worldWidth) {
      camera.x = currentLevel.worldWidth - camera.width;
    }
  }
  
  // Câmera pode seguir livremente na vertical (sem limites superiores)
  if (camera.y < 0) camera.y = 0;
}

const keys = {
  left: false,
  right: false
};

function animate() {
  window.requestAnimationFrame(animate);
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Verificar se mostrando tela final
  if (gameState.showingEndScreen) {
    // Desenhar texto "O Fim" centralizado
    ctx.fillStyle = 'white';
    ctx.font = 'bold 80px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('O Fim', canvas.width / 2, canvas.height / 2);
    
    // Mensagem para reiniciar (menor)
    ctx.font = '20px Arial';
    ctx.fillText('Pressione qualquer tecla para reiniciar', canvas.width / 2, canvas.height / 2 + 80);
    
    return;  // Não renderizar resto do jogo
  }

  if (!player || !currentLevel) {
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.fillText('Carregando fase...', 10, 30);
    return;
  }

  const speed = 4;
  player.velocity.x = 0;
  
  // Bloquear controles se jogo pausado
  if (!gameState.isPaused) {
    if (keys.left)  player.velocity.x = -speed;
    if (keys.right) player.velocity.x =  speed;
  }

  // Atualizar player com blocos do mapa
  if (!gameState.isPaused) {
    player.update(currentLevel.blocos);
  }
  
  // Atualizar câmera
  updateCamera();
  
  // Renderizar blocos
  drawBlocks();
  
  // Renderizar player
  player.draw(camera);

  // Debug info
  ctx.fillStyle = 'white';
  ctx.font = '12px Arial';
  ctx.fillText(`Player: (${Math.round(player.position.x)}, ${Math.round(player.position.y)})`, 10, 20);
  ctx.fillText(`Camera: (${Math.round(camera.x)}, ${Math.round(camera.y)})`, 10, 35);
  ctx.fillText(`OnGround: ${player.isOnGround} | Pulos: ${player.jumpsRemaining}/${player.maxJumps}`, 10, 50);
  ctx.fillText(`Velocity: (${Math.round(player.velocity.x)}, ${Math.round(player.velocity.y)})`, 10, 65);
}

// Carregar fase 1 ao iniciar - AGUARDAR antes de começar animação
(async function initGame() {
  console.log('Iniciando jogo...');
  await loadLevel(1);
  console.log('Fase carregada, iniciando animação...');
  animate();
})();

function jump() {
  if (player && player.jump()) {
    // Pulo realizado com sucesso
  }
}

window.addEventListener('keydown', (event) => {
  // Se mostrando tela final, qualquer tecla reinicia
  if (gameState.showingEndScreen) {
    event.preventDefault();
    restartGame();
    return;
  }
  
  // Bloquear controles se jogo pausado
  if (gameState.isPaused) {
    return;
  }

  if (['ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
    event.preventDefault();
  }

  switch(event.key) {
    case 'ArrowUp':
      jump();
      break;
    case 'ArrowLeft':
      keys.left = true;
      break;
    case 'ArrowRight':
      keys.right = true;
      break;
    case '1':
      if (!isLoadingLevel) {
        isLoadingLevel = true;
        loadLevel(1).then(() => { isLoadingLevel = false; });
      }
      break;
    case '2':
      if (!isLoadingLevel) {
        isLoadingLevel = true;
        loadLevel(2).then(() => { isLoadingLevel = false; });
      }
      break;
  }
});

window.addEventListener('keyup', (event) => {
  switch(event.key) {
    case 'ArrowLeft':
      keys.left = false;
      break;
    case 'ArrowRight':
      keys.right = false;
      break;
  }
});

window.addEventListener('keydown', (event) => {
  if (event.key === ' ') {
    event.preventDefault();
    if (!gameState.isPaused) {
      window.gravityMultiplier = 2.0;  // Acelerar queda
    }
  }
});

window.addEventListener('keyup', (event) => {
  if (event.key === ' ') {
    event.preventDefault();
    window.gravityMultiplier = 1.0;  // Voltar ao normal
  }
});

const btnUp = document.getElementById('btn-up');
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');
const btnAttack = document.getElementById('btn-attack');

if (btnUp) {
  btnUp.addEventListener('click', (e) => { 
    if (gameState.isPaused) return;
    e.stopPropagation();
    e.preventDefault(); 
    jump(); 
  });
  btnUp.addEventListener('touchstart', (e) => { 
    if (gameState.isPaused) return;
    e.preventDefault();
    e.stopPropagation();
    jump(); 
  }, { passive: false });
}

if (btnLeft) {
  btnLeft.addEventListener('mousedown', () => { 
    if (gameState.isPaused) return;
    keys.left = true; 
  });
  btnLeft.addEventListener('mouseup', () => { 
    keys.left = false; 
  });
  btnLeft.addEventListener('touchstart', (e) => { 
    if (gameState.isPaused) return;
    e.preventDefault(); 
    keys.left = true; 
  }, { passive: false });
  btnLeft.addEventListener('touchend', () => { 
    keys.left = false; 
  });
}

if (btnRight) {
  btnRight.addEventListener('mousedown', () => { 
    if (gameState.isPaused) return;
    keys.right = true; 
  });
  btnRight.addEventListener('mouseup', () => { 
    keys.right = false; 
  });
  btnRight.addEventListener('touchstart', (e) => { 
    if (gameState.isPaused) return;
    e.preventDefault(); 
    keys.right = true; 
  }, { passive: false });
  btnRight.addEventListener('touchend', () => { 
    keys.right = false; 
  });
}

if (btnAttack) {
  btnAttack.addEventListener('mousedown', () => { 
    if (gameState.isPaused) return;
    window.gravityMultiplier = 2.0;  // Acelerar queda
  });
  btnAttack.addEventListener('mouseup', () => { 
    window.gravityMultiplier = 1.0;  // Voltar ao normal
  });
  btnAttack.addEventListener('touchstart', (e) => { 
    if (gameState.isPaused) return;
    e.preventDefault(); 
    window.gravityMultiplier = 2.0;  // Acelerar queda
  }, { passive: false });
  btnAttack.addEventListener('touchend', () => { 
    window.gravityMultiplier = 1.0;  // Voltar ao normal
  });
}

canvas.addEventListener('touchstart', (e) => { e.preventDefault(); }, { passive: false });
