class Enemy1 {
    constructor(x, y) {
        this.position = { x: x, y: y };
        this.velocity = { x: 0, y: 0 };
        
        this.width = 60;
        this.height = 60;
        this.sides = { 
            bottom: this.position.y + this.height, 
            left: this.position.x, 
            right: this.position.x + this.width, 
            top: this.position.y 
        };
        
        this.gravity = 1;
        this.isOnGround = false;
        
        // Comportamento de perseguição
        this.detectionRadius = 400; // Distância para detectar o player
        this.moveSpeed = 2;
        this.jumpCooldown = 0;
        this.jumpCooldownMax = 60; // frames entre pulos
        
        // Sistema de vida
        this.health = 3;
        this.maxHealth = 3;
        this.isDead = false;
        
        // Feedback visual de dano
        this.damageFlashTimer = 0;
        this.damageFlashDuration = 20;
        
        // Knockback quando toma dano
        this.knockbackTimer = 0;
        this.knockbackDuration = 15;
    }
    
    takeDamage(damageAmount, knockbackDirection) {
        if (this.isDead) return;
        
        this.health -= damageAmount;
        this.damageFlashTimer = this.damageFlashDuration;
        
        // Aplicar knockback
        this.velocity.x = knockbackDirection * 8;
        this.velocity.y = -10;
        this.knockbackTimer = this.knockbackDuration;
        
        if (this.health <= 0) {
            this.isDead = true;
            console.log('💀 Inimigo eliminado!');
        }
    }
    
    draw(camera) {
        if (this.isDead) return;
        
        const screenX = this.position.x - camera.x;
        const screenY = this.position.y - camera.y;
        
        // Flash vermelho quando toma dano
        if (this.damageFlashTimer > 0) {
            window.ctx.fillStyle = '#FF0000';
            this.damageFlashTimer--;
        } else {
            window.ctx.fillStyle = '#8B008B'; // Roxo escuro
        }
        
        // Corpo do inimigo
        window.ctx.fillRect(screenX, screenY, this.width, this.height);
        
        // Olhos (para dar personalidade)
        window.ctx.fillStyle = 'white';
        window.ctx.fillRect(screenX + 10, screenY + 15, 15, 15);
        window.ctx.fillRect(screenX + 35, screenY + 15, 15, 15);
        
        window.ctx.fillStyle = 'black';
        window.ctx.fillRect(screenX + 15, screenY + 20, 8, 8);
        window.ctx.fillRect(screenX + 40, screenY + 20, 8, 8);
        
        // Barra de vida
        const healthBarWidth = this.width;
        const healthBarHeight = 5;
        const healthPercentage = this.health / this.maxHealth;
        
        // Fundo da barra (vermelho)
        window.ctx.fillStyle = '#FF0000';
        window.ctx.fillRect(screenX, screenY - 10, healthBarWidth, healthBarHeight);
        
        // Vida atual (verde)
        window.ctx.fillStyle = '#00FF00';
        window.ctx.fillRect(screenX, screenY - 10, healthBarWidth * healthPercentage, healthBarHeight);
    }
    
    checkCollisionWithBlocks(blocks) {
        this.isOnGround = false;

        for (let block of blocks) {
            // Ignorar blocos de transição
            if (block.tipo === 'bloco_transicao') continue;
            
            if (
                this.sides.right > block.x &&
                this.sides.left < block.x + block.width &&
                this.sides.bottom > block.y &&
                this.sides.top < block.y + block.height
            ) {
                const overlapTop = this.sides.bottom - block.y;
                const overlapBottom = (block.y + block.height) - this.sides.top;
                const overlapLeft = this.sides.right - block.x;
                const overlapRight = (block.x + block.width) - this.sides.left;

                const minOverlap = Math.min(overlapTop, overlapBottom, overlapLeft, overlapRight);

                if (minOverlap === overlapTop && this.velocity.y > 0) {
                    this.position.y = block.y - this.height;
                    this.velocity.y = 0;
                    this.isOnGround = true;
                }
                else if (minOverlap === overlapBottom && this.velocity.y < 0) {
                    this.position.y = block.y + block.height;
                    this.velocity.y = 0;
                }
                else if (minOverlap === overlapLeft && this.velocity.x > 0) {
                    this.position.x = block.x - this.width;
                    this.velocity.x = 0;
                }
                else if (minOverlap === overlapRight && this.velocity.x < 0) {
                    this.position.x = block.x + block.width;
                    this.velocity.x = 0;
                }
            }
        }
    }
    
    update(blocks, player) {
        if (this.isDead) return;
        
        // Aplicar gravidade
        this.velocity.y += this.gravity;
        
        // Reduzir knockback timer
        if (this.knockbackTimer > 0) {
            this.knockbackTimer--;
        } else {
            // Comportamento de perseguição (apenas se não está em knockback)
            if (player && !player.isDead) {
                const dx = player.position.x - this.position.x;
                const dy = player.position.y - this.position.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Se player está no alcance de detecção
                if (distance < this.detectionRadius) {
                    // Mover em direção ao player
                    if (Math.abs(dx) > 10) {
                        this.velocity.x = (dx > 0 ? this.moveSpeed : -this.moveSpeed);
                    } else {
                        this.velocity.x = 0;
                    }
                    
                    // Tentar pular se player está acima e há obstáculo na frente
                    if (this.isOnGround && dy < -50 && this.jumpCooldown <= 0) {
                        this.velocity.y = -15;
                        this.jumpCooldown = this.jumpCooldownMax;
                    }
                }
            }
        }
        
        // Reduzir cooldown de pulo
        if (this.jumpCooldown > 0) {
            this.jumpCooldown--;
        }
        
        // Aplicar velocidade
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
        
        // Atualizar sides
        this.sides.left = this.position.x;
        this.sides.right = this.position.x + this.width;
        this.sides.bottom = this.position.y + this.height;
        this.sides.top = this.position.y;
        
        // Colisões
        if (blocks) {
            this.checkCollisionWithBlocks(blocks);
        }
        
        // Damping
        this.velocity.x *= 0.8;
        if (Math.abs(this.velocity.x) < 0.01) this.velocity.x = 0;
        
        // Se cair fora do mundo, marcar como morto
        if (this.position.y > 5000) {
            this.isDead = true;
        }
    }
};
