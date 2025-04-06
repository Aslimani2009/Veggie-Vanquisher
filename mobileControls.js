class MobileControls {
    constructor(game) {
        this.game = game;
        this.moveVector = { x: 0, z: 0 };
        this.setupJoystick();
        this.setupShootButton();
        this.setupWeaponSelect();
    }

    setupJoystick() {
        const options = {
            zone: document.getElementById('mobile-joystick'),
            mode: 'static',
            position: { left: '50%', top: '50%' },
            color: 'white',
            size: 120
        };

        this.joystick = nipplejs.create(options);
        
        this.joystick.on('move', (evt, data) => {
            const angle = data.angle.radian;
            const force = Math.min(data.force, 1);
            
            this.moveVector.x = Math.cos(angle) * force;
            this.moveVector.z = Math.sin(angle) * force;
            
            // Update player velocity
            this.game.playerBody.velocity.x = this.moveVector.x * 10;
            this.game.playerBody.velocity.z = this.moveVector.z * 10;
        });

        this.joystick.on('end', () => {
            this.moveVector.x = 0;
            this.moveVector.z = 0;
            this.game.playerBody.velocity.x = 0;
            this.game.playerBody.velocity.z = 0;
        });
    }

    setupShootButton() {
        const shootButton = document.getElementById('mobile-shoot');
        
        let touchStartTime = 0;
        
        shootButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            touchStartTime = Date.now();
        });
        
        shootButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            const touchDuration = Date.now() - touchStartTime;
            
            if (touchDuration < 300) { // Quick tap
                this.game.shoot();
            }
        });
    }

    setupWeaponSelect() {
        const weaponButtons = document.querySelectorAll('.weapon-btn');
        
        weaponButtons.forEach(button => {
            button.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const weaponIndex = parseInt(button.dataset.weapon);
                this.game.currentVeggie = weaponIndex;
                
                // Update UI
                weaponButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                this.game.updateWeaponUI();
            });
        });
    }

    // Handle device orientation for looking around
    setupGyroscope() {
        if (window.DeviceOrientationEvent) {
            window.addEventListener('deviceorientation', (e) => {
                if (!this.game.isGameOver && e.beta !== null && e.gamma !== null) {
                    // Convert degrees to radians
                    const beta = (e.beta * Math.PI) / 180;
                    const gamma = (e.gamma * Math.PI) / 180;
                    
                    // Apply smooth rotation to camera
                    this.game.camera.rotation.x = -beta * 0.5;
                    this.game.camera.rotation.y = -gamma * 0.5;
                }
            });
        }
    }

    update() {
        // Additional update logic if needed
    }
}
