// Mo.dark – BlackBox Admin Panel (نسخة نهائية)
// هذا الملف هو دعم إضافي لوظائف لوحة التحكم،
// ولكن جميع الوظائف الأساسية موجودة بالفعل داخل admin.html
// سنضيف هنا بعض الميزات الإضافية مثل تصدير البيانات والإحصائيات المتقدمة

const ADMIN_PASSWORD = "BlackBox@2026#Secure";

// === دالة تصدير المعاملات إلى CSV ===
function exportTransactions() {
    fetch(`/api/admin/transactions?password=${ADMIN_PASSWORD}`)
        .then(res => res.json())
        .then(data => {
            if (!data || data.length === 0) {
                alert('لا توجد معاملات لتصديرها');
                return;
            }
            // إنشاء رأس CSV
            let csv = 'ID,المستخدم,النوع,المبلغ,الحالة,TxID,التاريخ\n';
            data.forEach(tx => {
                const type = tx.type === 'deposit' ? 'إيداع' : 'سحب';
                const status = tx.status === 'pending' ? 'معلق' : tx.status === 'completed' ? 'مكتمل' : 'مرفوض';
                csv += `${tx.id},${tx.email},${type},${tx.amount},${status},${tx.txid || ''},${new Date(tx.created_at).toLocaleString()}\n`;
            });

            // تحميل الملف
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
        })
        .catch(err => {
            alert('حدث خطأ في تصدير البيانات');
        });
}

// === دالة عرض إحصائيات متقدمة ===
function loadAdvancedStats() {
    fetch(`/api/admin/stats?password=${ADMIN_PASSWORD}`)
        .then(res => res.json())
        .then(data => {
            const statsDiv = document.getElementById('advancedStats');
            if (!statsDiv) return;
            statsDiv.innerHTML = `
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:15px;margin-top:15px;">
                    <div style="background:#1a1a2e;padding:15px;border-radius:10px;text-align:center;">
                        <div style="font-size:22px;color:#4caf50;">${(data.total_deposits || 0).toFixed(2)}$</div>
                        <div style="color:#888;font-size:13px;">إجمالي الإيداعات</div>
                    </div>
                    <div style="background:#1a1a2e;padding:15px;border-radius:10px;text-align:center;">
                        <div style="font-size:22px;color:#f44336;">${(data.total_withdraws || 0).toFixed(2)}$</div>
                        <div style="color:#888;font-size:13px;">إجمالي السحوبات</div>
                    </div>
                    <div style="background:#1a1a2e;padding:15px;border-radius:10px;text-align:center;">
                        <div style="font-size:22px;color:#ffeb3b;">${(data.total_profit || 0).toFixed(2)}$</div>
                        <div style="color:#888;font-size:13px;">أرباح المنصة</div>
                    </div>
                    <div style="background:#1a1a2e;padding:15px;border-radius:10px;text-align:center;">
                        <div style="font-size:22px;color:#00ccff;">${data.total_users || 0}</div>
                        <div style="color:#888;font-size:13px;">إجمالي المستخدمين</div>
                    </div>
                </div>
                <div style="margin-top:15px;padding:15px;background:#0d0d1a;border-radius:10px;border:1px solid #2a2a3a;">
                    <p style="color:#aaa;font-size:14px;">
                        💡 <strong>ملاحظة:</strong> أرباح المنصة = مجموع العمولات (20%) من أرباح اللاعبين.
                        يتم تحديث البيانات تلقائياً كل 30 ثانية.
                    </p>
                </div>
            `;
        })
        .catch(err => {
            console.error('خطأ في تحميل الإحصائيات المتقدمة:', err);
        });
}

// === إضافة زر التصدير إلى لوحة التحكم ===
// سيتم استدعاء هذه الدالة بعد تحميل الصفحة
function initAdminFeatures() {
    // إضافة زر التصدير في قسم المعاملات
    const container = document.getElementById('transactionsContainer');
    if (container) {
        const exportBtn = document.createElement('button');
        exportBtn.className = 'refresh-btn';
        exportBtn.style.marginLeft = '10px';
        exportBtn.textContent = '📥 تصدير CSV';
        exportBtn.onclick = exportTransactions;
        const refreshBtn = container.querySelector('.refresh-btn');
        if (refreshBtn) {
            refreshBtn.parentNode.insertBefore(exportBtn, refreshBtn.nextSibling);
        }
    }

    // إضافة قسم الإحصائيات المتقدمة
    const statsGrid = document.getElementById('statsGrid');
    if (statsGrid) {
        const advancedDiv = document.createElement('div');
        advancedDiv.id = 'advancedStats';
        advancedDiv.style.marginTop = '20px';
        statsGrid.parentNode.insertBefore(advancedDiv, statsGrid.nextSibling);
        loadAdvancedStats();
    }
}

// === تحديث تلقائي للإحصائيات المتقدمة ===
setInterval(() => {
    if (document.getElementById('adminPanel') && document.getElementById('adminPanel').style.display !== 'none') {
        loadAdvancedStats();
    }
}, 30000);

// تشغيل الميزات عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    // سنقوم بتشغيلها بعد تسجيل الدخول عبر admin.html
    // لكننا نضبطها هنا للاستخدام المباشر
    setTimeout(initAdminFeatures, 2000);
});

// ملاحظة: هذا الملف مكمل لـ admin.html،
// جميع الوظائف الأساسية موجودة في admin.html
// هذا الملف يضيف ميزات متقدمة فقط.
