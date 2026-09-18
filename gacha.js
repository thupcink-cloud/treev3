/**
 * gacha.js - ระบบสุ่มซองต้นไม้พร้อมคูลดาวน์ 1 ครั้งต่อวัน
 */
const GachaSystem = {
    plantTypes: [
        { id: 'sunflower', name: 'น้องทานตะวัน', video: 'images/sunflower_lvl1.mp4' },
        { id: 'grape', name: 'น้ององุ่น', video: 'images/grape_lvl1.mp4' },
        { id: 'bamboo', name: 'น้องไม้ไผ่', video: 'images/bamboo_lvl1.mp4' }
    ],

    init() {
        this.checkCooldown();
        setInterval(() => this.checkCooldown(), 1000);
    },

    checkCooldown() {
        const lastGachaTime = localStorage.getItem('last_gacha_timestamp');
        const btn = document.getElementById('btnExecuteGacha');
        const countdownText = document.getElementById('gachaCooldownText');

        if (!lastGachaTime) {
            if (btn) btn.disabled = false;
            if (countdownText) countdownText.innerHTML = '';
            return;
        }

        const now = new Date().getTime();
        const nextAvailableTime = parseInt(lastGachaTime) + (24 * 60 * 60 * 1000); // 24 ชั่วโมง
        const distance = nextAvailableTime - now;

        if (distance <= 0) {
            if (btn) btn.disabled = false;
            if (countdownText) countdownText.innerHTML = '<span style="color: #2e7d32; font-weight: bold;">✨ สามารถเปิดซองสุ่มประจำวันได้แล้ว!</span>';
        } else {
            if (btn) btn.disabled = true;
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            if (countdownText) {
                countdownText.innerHTML = `⏳ สุ่มได้อีกครั้งใน: <span style="font-family: monospace; color: #e53935; font-weight: bold;">${hours} ชม. ${minutes} น. ${seconds} วินาที</span>`;
            }
        }
    },

    executeGacha() {
        const lastGachaTime = localStorage.getItem('last_gacha_timestamp');
        const now = new Date().getTime();

        if (lastGachaTime && (now - parseInt(lastGachaTime) < 24 * 60 * 60 * 1000)) {
            Swal.fire('ใจเย็นๆ ครับ!', 'คุณได้สุ่มซองต้นไม้ของวันนี้ไปแล้ว กรุณารอครบรอบ 24 ชั่วโมง', 'warning');
            return;
        }

        // บันทึกเวลาสุ่มปัจจุบัน
        localStorage.setItem('last_gacha_timestamp', now.toString());

        const randomIndex = Math.floor(Math.random() * this.plantTypes.length);
        const rewardedPlant = this.plantTypes[randomIndex];

        let userInventory = JSON.parse(localStorage.getItem('user_plant_inventory') || '[]');
        const isDuplicate = userInventory.some(p => p.id === rewardedPlant.id);

        const resultContainer = document.getElementById('gachaResultContainer');

        if (isDuplicate) {
            this.addExp(30);
            if (resultContainer) {
                resultContainer.innerHTML = `
                    <div style="background: #e8f5e9; padding: 25px; border-radius: 16px; border: 2px dashed #4caf50; display: inline-block; max-width: 400px; box-shadow: var(--shadow-sm);">
                        <h3 style="color: #2e7d32; margin-bottom: 10px;">🎉 สุ่มได้ "${rewardedPlant.name}" (ตัวซ้ำ)</h3>
                        <p style="margin-bottom: 12px; color: #555;">เนื่องจากคุณมีตัวละครนี้แล้ว ระบบแปลงเป็น <b>+30 EXP</b> ให้อัตโนมัติ!</p>
                        <video width="120" height="120" autoplay loop muted playsinline style="border-radius: 50%; border: 4px solid #4CAF50; object-fit: cover;">
                            <source src="${rewardedPlant.video}" type="video/mp4">
                        </video>
                    </div>
                `;
            }
            Swal.fire('ได้ตัวซ้ำ!', 'ระบบแปลงเป็น +30 EXP ให้เรียบร้อยแล้วครับ', 'success');
        } else {
            userInventory.push(rewardedPlant);
            localStorage.setItem('user_plant_inventory', JSON.stringify(userInventory));
            
            let currentPet = { level: 1, current_exp: 0, max_exp: 100, activePlant: rewardedPlant };
            localStorage.setItem('user_pet_data', JSON.stringify(currentPet));
            
            if (typeof UI !== 'undefined' && typeof UI.renderPet === 'function') {
                UI.renderPet(currentPet);
            }

            if (resultContainer) {
                resultContainer.innerHTML = `
                    <div style="background: #e8f5e9; padding: 25px; border-radius: 16px; border: 2px solid #4caf50; display: inline-block; max-width: 400px; box-shadow: var(--shadow-sm);">
                        <h3 style="color: #2e7d32; margin-bottom: 10px;">🎊 ยินดีด้วย! คุณสุ่มได้รับ</h3>
                        <p style="font-size: 1.25rem; font-weight: bold; color: #1b5e20; margin: 10px 0;">${rewardedPlant.name}</p>
                        <video width="120" height="120" autoplay loop muted playsinline style="border-radius: 50%; border: 4px solid #4CAF50; margin: 10px auto; object-fit: cover; display: block;">
                            <source src="${rewardedPlant.video}" type="video/mp4">
                        </video>
                        <p style="color: #666; font-size: 0.9rem; margin-top: 8px;">เพิ่มเข้าสู่กระเป๋าและตั้งเป็นตัวละครหลักเรียบร้อย!</p>
                    </div>
                `;
            }
            Swal.fire('ยินดีด้วย!', `คุณสุ่มได้รับ ${rewardedPlant.name}!`, 'success');
        }

        this.checkCooldown();
    },

    addExp(amount) {
        let currentPet = JSON.parse(localStorage.getItem('user_pet_data') || '{"level":1, "current_exp":0, "max_exp":100}');
        currentPet.current_exp += amount;

        if (currentPet.current_exp >= currentPet.max_exp) {
            currentPet.level += 1;
            currentPet.current_exp -= currentPet.max_exp;
            currentPet.max_exp = Math.floor(currentPet.max_exp * 1.2);
            Swal.fire('เลเวลอัป!', `สัตว์เลี้ยงของคุณเลเวลอัปสู่ Level ${currentPet.level} แล้ว!`, 'success');
        }

        localStorage.setItem('user_pet_data', JSON.stringify(currentPet));
        if (typeof UI !== 'undefined' && typeof UI.renderPet === 'function') {
            UI.renderPet(currentPet);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    GachaSystem.init();
});