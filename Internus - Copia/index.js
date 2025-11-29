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
let enemies = []; // Lista de inimigos
let isLoadingLevel = false;  // Flag para evitar múltiplos carregamentos

// Estado global do jogo
let gameState = {
  isPaused: false,           // Se jogo está pausado (tela final)
  showingEndScreen: false,   // Se mostrando tela de fim
  showingDeathScreen: false  // Se mostrando tela de morte
};

// Sistema de aceleração de queda
window.gravityMultiplier = 1.0;  // Multiplicador de gravidade (1.0 = normal, 2.0 = acelerado)

// Callback para morte do player
window.onPlayerDeath = function() {
  gameState.isPaused = true;
  gameState.showingDeathScreen = true;
  console.log('💀 Game Over!');
};

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
  gameState.showingDeathScreen = false;
  currentLevel = null;
  player = null;
  enemies = [];
  isLoadingLevel = false;
  window.gravityMultiplier = 1.0;
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
    
    // Inicializar inimigos da fase
    enemies = [];
    if (currentLevel.inimigos && currentLevel.inimigos.length > 0) {
      for (let enemyData of currentLevel.inimigos) {
        const enemy = new Enemy1(enemyData.x, enemyData.y);
        enemies.push(enemy);
        console.log(`👾 Inimigo criado em (${enemyData.x}, ${enemyData.y})`);
      }
    }
    
    // Resetar câmera
    camera.x = 0;
    camera.y = 0;
    
    // Resetar estado do jogo
    gameState.isPaused = false;
    gameState.showingEndScreen = false;
    gameState.showingDeathScreen = false;
    
    console.log(`Player criado na posição:`, player.position);
    console.log(`Total de inimigos: ${enemies.length}`);
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
  right: false,
  fastFall: false
};

function animate() {
  window.requestAnimationFrame(animate);
  
  // Fundo escuro de caverna
  ctx.fillStyle = '#1a0f0a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Verificar se mostrando tela final
  if (gameState.showingEndScreen) {
    ctx.fillStyle = 'white';
    ctx.font = 'bold 80px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('O Fim', canvas.width / 2, canvas.height / 2);
    
    ctx.font = '20px Arial';
    ctx.fillText('Pressione qualquer tecla para reiniciar', canvas.width / 2, canvas.height / 2 + 80);
    
    return;
  }
  
  // Verificar se mostrando tela de morte
  if (gameState.showingDeathScreen) {
    ctx.fillStyle = '#FF0000';
    ctx.font = 'bold 80px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2);
    
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.fillText('Pressione qualquer tecla para reiniciar', canvas.width / 2, canvas.height / 2 + 80);
    
    return;
  }

  if (!player || !currentLevel) {
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Carregando fase...', 10, 30);
    return;
  }

  const speed = 4;
  
  // Bloquear controles se jogo pausado
  if (!gameState.isPaused) {
    if (keys.left) {
      player.velocity.x = -speed;
    } else if (keys.right) {
      player.velocity.x = speed;
    } else {
      player.velocity.x = 0;
    }
  }

  // Atualizar player com blocos do mapa e inimigos
  if (!gameState.isPaused) {
    player.update(currentLevel.blocos, enemies);
    
    // Atualizar todos os inimigos
    for (let enemy of enemies) {
      if (!enemy.isDead) {
        enemy.update(currentLevel.blocos, player);
      }
    }
    
    // Remover inimigos mortos da lista (opcional, para performance)
    enemies = enemies.filter(enemy => !enemy.isDead);
  }
  
  // Atualizar câmera
  updateCamera();
  
  // Renderizar blocos
  drawBlocks();
  
  // Renderizar inimigos
  for (let enemy of enemies) {
    if (!enemy.isDead) {
      enemy.draw(camera);
    }
  }
  
  // Renderizar player
  player.draw(camera);

  // HUD - Informações do jogo
  ctx.textAlign = 'left';
  ctx.font = 'bold 24px Arial';
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  
  // Vida do player
  const healthText = `❤️ ${player.health}/${player.maxHealth}`;
  ctx.strokeText(healthText, 15, 35);
  ctx.fillText(healthText, 15, 35);
  
  // Contador de inimigos
  const enemyText = `👾 ${enemies.length}`;
  ctx.strokeText(enemyText, 15, 70);
  ctx.fillText(enemyText, 15, 70);
  
  // Nome da fase
  ctx.font = 'bold 18px Arial';
  ctx.strokeText(currentLevel.nome || 'Fase', 15, 100);
  ctx.fillText(currentLevel.nome || 'Fase', 15, 100);

  // Debug info (canto inferior esquerdo)
  if (false) { // Mudar para true para ativar debug
    ctx.font = '12px Arial';
    ctx.fillStyle = 'yellow';
    const debugY = canvas.height - 100;
    ctx.fillText(`Pos: (${Math.round(player.position.x)}, ${Math.round(player.position.y)})`, 10, debugY);
    ctx.fillText(`Vel: (${Math.round(player.velocity.x)}, ${Math.round(player.velocity.y)})`, 10, debugY + 15);
    ctx.fillText(`OnGround: ${player.isOnGround} | Pulos: ${player.jumpsRemaining}/${player.maxJumps}`, 10, debugY + 30);
    ctx.fillText(`Camera: (${Math.round(camera.x)}, ${Math.round(camera.y)})`, 10, debugY + 45);
    ctx.fillText(`Invuln: ${player.invulnerabilityTimer}`, 10, debugY + 60);
  }
}

