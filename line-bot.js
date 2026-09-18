/**
 * line-bot.js - ระบบส่งข้อความแจ้งเตือนผ่าน LINE Messaging API
 */
const LineBot = {
    CHANNEL_ACCESS_TOKEN: "ljLdqektjOMfYUDdqMCJ+6RBxzD4RtF7NvBYUU25FEhUkgV0/0x0TQ2NVoM6p1KMYbuxy+L7xEiOj+C/qnXXOn2mwr67cNJ81Kvbf83DKDndbbi8284al+mzbidOxWJsgvaxYDv+z16ozoKOOLvgaAdB04t89/1O/w1cDnyilFU=",

    async sendWateringReminder(lineUserId, plantName, adviceText = "") {
        if (!this.CHANNEL_ACCESS_TOKEN || this.CHANNEL_ACCESS_TOKEN === "YOUR_LINE_CHANNEL_ACCESS_TOKEN") {
            console.error("กรุณากรอก CHANNEL_ACCESS_TOKEN ในไฟล์ line-bot.js");
            return false;
        }

        if (!lineUserId) {
            console.error("ไม่พบ LINE User ID สำหรับการส่งแจ้งเตือน");
            return false;
        }

        const endpoint = "https://api.line.me/v2/bot/message/push";

        const messagePayload = {
            to: lineUserId,
            messages: [
                {
                    type: "flex",
                    altText: `🌱 ถึงเวลารดน้ำต้นไม้ ${plantName} แล้ว!`,
                    contents: {
                        type: "bubble",
                        header: {
                            type: "box",
                            layout: "vertical",
                            backgroundColor: "#2e7d32",
                            contents: [
                                {
                                    type: "text",
                                    text: "🌱 ได้เวลารดน้ำต้นไม้!",
                                    color: "#ffffff",
                                    weight: "bold",
                                    size: "md"
                                }
                            ]
                        },
                        body: {
                            type: "box",
                            layout: "vertical",
                            contents: [
                                {
                                    type: "text",
                                    text: plantName,
                                    weight: "bold",
                                    size: "xl",
                                    color: "#1b5e20",
                                    wrap: true
                                },
                                {
                                    type: "text",
                                    text: adviceText || "อย่าลืมเช็กความชื้นของดินก่อนรดน้ำนะครับ",
                                    size: "sm",
                                    color: "#555555",
                                    wrap: true,
                                    margin: "md"
                                }
                            ]
                        }
                    }
                }
            ]
        };

        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.CHANNEL_ACCESS_TOKEN}`
                },
                body: JSON.stringify(messagePayload)
            });

            if (response.ok) {
                console.log(`ส่งแจ้งเตือนไปที่ ${lineUserId} สำเร็จ!`);
                return true;
            } else {
                const errData = await response.json();
                console.error("LINE Messaging API Error:", errData);
                return false;
            }
        } catch (err) {
            console.error("Error sending LINE push message:", err);
            return false;
        }
    }
};