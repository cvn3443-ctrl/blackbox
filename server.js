// Mo.dark – BlackBox Server (نسخة نهائية)
require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;
const ADMIN_PASSWORD = "BlackBox@2026#Secure"; // لا تغيرها

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));
app.use('/admin', express.static('admin'));

// === قاعدة البيانات ===
const db = new sqlite3.Database('./database.sqlite');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE,
        wallet_address TEXT,
        balance REAL DEFAULT 0,
        daily_profit REAL DEFAULT 0,
        last_reset DATE DEFAULT CURRENT_DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        type TEXT,
        amount REAL,
        status TEXT DEFAULT 'pending',
        txid TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        bet_amount REAL,
        level TEXT,
        multiplier REAL,
        result TEXT,
        profit REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS admin_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        commission REAL DEFAULT 0.20,
        max_daily_profit REAL DEFAULT 75,
        min_bet REAL DEFAULT 0.50,
        min_deposit REAL DEFAULT 10,
        min_withdraw REAL DEFAULT 10,
        site_active BOOLEAN DEFAULT 1
    )`);
});

// === دوال اللعبة ===
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function getBoxesByLevel(level) {
    const levels = {
        low:   { winCount: 3, multipliers: [1.2, 1.3, 1.5] },
        medium: { winCount: 2, multipliers: [2.0, 3.0] },
        high:  { winCount: 1, multipliers: [5.0, 10.0] }
    };
    const config = levels[level];
    if (!config) return getBoxesByLevel('medium');
    
    let boxes = [];
    for (let i = 0; i < config.winCount; i++) {
        const mult = config.multipliers[i % config.multipliers.length];
        boxes.push({ type: 'win', multiplier: mult });
    }
    const loseCount = 4 - config.winCount;
    for (let i = 0; i < loseCount; i++) {
        boxes.push({ type: 'lose', multiplier: 0 });
    }
    return shuffle(boxes);
}

// === مسارات API ===

// 1. تسجيل مستخدم جديد
app.post('/api/register', (req, res) => {
    const { email, wallet_address } = req.body;
    if (!email || !wallet_address) {
        return res.status(400).json({ error: 'البريد الإلكتروني وعنوان المحفظة مطلوبة' });
    }
    db.run(`INSERT INTO users (email, wallet_address) VALUES (?, ?)`, [email, wallet_address], function(err) {
        if (err) {
            return res.status(400).json({ error: 'هذا البريد الإلكتروني مسجل مسبقاً' });
        }
        res.json({ id: this.lastID, message: 'تم التسجيل بنجاح' });
    });
});

// 2. جلب الرصيد
app.get('/api/balance', (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'البريد الإلكتروني مطلوب' });
    db.get(`SELECT balance FROM users WHERE email = ?`, [email], (err, row) => {
        if (!row) return res.status(404).json({ error: 'المستخدم غير موجود' });
        res.json({ balance: row.balance || 0 });
    });
});

// 3. إيداع (يدوي عبر TxID)
app.post('/api/deposit', (req, res) => {
    const { email, txid, amount } = req.body;
    if (!email || !txid || !amount) {
        return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
    }
    if (amount < 10) {
        return res.status(400).json({ error: 'الحد الأدنى للإيداع 10$' });
    }
    db.get(`SELECT id FROM users WHERE email = ?`, [email], (err, user) => {
        if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
        db.run(`INSERT INTO transactions (user_id, type, amount, txid, status) VALUES (?, 'deposit', ?, ?, 'pending')`,
            [user.id, amount, txid], function() {
                res.json({ message: 'تم استلام طلب الإيداع، سيتم مراجعته خلال 24 ساعة' });
            });
    });
});

// 4. اللعبة
app.post('/api/play', (req, res) => {
    const { email, bet_amount, level, chosen_box } = req.body;
    if (!email || !bet_amount || !level || chosen_box === undefined) {
        return res.status(400).json({ error: 'بيانات غير مكتملة' });
    }
    if (bet_amount < 0.50) {
        return res.status(400).json({ error: 'الحد الأدنى للرهان 0.50$' });
    }

    db.get(`SELECT id, balance, daily_profit, last_reset FROM users WHERE email = ?`, [email], (err, user) => {
        if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
        if (user.balance < bet_amount) {
            return res.status(400).json({ error: 'الرصيد غير كافٍ' });
        }

        const today = new Date().toISOString().split('T')[0];
        if (user.last_reset !== today) {
            db.run(`UPDATE users SET daily_profit = 0, last_reset = ? WHERE id = ?`, [today, user.id]);
            user.daily_profit = 0;
        }

        const boxes = getBoxesByLevel(level);
        const result = boxes[chosen_box];
        let profit = 0;
        let isWin = false;

        if (result.type === 'win') {
            isWin = true;
            profit = bet_amount * result.multiplier;
            const commission = profit * 0.20;
            profit = profit - commission;
            const newBalance = user.balance + profit;
            const newDaily = user.daily_profit + profit;
            if (newDaily > 75) {
                return res.status(400).json({ error: 'لقد تجاوزت الحد الأقصى للربح اليومي (75$)' });
            }
            db.run(`UPDATE users SET balance = ?, daily_profit = ? WHERE id = ?`,
                [newBalance, newDaily, user.id]);
            db.run(`INSERT INTO games (user_id, bet_amount, level, multiplier, result, profit) VALUES (?, ?, ?, ?, 'win', ?)`,
                [user.id, bet_amount, level, result.multiplier, profit]);
        } else {
            profit = -bet_amount;
            const newBalance = user.balance - bet_amount;
            db.run(`UPDATE users SET balance = ? WHERE id = ?`, [newBalance, user.id]);
            db.run(`INSERT INTO games (user_id, bet_amount, level, multiplier, result, profit) VALUES (?, ?, ?, 0, 'lose', ?)`,
                [user.id, bet_amount, level, profit]);
        }

        res.json({
            result: isWin ? 'win' : 'lose',
            multiplier: result.multiplier || 0,
            profit: profit,
            new_balance: user.balance + (isWin ? profit : -bet_amount),
            boxes: boxes
        });
    });
});

// 5. طلب سحب
app.post('/api/withdraw', (req, res) => {
    const { email, amount } = req.body;
    if (!email || !amount) {
        return res.status(400).json({ error: 'البيانات غير مكتملة' });
    }
    if (amount < 10) {
        return res.status(400).json({ error: 'الحد الأدنى للسحب 10$' });
    }
    db.get(`SELECT id, balance FROM users WHERE email = ?`, [email], (err, user) => {
        if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
        if (user.balance < amount) {
            return res.status(400).json({ error: 'الرصيد غير كافٍ' });
        }
        const netAmount = amount * 0.96;
        db.run(`INSERT INTO transactions (user_id, type, amount, status) VALUES (?, 'withdraw', ?, 'pending')`,
            [user.id, netAmount]);
        res.json({ message: 'تم تقديم طلب السحب، سيتم مراجعته خلال 48 ساعة' });
    });
});

// 6. لوحة التحكم – جلب المعاملات المعلقة
app.get('/api/admin/transactions', (req, res) => {
    const { password } = req.query;
    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'كلمة مرور غير صحيحة' });
    }
    db.all(`SELECT t.*, u.email FROM transactions t JOIN users u ON t.user_id = u.id WHERE t.status = 'pending'`, (err, rows) => {
        res.json(rows);
    });
});

// 7. لوحة التحكم – معالجة المعاملة
app.post('/api/admin/transaction', (req, res) => {
    const { password, id, action } = req.body;
    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'كلمة مرور غير صحيحة' });
    }
    if (!id || !action) return res.status(400).json({ error: 'بيانات غير مكتملة' });

    db.get(`SELECT * FROM transactions WHERE id = ?`, [id], (err, tx) => {
        if (!tx) return res.status(404).json({ error: 'المعاملة غير موجودة' });
        if (tx.status !== 'pending') return res.status(400).json({ error: 'تم معالجة هذه المعاملة مسبقاً' });

        if (action === 'approve') {
            if (tx.type === 'withdraw') {
                db.run(`UPDATE users SET balance = balance - ? WHERE id = ?`, [tx.amount, tx.user_id]);
            } else if (tx.type === 'deposit') {
                db.run(`UPDATE users SET balance = balance + ? WHERE id = ?`, [tx.amount, tx.user_id]);
            }
            db.run(`UPDATE transactions SET status = 'completed' WHERE id = ?`, [id]);
            res.json({ message: 'تمت الموافقة على المعاملة' });
        } else {
            db.run(`UPDATE transactions SET status = 'rejected' WHERE id = ?`, [id]);
            res.json({ message: 'تم رفض المعاملة' });
        }
    });
});

// 8. إحصائيات سريعة للوحة التحكم
app.get('/api/admin/stats', (req, res) => {
    const { password } = req.query;
    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'كلمة مرور غير صحيحة' });
    }
    db.get(`SELECT COUNT(*) as total_users FROM users`, (err, users) => {
        db.get(`SELECT SUM(amount) as total_deposits FROM transactions WHERE type='deposit' AND status='completed'`, (err, deposits) => {
            db.get(`SELECT SUM(amount) as total_withdraws FROM transactions WHERE type='withdraw' AND status='completed'`, (err, withdraws) => {
                db.get(`SELECT SUM(profit) as total_profit FROM games WHERE result='win'`, (err, profits) => {
                    res.json({
                        total_users: users.total_users || 0,
                        total_deposits: deposits.total_deposits || 0,
                        total_withdraws: withdraws.total_withdraws || 0,
                        total_profit: profits.total_profit || 0
                    });
                });
            });
        });
    });
});

// 9. تشغيل الخادم
app.listen(port, () => {
    console.log(`🚀 BlackBox Server يعمل على http://localhost:${port}`);
});
