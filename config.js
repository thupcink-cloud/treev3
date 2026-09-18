/**
 * Config.js - API & System Config
 */
const SUPABASE_URL = "https://nkofqdsnxswwphavsxff.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rb2ZxZHNueHN3d3BoYXZzeGZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4NDk2MTcsImV4cCI6MjEwNDQyNTYxN30.SIP29QIw-MWq4_i3iW9TDZ5hRDI4Vt7u99bO-hm2QG8"; 

// 🔑 LIFF ID
const LIFF_ID = "2011660540-p3kncEy4"; 

// 🔑 Gemini API Key
const GEMINI_API_KEY = "AQ.Ab8RN6KpT5pHFDrLLVXnDEF2DCjZyQ3_Cnhvtbjzi2XOh1BXPQ"; 

// สร้างออบเจกต์ CONFIG สำหรับโมดูลอื่นๆ เรียกใช้
const CONFIG = {
    LINE: {
        LIFF_ID: LIFF_ID
    }
};

// --- แก้ไขจุดนี้: ตรวจสอบและสร้าง Supabase Client ผ่าน window.supabase ---
let _supabase = null;
try {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
        _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else if (typeof supabase !== 'undefined' && supabase.createClient) {
        _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
} catch (err) {
    console.error("Failed to initialize Supabase client:", err);
}

if (!_supabase) {
    console.warn("Supabase SDK is not loaded or failed to initialize!");
}