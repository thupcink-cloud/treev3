/**
 * Database.js - จัดการข้อมูลเชื่อมกับ User ID แบบ Username
 */
const Database = {
    async _getUserId() {
        const user = await Auth.getCurrentUser();
        return user ? user.id : null;
    },

    // --- ต้นไม้ (Plants) ---
    async getPlants() {
        const userId = await this._getUserId();
        if (!userId) return [];

        const { data, error } = await _supabase
            .from('plants')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
            
        if (error) console.error('Error fetching plants:', error);
        return data || [];
    },

    async addPlant(name, species) {
        const userId = await this._getUserId();
        if (!userId) return false;

        let initialDate = new Date();
        initialDate.setHours(8, 0, 0, 0);

        const { error } = await _supabase.from('plants').insert([{ 
            user_id: userId,
            name, 
            species,
            next_water_time: initialDate.toISOString()
        }]);
        
        if (error) console.error('Error adding plant:', error);
        return !error;
    },

    async updatePlantWaterTime(plantId, nextWaterTime) {
        if (!plantId) return false;
        const { error } = await _supabase.from('plants').update({ 
            next_water_time: nextWaterTime 
        }).eq('id', plantId);
        
        if (error) console.error('Error updating plant water time:', error);
        return !error;
    },

    // --- วันติดธุระ (Busy Schedules) ---
    async getBusyDates() {
        const userId = await this._getUserId();
        if (!userId) return [];

        const { data, error } = await _supabase
            .from('busy_schedules')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
            
        if (error) console.error('Error fetching busy dates:', error);
        return data || [];
    },

    async addBusyDate(busy_date, days, time_slot) {
        const userId = await this._getUserId();
        if (!userId) return false;

        const { error } = await _supabase.from('busy_schedules').insert([{ 
            user_id: userId,
            busy_date, 
            days, 
            time_slot 
        }]);
        
        if (error) console.error('Error adding busy date:', error);
        return !error;
    },

    // --- สัตว์เลี้ยง/เลเวล (Plant Pet) ---
    async getPetInfo() {
        const userId = await this._getUserId();
        if (!userId) return { level: 1, current_exp: 0, max_exp: 100 };

        try {
            const { data, error } = await _supabase
                .from('plant_pet')
                .select('*')
                .eq('user_id', userId)
                .limit(1);

            if (error) throw error;
            
            if (data && data.length > 0) {
                return data[0];
            } else {
                const { data: newPet, error: insertErr } = await _supabase
                    .from('plant_pet')
                    .insert([{ user_id: userId, level: 1, current_exp: 0, max_exp: 100 }])
                    .select();

                if (insertErr) throw insertErr;
                return newPet ? newPet[0] : { level: 1, current_exp: 0, max_exp: 100 };
            }
        } catch (err) {
            console.error('Error fetching pet info:', err);
            return { level: 1, current_exp: 0, max_exp: 100 };
        }
    },

    async updatePetInfo(level, exp) {
        const userId = await this._getUserId();
        if (!userId) return false;

        try {
            const { data: existing } = await _supabase
                .from('plant_pet')
                .select('id')
                .eq('user_id', userId)
                .limit(1);

            if (existing && existing.length > 0) {
                const { error } = await _supabase
                    .from('plant_pet')
                    .update({ level: level, current_exp: exp })
                    .eq('id', existing[0].id);

                return !error;
            } else {
                const { error } = await _supabase
                    .from('plant_pet')
                    .insert([{ user_id: userId, level: level, current_exp: exp, max_exp: 100 }]);

                return !error;
            }
        } catch (err) {
            console.error('Error in updatePetInfo:', err);
            return false;
        }
    }
};