// Carregar fase 1 ao iniciar
(async function initGame() {
  console.log('🎮 Iniciando jogo...');
  await loadLevel(1);
  console.log('✅ Fase carregada, iniciando animação...');
  animate();
})();

// Função de pulo
function jump() {
  if (player && !gameState.isPaused && player.jump()) {
    console.log('🦘 Pulo realizado!');
  }
}

// Controles de teclado
window.addEventListener('keydown', (event) => {
  // Se mostrando tela final ou de morte, qualquer tecla reinicia
  if (gameState.showingEndScreen || gameState.showingDeathScreen) {
    event.preventDefault();
    restartGame();
    return;
  }
  
  // Bloquear controles se jogo pausado
  if (gameState.isPaused) return;

  // Prevenir comportamento padrão de setas e espaço
  if (['ArrowUp', 'ArrowLeft', 'ArrowRight', ' ', 'ArrowDown'].includes(event.key)) {
    event.preventDefault();
  }

  switch(event.key) {
    case 'ArrowUp':
    case 'w':
    case 'W':
      jump();
      break;
    case 'ArrowLeft':
    case 'a':
    case 'A':
      keys.left = true;
      break;
    case 'ArrowRight':
    case 'd':
    case 'D':
      keys.right = true;
      break;
    case ' ':
    case 'ArrowDown':
    case 's':
    case 'S':
      window.gravityMultiplier = 2.0;
      keys.fastFall = true;
      console.log('⬇️ Queda rápida ativada!');
      break;
    // Trocar de fase para debug (teclas 1 e 2)
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
    case 'a':
    case 'A':
      keys.left = false;
      break;
    case 'ArrowRight':
    case 'd':
    case 'D':
      keys.right = false;
      break;
    case ' ':
    case 'ArrowDown':
    case 's':
    case 'S':
      window.gravityMultiplier = 1.0;
      keys.fastFall = false;
      break;
  }
});

// Controles touch/mobile
const btnUp = document.getElementById('btn-up');
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');
const btnFastFall = document.getElementById('btn-attack'); // Renomeado conceitualmente

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
  btnLeft.addEventListener('mouseleave', () => { 
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
  btnRight.addEventListener('mouseleave', () => { 
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

// Botão de queda rápida
if (btnFastFall) {
  btnFastFall.addEventListener('mousedown', () => { 
    if (gameState.isPaused) return;
    window.gravityMultiplier = 2.0;
    keys.fastFall = true;
  });
  btnFastFall.addEventListener('mouseup', () => { 
    window.gravityMultiplier = 1.0;
    keys.fastFall = false;
  });
  btnFastFall.addEventListener('mouseleave', () => { 
    window.gravityMultiplier = 1.0;
    keys.fastFall = false;
  });
  btnFastFall.addEventListener('touchstart', (e) => { 
    if (gameState.isPaused) return;
    e.preventDefault(); 
    window.gravityMultiplier = 2.0;
    keys.fastFall = true;
  }, { passive: false });
  btnFastFall.addEventListener('touchend', () => { 
    window.gravityMultiplier = 1.0;
    keys.fastFall = false;
  });
}

// Prevenir scroll no mobile
canvas.addEventListener('touchstart', (e) => { 
  e.preventDefault(); 
}, { passive: false });

// Atualizar tamanho do canvas ao redimensionar janela
window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight * 0.85;
  camera.width = canvas.width;
  camera.height = canvas.height;
});
