class Player{
    constructor() {
        this.position = { x: 200, y: 200 };
        this.velocity = { x: 0, y: 0 };
        
        this.width = 80;
        this.height = 120;
        this.sides = { bottom: this.position.y + this.height, left: this.position.x, right: this.position.x + this.width, top: this.position.y };
        
        this.gravity = 1;
        this.isOnGround = false;
        
        // Sistema de double jump
        this.jumpsRemaining = 2;
        this.maxJumps = 5;
        
        // Sistema de sprites
        this.sprites = {
            idle: null,
            runLeft: null,
            runRight: null
        };
        this.currentState = 'idle';
        this.targetState = 'idle';
        this.stateTransitionAlpha = 1;
        this.stateTransitionSpeed = 0.15;
        
        // Carregar sprites ao inicializar
        this.loadSprites();
    }
    
    // Carregar sprites de forma assíncrona
    loadSprites() {
        const spriteNames = ['idle', 'runLeft', 'runRight'];
        
        spriteNames.forEach(spriteName => {
            const img = new Image();
            img.onload = () => {
                console.log(`✓ Sprite carregado: ${spriteName}.png`);
            };
            img.onerror = () => {
                console.error(`✗ Erro ao carregar sprite: ${spriteName}.png`);
            };
            img.src = `Sprites/${spriteName}.png`;
            this.sprites[spriteName] = img;
        });
    }
    
    // Detectar e atualizar estado baseado na velocidade
    updateState() {
        if (Math.abs(this.velocity.x) < 0.5) {
            this.targetState = 'idle';
        } else if (this.velocity.x < 0) {
            this.targetState = 'runLeft';
        } else if (this.velocity.x > 0) {
            this.targetState = 'runRight';
        }
        
        // Transição suave entre estados
        if (this.currentState !== this.targetState) {
            this.stateTransitionAlpha -= this.stateTransitionSpeed;
            
            if (this.stateTransitionAlpha <= 0) {
                this.currentState = this.targetState;
                this.stateTransitionAlpha = 1;
            }
        } else {
            // Se não há transição, manter alpha no máximo
            this.stateTransitionAlpha = 1;
        }
    }
    jump() {
        // Se tocou o chão, reseta o contador de pulos
        if (this.isOnGround) {
            this.jumpsRemaining = this.maxJumps;
        }
        
        // Só pula se tiver pulos disponíveis
        if (this.jumpsRemaining > 0) {
            this.velocity.y = -20;
            this.jumpsRemaining--;
            return true;
        }
        return false;
    }

    draw(camera) {
        const screenX = this.position.x - camera.x;
        const screenY = this.position.y - camera.y;
        
        // Salvar estado anterior do canvas
        const previousAlpha = window.ctx.globalAlpha;
        
        // Renderizar sprite atual com alpha correto
        const currentSprite = this.sprites[this.currentState];
        if (currentSprite && currentSprite.complete) {
            window.ctx.globalAlpha = 1;
            window.ctx.drawImage(currentSprite, screenX, screenY, this.width, this.height);
        } else if (this.currentState === this.targetState) {
            // Fallback: desenhar retângulo verde enquanto sprite carrega (se não em transição)
            window.ctx.globalAlpha = 1;
            window.ctx.fillStyle = 'green';
            window.ctx.fillRect(screenX, screenY, this.width, this.height);
        }
        
        // Se em transição, também renderizar sprite alvo com fade in
        if (this.currentState !== this.targetState && this.stateTransitionAlpha < 1) {
            const targetSprite = this.sprites[this.targetState];
            if (targetSprite && targetSprite.complete) {
                window.ctx.globalAlpha = 1 - this.stateTransitionAlpha;
                window.ctx.drawImage(targetSprite, screenX, screenY, this.width, this.height);
            }
        }
        
        // Restaurar alpha
        window.ctx.globalAlpha = previousAlpha;
    }

    checkCollisionWithBlocks(blocks) {
        this.isOnGround = false;

        for (let block of blocks) {
            // AABB Collision Detection
            if (
                this.sides.right > block.x &&
                this.sides.left < block.x + block.width &&
                this.sides.bottom > block.y &&
                this.sides.top < block.y + block.height
            ) {
                // Verificar bloco de transição PRIMEIRO
                if (block.tipo === 'bloco_transicao') {
                    if (window.onPhaseTransition) {
                        window.onPhaseTransition(block.proximaFase);
                    }
                    return;
                }

                // Detectar direção da colisão
                const overlapTop = this.sides.bottom - block.y;
                const overlapBottom = (block.y + block.height) - this.sides.top;
                const overlapLeft = this.sides.right - block.x;
                const overlapRight = (block.x + block.width) - this.sides.left;

                const minOverlap = Math.min(overlapTop, overlapBottom, overlapLeft, overlapRight);

                // Colisão pelo topo (player caindo)
                if (minOverlap === overlapTop && this.velocity.y > 0) {
                    this.position.y = block.y - this.height;
                    this.velocity.y = 0;
                    this.isOnGround = true;
                }
                // Colisão pelo fundo (player pula dentro de bloco)
                else if (minOverlap === overlapBottom && this.velocity.y < 0) {
                    this.position.y = block.y + block.height;
                    this.velocity.y = 0;
                }
                // Colisão pela esquerda (player vindo da esquerda)
                else if (minOverlap === overlapLeft && this.velocity.x > 0) {
                    this.position.x = block.x - this.width;
                    this.velocity.x = 0;
                }
                // Colisão pela direita (player vindo da direita)
                else if (minOverlap === overlapRight && this.velocity.x < 0) {
                    this.position.x = block.x + block.width;
                    this.velocity.x = 0;
                }
            }
        }
    }

    update(blocks) {
        // 1️⃣ PRIMEIRO: Aplicar gravidade com multiplicador
        this.velocity.y += this.gravity * window.gravityMultiplier;

        // 2️⃣ SEGUNDA: Aplicar velocidades
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;

        // 3️⃣ TERCEIRA: Atualizar sides
        this.sides.left = this.position.x;
        this.sides.right = this.position.x + this.width;
        this.sides.bottom = this.position.y + this.height;
        this.sides.top = this.position.y;

        // 4️⃣ QUARTA: Verificar colisões com blocos do mapa
        if (blocks) {
            this.checkCollisionWithBlocks(blocks);
        }

        // 5️⃣ QUINTA: Aplicar damping
        this.velocity.x *= 0.8;
        if (Math.abs(this.velocity.x) < 0.01) this.velocity.x = 0;

        // 6️⃣ SEXTA: Atualizar estado de animação
        this.updateState();

        // Limites horizontais do mundo
        if (this.position.x < 0) {
            this.position.x = 0;
            this.velocity.x = 0;
        }

        // Se cair muito (fora do mundo), resetar
        if (this.position.y > 5000) {
            this.position.x = 960;
            this.position.y = 2400;
            this.velocity = { x: 0, y: 0 };
            this.jumpsRemaining = this.maxJumps;
        }
    }

}
