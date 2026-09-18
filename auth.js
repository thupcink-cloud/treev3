/**
 * Auth.js - ระบบสมัครสมาชิก (เชื่อมต่อ LINE LIFF และบันทึกลง Supabase)
 * แก้ไข: บันทึก LINE User ID ลง Supabase ทันทีที่ผู้ใช้กดอนุญาต
 */
const Auth = {
    lineProfile: null,
    isLiffReady: false,
    _initPromise: null,

    // กัน initLIFF ถูกเรียกซ้ำ (auth.js เรียกเอง 1 ครั้ง + login.html เรียกอีก 1 ครั้ง)
    async initLIFF() {
        if (!this._initPromise) {
            this._initPromise = this._runInit();
        }
        return this._initPromise;
    },

    async _runInit() {
        try {
            const liffId = (typeof CONFIG !== 'undefined' && CONFIG.LINE) ? CONFIG.LINE.LIFF_ID : (typeof LIFF_ID !== 'undefined' ? LIFF_ID : null);

            if (typeof liff === 'undefined' || !liffId) {
                console.error("LIFF SDK หรือ LIFF_ID ไม่ถูกโหลด");
                return;
            }

            await liff.init({ liffId: liffId });
            this.isLiffReady = true;

            // เช็กว่าผู้ใช้ล็อกอิน LINE ค้างไว้หรือเพิ่ง Redirect กลับมา
            if (liff.isLoggedIn()) {
                this.lineProfile = await liff.getProfile();
                this._cacheProfile(this.lineProfile);

                // ✅ จุดสำคัญ: ยิงข้อมูลเข้า Supabase ทันทีหลัง Redirect กลับมา
                const result = await this.saveLineToSupabase(this.lineProfile);
                localStorage.removeItem('line_auth_in_progress');

                this.updateUI(true, this.lineProfile.displayName);

                if (result.saved && typeof Swal !== 'undefined') {
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: 'บันทึก LINE User ID ลงระบบแล้ว',
                        showConfirmButton: false,
                        timer: 2000
                    });
                }
            }
        } catch (err) {
            console.error("LIFF Init Error:", err);
        }
    },

    _cacheProfile(profile) {
        if (!profile) return;
        localStorage.setItem('line_user_id', profile.userId);
        localStorage.setItem('line_display_name', profile.displayName || '');
        if (profile.pictureUrl) localStorage.setItem('line_picture_url', profile.pictureUrl);
    },

    /**
     * บันทึก LINE profile ลง Supabase
     * - ถ้าล็อกอินอยู่แล้ว (มี plant_care_user) => อัปเดตแถวใน users
     * - ถ้ายังไม่มีบัญชี => upsert ลงตาราง line_profiles ไว้ก่อน แล้วค่อยผูกตอนสมัคร
     */
    async saveLineToSupabase(profile) {
        if (!profile || !profile.userId) return { saved: false, reason: 'no-profile' };

        if (typeof _supabase === 'undefined' || !_supabase) {
            console.error('Supabase ยังไม่พร้อมใช้งาน');
            return { saved: false, reason: 'no-supabase' };
        }

        const payload = {
            line_user_id: profile.userId,
            line_display_name: profile.displayName || ''
        };

        try {
            const sessionUser = await this.getCurrentUser();

            // กรณีที่ 1: ผู้ใช้มีบัญชีอยู่แล้ว -> อัปเดตลงตาราง users เลย
            if (sessionUser && sessionUser.id) {
                const { data, error } = await _supabase
                    .from('users')
                    .update(payload)
                    .eq('id', sessionUser.id)
                    .select()
                    .maybeSingle();

                if (error) {
                    console.error('Update users.line_user_id error:', error);
                    return { saved: false, reason: error.message };
                }

                if (data) {
                    localStorage.setItem('plant_care_user', JSON.stringify(data));
                }
                return { saved: true, target: 'users' };
            }

            // กรณีที่ 2: ยังไม่ได้สมัคร -> พักไว้ที่ตาราง line_profiles ก่อน
            const { error } = await _supabase
                .from('line_profiles')
                .upsert({
                    line_user_id: profile.userId,
                    display_name: profile.displayName || '',
                    picture_url: profile.pictureUrl || null,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'line_user_id' });

            if (error) {
                console.error('Upsert line_profiles error:', error);
                return { saved: false, reason: error.message };
            }

            return { saved: true, target: 'line_profiles' };
        } catch (err) {
            console.error('saveLineToSupabase error:', err);
            return { saved: false, reason: err.message };
        }
    },

    updateUI(isConnected, displayName = '') {
        const statusText = document.getElementById('line-status') || document.getElementById('lineBadge');
        const lineBtn = document.getElementById('line-auth-btn') || document.getElementById('btnConnectLine');

        if (isConnected) {
            if (statusText) {
                statusText.innerText = `✅ เชื่อมต่อ LINE แล้ว: ${displayName}`;
                statusText.style.color = '#2e7d32';
                statusText.style.background = '#f0fff4';
            }
            if (lineBtn) {
                lineBtn.innerText = 'เชื่อมต่อ LINE เรียบร้อยแล้ว';
                lineBtn.disabled = true;
                lineBtn.style.opacity = '0.6';
                lineBtn.style.cursor = 'not-allowed';
            }

            // เปิดฟอร์มสมัครสมาชิกทันที
            if (typeof showRegisterForm === 'function') {
                showRegisterForm();
            }
        }
    },

    async requestLinePermission() {
        try {
            if (typeof liff === 'undefined') {
                Swal.fire('แจ้งเตือน', 'กรุณารอระบบ LIFF โหลดสักครู่แล้วลองใหม่', 'warning');
                return null;
            }

            // รอให้ init เสร็จจริงๆ แทนการ setTimeout เดา 1 วินาที
            await this.initLIFF();

            if (!this.isLiffReady) {
                Swal.fire('แจ้งเตือน', 'ระบบ LIFF ยังไม่พร้อม กรุณาลองใหม่อีกครั้ง', 'warning');
                return null;
            }

            if (!liff.isLoggedIn()) {
                // ตั้งธงไว้ก่อน Redirect เพื่อให้กลับมาแล้วเปิดฟอร์มสมัครต่อได้
                localStorage.setItem('line_auth_in_progress', 'true');
                const cleanRedirectUri = window.location.origin + window.location.pathname;
                liff.login({ redirectUri: cleanRedirectUri });
                return null;
            }

            Swal.showLoading();
            this.lineProfile = await liff.getProfile();
            this._cacheProfile(this.lineProfile);

            // ✅ บันทึกลง Supabase ตรงนี้
            const result = await this.saveLineToSupabase(this.lineProfile);

            this.updateUI(true, this.lineProfile.displayName);

            if (result.saved) {
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: `บันทึก LINE (${this.lineProfile.displayName}) ลงระบบแล้ว`,
                    showConfirmButton: false,
                    timer: 2500
                });
            } else {
                Swal.fire('บันทึกไม่สำเร็จ', 'ดึงข้อมูล LINE ได้ แต่บันทึกลงฐานข้อมูลไม่ผ่าน: ' + result.reason, 'warning');
            }

            return this.lineProfile;
        } catch (err) {
            console.error("Error requesting LINE permission:", err);
            Swal.fire('ผิดพลาด', 'ไม่สามารถดึงข้อมูล LINE ได้: ' + err.message, 'error');
            return null;
        }
    },

    async getCurrentUser() {
        const sessionUser = localStorage.getItem('plant_care_user');
        return sessionUser ? JSON.parse(sessionUser) : null;
    },

    async signIn(username, password) {
        const cleanUsername = username.trim();

        if (typeof _supabase === 'undefined' || !_supabase) {
            throw new Error('ระบบฐานข้อมูลยังไม่พร้อมใช้งาน');
        }

        const { data, error } = await _supabase
            .from('users')
            .select('*')
            .eq('username', cleanUsername)
            .eq('password', password)
            .maybeSingle();

        if (error || !data) {
            throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
        }

        localStorage.setItem('plant_care_user', JSON.stringify(data));

        // ถ้าเพิ่งเชื่อม LINE ไว้แต่บัญชียังไม่มี line_user_id ให้ผูกให้อัตโนมัติ
        const pendingLineId = localStorage.getItem('line_user_id');
        if (pendingLineId && !data.line_user_id) {
            await _supabase
                .from('users')
                .update({
                    line_user_id: pendingLineId,
                    line_display_name: localStorage.getItem('line_display_name') || ''
                })
                .eq('id', data.id);
        }

        return data;
    },

    async signUp(username, password) {
        const lineUserId = localStorage.getItem('line_user_id') || (this.lineProfile ? this.lineProfile.userId : null);
        const lineDisplayName = localStorage.getItem('line_display_name') || (this.lineProfile ? this.lineProfile.displayName : '');

        if (!lineUserId) {
            throw new Error('กรุณากดปุ่ม "กดอนุญาตดึง LINE User ID" ก่อนทำการสมัครสมาชิก');
        }

        if (typeof _supabase === 'undefined' || !_supabase) {
            throw new Error('ระบบฐานข้อมูลยังไม่พร้อมใช้งาน');
        }

        const cleanUsername = username.trim();

        const { data: existingUser } = await _supabase
            .from('users')
            .select('id')
            .eq('username', cleanUsername)
            .maybeSingle();

        if (existingUser) {
            throw new Error('ชื่อผู้ใช้นี้ถูกใช้งานแล้ว');
        }

        const { data, error } = await _supabase
            .from('users')
            .insert([{
                username: cleanUsername,
                password: password,
                line_user_id: lineUserId,
                line_display_name: lineDisplayName
            }])
            .select();

        if (error) {
            console.error("Supabase SignUp Error:", error);
            throw new Error(error.message || 'บันทึกข้อมูลล้มเหลว');
        }

        return data ? data[0] : null;
    },

    async signOut() {
        localStorage.clear();
        window.location.href = 'login.html';
    }
};

// Global Function ผูกกับปุ่ม HTML
function requestLinePermission() {
    Auth.requestLinePermission();
}

document.addEventListener('DOMContentLoaded', () => {
    Auth.initLIFF();
});