class VeggieVanquisher {
    constructor() {
        this.setupScene();
        this.setupLights();
        this.setupPhysics();
        this.setupPlayer();
        this.setupWeapons();
        this.setupAudio();
        this.setupEventListeners();
        
        this.particles = new ParticleSystem(this.scene);
        this.mobileControls = new MobileControls(this);
        
        this.demons = [];
        this.projectiles = [];
        this.score = 0;
        this.isGameOver = false;
        
        this.spawnDemons();
        this.animate();
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x000000, 0.02);
        
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);
        
        // Create ground
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a0f0f,
            roughness: 0.8,
            metalness: 0.2
        });
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);
        
        this.createWalls();
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 5, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);

        // Add atmospheric lights
        const redLight = new THREE.PointLight(0xff0000, 1, 50);
        redLight.position.set(-10, 2, -10);
        this.scene.add(redLight);

        const blueLight = new THREE.PointLight(0x0000ff, 1, 50);
        blueLight.position.set(10, 2, 10);
        this.scene.add(blueLight);
    }

    setupPhysics() {
        this.world = new CANNON.World();
        this.world.gravity.set(0, -20, 0);
        this.world.broadphase = new CANNON.NaiveBroadphase();
        
        // Ground physics
        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({ mass: 0 });
        groundBody.addShape(groundShape);
        groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        this.world.addBody(groundBody);
    }

    createWalls() {
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0x8b0000,
            roughness: 0.7,
            metalness: 0.3
        });

        const wallGeometry = new THREE.BoxGeometry(100, 10, 1);
        const walls = [
            { pos: [0, 5, 50], rot: [0, 0, 0] },
            { pos: [0, 5, -50], rot: [0, 0, 0] },
            { pos: [50, 5, 0], rot: [0, Math.PI / 2, 0] },
            { pos: [-50, 5, 0], rot: [0, Math.PI / 2, 0] }
        ];

        walls.forEach(wall => {
            const mesh = new THREE.Mesh(wallGeometry, wallMaterial);
            mesh.position.set(...wall.pos);
            mesh.rotation.set(...wall.rot);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.scene.add(mesh);

            // Add physics
            const shape = new CANNON.Box(new CANNON.Vec3(50, 5, 0.5));
            const body = new CANNON.Body({ mass: 0 });
            body.addShape(shape);
            body.position.set(...wall.pos);
            body.quaternion.setFromEuler(...wall.rot);
            this.world.addBody(body);
        });
    }

    setupPlayer() {
        this.camera.position.set(0, 2, 10);
        
        // Player physics body
        const playerShape = new CANNON.Sphere(1);
        this.playerBody = new CANNON.Body({
            mass: 5,
            shape: playerShape,
            position: new CANNON.Vec3(0, 2, 10)
        });
        this.world.addBody(this.playerBody);
        
        this.moveSpeed = 0.15;
        this.isJumping = false;
        this.keys = {};
    }

    setupWeapons() {
        this.vegetables = [
            { name: 'carrot', damage: 10, speed: 1.5, color: 0xff6b00 },
            { name: 'tomato', damage: 5, speed: 2, color: 0xff0000 },
            { name: 'cabbage', damage: 15, speed: 1, color: 0x00ff00 }
        ];
        this.currentVeggie = 0;
        this.ammo = 10;
    }

    setupAudio() {
        this.audioListener = new THREE.AudioListener();
        this.camera.add(this.audioListener);
        this.sounds = {
            shoot: new THREE.Audio(this.audioListener),
            hit: new THREE.Audio(this.audioListener),
            demonDeath: new THREE.Audio(this.audioListener),
            background: new THREE.Audio(this.audioListener)
        };

        const audioLoader = new THREE.AudioLoader();
        const loadSound = (name, path, options = {}) => {
            audioLoader.load(
                path,
                buffer => {
                    this.sounds[name].setBuffer(buffer);
                    if (options.loop) this.sounds[name].setLoop(true);
                    if (options.volume) this.sounds[name].setVolume(options.volume);
                    if (options.autoplay) this.sounds[name].play();
                },
                null,
                error => console.log(`Warning: Could not load sound ${path}:`, error)
            );
        };

        loadSound('shoot', 'assets/sounds/shoot.mp3');
        loadSound('hit', 'assets/sounds/hit.mp3');
        loadSound('demonDeath', 'assets/sounds/demon-death.mp3');
        loadSound('background', 'assets/sounds/background.mp3', {
            loop: true,
            volume: 0.5,
            autoplay: true
        });
    }

    setupEventListeners() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        document.addEventListener('keydown', (e) => this.keys[e.code] = true);
        document.addEventListener('keyup', (e) => this.keys[e.code] = false);

        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === document.body) {
                this.camera.rotation.y -= e.movementX * 0.002;
                this.camera.rotation.x = Math.max(
                    -Math.PI / 2,
                    Math.min(Math.PI / 2, this.camera.rotation.x - e.movementY * 0.002)
                );
            }
        });

        document.addEventListener('click', () => {
            if (document.pointerLockElement !== document.body) {
                document.body.requestPointerLock();
            } else {
                this.shoot();
            }
        });

        document.getElementById('restart-btn').addEventListener('click', () => {
            this.restartGame();
        });
    }

    shoot() {
        if (this.isGameOver || this.ammo <= 0) return;

        const veggie = this.vegetables[this.currentVeggie];
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(this.camera.quaternion);
        direction.multiplyScalar(veggie.speed * 15);

        // Create projectile
        const projectile = this.createVeggieProjectile(veggie);
        projectile.position.copy(this.camera.position);
        
        // Add physics
        const projectileShape = new CANNON.Sphere(0.2);
        const projectileBody = new CANNON.Body({
            mass: 1,
            shape: projectileShape
        });
        projectileBody.position.copy(this.camera.position);
        projectileBody.velocity.copy(direction);
        
        this.world.addBody(projectileBody);
        projectile.userData.physicsBody = projectileBody;
        this.projectiles.push(projectile);

        this.sounds.shoot.play();
        this.ammo--;
        this.updateWeaponUI();
    }

    createVeggieProjectile(veggie) {
        let geometry;
        switch(veggie.name) {
            case 'carrot':
                geometry = new THREE.ConeGeometry(0.1, 0.4, 8);
                break;
            case 'tomato':
                geometry = new THREE.SphereGeometry(0.15);
                break;
            case 'cabbage':
                geometry = new THREE.IcosahedronGeometry(0.2);
                break;
        }
        
        const material = new THREE.MeshStandardMaterial({ 
            color: veggie.color,
            roughness: 0.3,
            metalness: 0.7
        });
        
        const projectile = new THREE.Mesh(geometry, material);
        projectile.castShadow = true;
        this.scene.add(projectile);
        return projectile;
    }

    spawnDemons() {
        const spawnDemon = () => {
            if (!this.isGameOver) {
                const demon = this.createDemon();
                this.demons.push(demon);
                setTimeout(spawnDemon, Math.random() * 3000 + 2000);
            }
        };
        spawnDemon();
    }

    createDemon() {
        const geometry = new THREE.BoxGeometry(1, 2, 1);
        const material = new THREE.MeshStandardMaterial({
            color: 0x660000,
            roughness: 0.4,
            metalness: 0.6,
            emissive: 0x330000
        });
        
        const demon = new THREE.Mesh(geometry, material);
        
        // Random spawn position
        const angle = Math.random() * Math.PI * 2;
        const distance = 40;
        demon.position.set(
            Math.cos(angle) * distance,
            1,
            Math.sin(angle) * distance
        );
        
        // Physics body
        const shape = new CANNON.Box(new CANNON.Vec3(0.5, 1, 0.5));
        const body = new CANNON.Body({ mass: 5, shape });
        body.position.copy(demon.position);
        
        this.world.addBody(body);
        demon.userData.physicsBody = body;
        demon.userData.health = 100;
        
        this.scene.add(demon);
        return demon;
    }

    updateDemonAI() {
        this.demons.forEach(demon => {
            const direction = new THREE.Vector3()
                .subVectors(this.camera.position, demon.position)
                .normalize();
            
            const body = demon.userData.physicsBody;
            const speed = 5;
            body.velocity.x = direction.x * speed;
            body.velocity.z = direction.z * speed;
            
            demon.position.copy(body.position);
            demon.quaternion.copy(body.quaternion);
            
            if (demon.position.distanceTo(this.camera.position) < 2) {
                this.gameOver();
            }
        });
    }

    updateProjectiles() {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            const body = projectile.userData.physicsBody;
            
            projectile.position.copy(body.position);
            projectile.quaternion.copy(body.quaternion);
            
            // Check demon collisions
            for (let j = this.demons.length - 1; j >= 0; j--) {
                const demon = this.demons[j];
                if (projectile.position.distanceTo(demon.position) < 1.5) {
                    demon.userData.health -= this.vegetables[this.currentVeggie].damage;
                    this.particles.createExplosion(projectile.position, 0xff0000);
                    this.sounds.hit.play();
                    
                    this.scene.remove(projectile);
                    this.world.removeBody(body);
                    this.projectiles.splice(i, 1);
                    
                    if (demon.userData.health <= 0) {
                        this.scene.remove(demon);
                        this.world.removeBody(demon.userData.physicsBody);
                        this.demons.splice(j, 1);
                        this.score += 100;
                        this.updateScoreUI();
                        this.sounds.demonDeath.play();
                        this.particles.createExplosion(demon.position, 0x660000, 50);
                    }
                    break;
                }
            }
            
            // Remove projectiles that have traveled too far
            if (projectile.position.length() > 100) {
                this.scene.remove(projectile);
                this.world.removeBody(body);
                this.projectiles.splice(i, 1);
            }
        }
    }

    updatePlayerMovement() {
        if (this.isGameOver) return;

        const moveSpeed = 0.15;
        const jumpForce = 10;
        
        if (this.keys['KeyW']) this.playerBody.velocity.z = -moveSpeed * 60;
        if (this.keys['KeyS']) this.playerBody.velocity.z = moveSpeed * 60;
        if (this.keys['KeyA']) this.playerBody.velocity.x = -moveSpeed * 60;
        if (this.keys['KeyD']) this.playerBody.velocity.x = moveSpeed * 60;
        
        if (this.keys['Space'] && !this.isJumping) {
            this.playerBody.velocity.y = jumpForce;
            this.isJumping = true;
        }
        
        // Update camera position
        this.camera.position.copy(this.playerBody.position);
        
        // Check if on ground
        const rayCastResult = new CANNON.RaycastResult();
        const rayCastFrom = this.playerBody.position;
        const rayCastTo = new CANNON.Vec3(
            rayCastFrom.x,
            rayCastFrom.y - 1.1,
            rayCastFrom.z
        );
        this.world.raycastClosest(rayCastFrom, rayCastTo, {}, rayCastResult);
        
        if (rayCastResult.hasHit) {
            this.isJumping = false;
        }
    }

    updateWeaponUI() {
        const veggie = this.vegetables[this.currentVeggie];
        document.getElementById('ammo').textContent = 
            `${veggie.name}: ${this.ammo} | Damage: ${veggie.damage}`;
    }

    updateScoreUI() {
        document.getElementById('score').textContent = `Score: ${this.score}`;
    }

    gameOver() {
        this.isGameOver = true;
        document.exitPointerLock();
        document.getElementById('game-over').style.display = 'block';
        document.getElementById('final-score').textContent = this.score;
    }

    restartGame() {
        location.reload();
    }

    animate() {
        if (!this.isGameOver) {
            requestAnimationFrame(() => this.animate());
            
            const deltaTime = 1/60;
            this.world.step(deltaTime);
            
            this.updatePlayerMovement();
            this.updateProjectiles();
            this.updateDemonAI();
            this.particles.update(deltaTime);
            
            this.renderer.render(this.scene, this.camera);
        }
    }
}

// Start the game when the page loads
window.addEventListener('DOMContentLoaded', () => {
    new VeggieVanquisher();
});
